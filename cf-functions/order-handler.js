import { handleBtcTryRate, getBtcTryRate } from './btc-try-rate';
import { verifyTurnstileToken } from './turnstile-helper';
import { createLightningInvoice, calculateLightningAmount } from './lightning-helper';
import { sendOrderNotification } from './resend-helper';

const ALLOWED_ORIGINS = [
  'https://enbasitbitcoinkitabi.site',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/btc-try-rate') {
      return handleBtcTryRate();
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

      return new Response(
        JSON.stringify({
          success: true,
          orderNumber,
          btcToTryRate,
          milliSatsAmount,
          invoice
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
