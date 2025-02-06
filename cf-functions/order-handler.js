import { finalizeEvent } from "nostr-tools";
import { randomBytes } from "@noble/hashes/utils";
import { cbc } from "@noble/ciphers/aes";
import { base64 } from "@scure/base";

import { handleBtcTryRate, getBtcTryRate } from './btc-try-rate.js';
import { verifyTurnstileToken } from './turnstile-helper.js';
import { createLightningInvoice, calculateLightningAmount } from './lightning-helper.js';
import { sendOrderNotification } from './resend-helper.js';
import { getNwcClient } from './nwc-client.js';
import { getBalance } from './get-balance.js';

const ALLOWED_ORIGINS = [
  'https://enbasitbitcoinkitabi.site',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

async function encrypt(secretKey, pubkey, text) {
  const key = secp256k1.getSharedSecret(secretKey, "02" + pubkey);
  const normalizedKey = key.slice(1, 33);
  let iv = Uint8Array.from(randomBytes(16));

  var utf8Encoder = new TextEncoder();

  let plaintext = utf8Encoder.encode(text);
  let ciphertext = cbc(normalizedKey, iv).encrypt(plaintext);
  let ctb64 = base64.encode(new Uint8Array(ciphertext));
  let ivb64 = base64.encode(new Uint8Array(iv.buffer));
  
  return `${ctb64}?iv=${ivb64}`;
}

async function makeNwcRequestEvent(pubkey, secretKey, method, params) {
  const content = {
    method,
    params
  };
  
  const encryptedContent = await encrypt(secretKey, pubkey, JSON.stringify(content));
  
  const eventTemplate = {
    kind: 23194,
    created_at: Math.round(Date.now() / 1e3),
    content: encryptedContent,
    tags: [["p", pubkey]]
  };
  
  return finalizeEvent(eventTemplate, secretKey);
}

async function testWs(request, env) {
  const relay = env.NWC_RELAY;
  const pubkey = env.NWC_PUBKEY;
  const secretKey = env.NWC_SECRET_KEY;

  const websocket = new WebSocket(relay);

  return new Promise((resolve) => {
    websocket.addEventListener('open', async () => {
      const getBalanceEvent = await makeNwcRequestEvent(pubkey, secretKey, "get_info", {});

      websocket.addEventListener('message', (event) => {
        console.log(event.data);
  
        resolve(new Response(JSON.stringify({ message: 'Hello, World!', data: event.data }), {
          headers: {
            "Content-Type": "application/json",
          },
        }));
      });

      websocket.send(JSON.stringify(["EVENT", getBalanceEvent]));
    });
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/test-ws') {
      return testWs(request, env);
    }

    if (url.pathname === '/btc-try-rate') {
      return handleBtcTryRate();
    }

    if (url.pathname === '/balance') {
      try {
        const nwcClient = getNwcClient(env);
        
        const balance = await getBalance(nwcClient);
        
        return new Response(JSON.stringify({ balance }), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error('Error getting balance:', error);
        
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    }

    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": isAllowedOrigin ? origin : '',
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      
      console.log('Received order request:', {
        name: data.name,
        email: data.email,
        address: data.address,
        quantity: data.quantity,
        payment_method: data.payment_method
      });

      // Verify Turnstile
      await verifyTurnstileToken(data.cfTurnstileResponse, env);

      // Basic validation
      if (!data.name || !data.email || !data.address || !data.quantity || !data.payment_method) {
        throw new Error("Missing required fields");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error("Invalid email format");
      }

      // Validate quantity
      if (data.quantity < 1 || data.quantity > 100) {
        throw new Error("Invalid quantity");
      }

      // Generate order number
      const lastOrder = await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name = 'orders'"
      ).first();
      
      const nextId = (lastOrder.seq || 0) + 1;
      const orderNumber = `BTC${nextId.toString().padStart(6, '0')}`;

      // Calculate total amount
      const bookPrice = 200;
      const shippingPrice = 25;
      const lightningDiscount = data.payment_method === 'lightning' ? 25 : 0;
      const totalAmountTL = (bookPrice * data.quantity) + shippingPrice - lightningDiscount;
      
      let btcToTryRate, satsAmount, milliSatsAmount, invoice;

      if (data.payment_method === 'lightning') {
        btcToTryRate = await getBtcTryRate();
        const amounts = calculateLightningAmount(totalAmountTL, btcToTryRate);
        satsAmount = amounts.satsAmount;
        milliSatsAmount = amounts.milliSatsAmount;
        invoice = await createLightningInvoice(milliSatsAmount, orderNumber);
      }

      // Insert order into database
      const stmt = await env.DB.prepare(`
        INSERT INTO orders (order_number, name, email, address, quantity, payment_method, total_amount, btc_try_rate, sats_amount, invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        orderNumber,
        data.name,
        data.email,
        data.address,
        data.quantity,
        data.payment_method,
        totalAmountTL,
        btcToTryRate,
        satsAmount,
        invoice
      );

      await stmt.run();

      // Send notification
      await sendOrderNotification({
        ...data,
        totalAmountTL,
        milliSatsAmount,
        invoice
      }, orderNumber, env);

      const nwcClient = getNwcClient(env);
      
      const balance = await getBalance(nwcClient);

      return new Response(
        JSON.stringify({
          success: true,
          orderNumber,
          btcToTryRate,
          milliSatsAmount,
          invoice,
          balance
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": isAllowedOrigin ? origin : '',
          },
        }
      );
    } catch (error) {
      console.error('Error processing order:', {
        error: error.message,
        stack: error.stack
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Order processing failed"
        }),
        {
          status: error.message === "Unauthorized" ? 401 : 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": isAllowedOrigin ? origin : '',
          },
        }
      );
    }
  },
};
