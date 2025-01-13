// Cloudflare Worker script

async function sendOrderNotification(orderData, orderNumber) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'En Basit Bitcoin Kitabı <orders@enbasitbitcoinkitabi.site>',
        reply_to: 'enbasitbitcoinkitabi@proton.me',
        to: orderData.email,
        bcc: 'enbasitbitcoinkitabi@proton.me',
        subject: `Sipariş Alındı - #${orderNumber}`,
        html: `
          <h1>"En Basit Bitcoin Kitabi" siparişiniz alındı.</h1>
          
          <h2>Yeni Sipariş #${orderNumber}</h2>
          <p><strong>Ad Soyad:</strong> ${orderData.name}</p>
          <p><strong>E-posta:</strong> ${orderData.email}</p>
          <p><strong>Adres:</strong> ${orderData.address}</p>
          <p><strong>Kitap Adedi:</strong> ${orderData.quantity}</p>
          
          <p><strong>Ödeme Yöntemi:</strong> ${orderData.payment_method === 'lightning' ? 'Bitcoin Lightning' : 'Banka Havalesi'}</p>
          <p><strong>Toplam Tutar:</strong> ${orderData.totalAmountTL} TL</p>
          
          ${orderData.payment_method === 'iban' ? `
          <p><strong>Ödeme Bilgileri:</strong></p>
          <p>IBAN: TR06 0009 9011 8917 2800 1000 04</p>
          <p>Açıklama: ${orderNumber}</p>
          ` : `
          <p>Lightning Ağı Ödemesi (Zaten ödediyseniz yok sayın)</p>
          <p>${orderData.milliSatsAmount} sats</p>
          <p>Lightning cüzdanı ile okutun:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${orderData.invoice}&amp;size=200x200" alt="" title="" />
          `}
        `
      })
    });

    const result = await response.json();
    
    if (!result.id) {
      throw new Error('Email sending failed');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw the error - we don't want to fail the order if email fails
  }
}

async function getBtcTryRate() {
  const response = await fetch('https://api.btcturk.com/api/v2/ticker?pairSymbol=BTCTRY');
  
  const body = await response.json();
  
  return body.data[0].last;
}

async function handleTestEmail(env) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'En Basit Bitcoin Kitabı <orders@enbasitbitcoinkitabi.site>',
        to: 'enbasitbitcoinkitabi@proton.me',
        subject: 'Test Email',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify Resend API integration.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `
      })
    });

    const result = await response.json();
    console.log('Resend API Response:', result);

    if (!result.id) {
      throw new Error(`Email sending failed: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

async function createLightningInvoice(milliSatsAmount, orderNumber) {
  const lnurl = "https://blink.sv/.well-known/lnurlp/dhalsim";
  const res = await fetch(lnurl);
  const body = await res.json();

  const url = `${body.callback}?amount=${milliSatsAmount}&comment=${orderNumber}`;
  const res2 = await fetch(url);
  const { pr: invoice } = await res2.json();

  return invoice;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/test-email') {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleTestEmail(env);
    }

    if (url.pathname === '/btc-try-rate') {
      try {
        const rate = await getBtcTryRate();
        
        return new Response(rate, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Handle CORS with allowed origins
    const ALLOWED_ORIGINS = [
      'https://enbasitbitcoinkitabi.site',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
    ];

    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    // Handle CORS preflight
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
      
      // Verify Turnstile token
      const token = data.cfTurnstileResponse;
      
      if (!token) {
        console.error('Missing Turnstile token');
        throw new Error("Verification required");
      }

      // Verify with Cloudflare
      const formData = new URLSearchParams();
      
      formData.append('secret', env.TURNSTILE_SECRET);
      formData.append('response', token);
      
      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const outcome = await result.json();
      
      console.log('Turnstile verification result:', outcome);
      
      if (!outcome.success) {
        console.error('Turnstile verification failed:', outcome);
        
        throw new Error("Verification failed");
      }

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

      // Generate order number (BTC + padded ID)
      const lastOrder = await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name = 'orders'"
      ).first();
      
      const nextId = (lastOrder?.id || 0) + 1;
      const orderNumber = `BTC${nextId.toString().padStart(6, '0')}`;

      // Calculate total amount
      const bookPrice = 200;
      const shippingPrice = 25;
      const lightningDiscount = data.payment_method === 'lightning' ? 25 : 0;
      const totalAmountTL = (bookPrice * data.quantity) + shippingPrice - lightningDiscount;
      
      let btcToTryRate;
      let satsAmount;
      let milliSatsAmount;
      let invoice;

      if (data.payment_method === 'lightning') {
        btcToTryRate = await getBtcTryRate();

        const hundredMillion = 100 * 1000 * 1000;

        satsAmount = Math.round(totalAmountTL / btcToTryRate * hundredMillion);
        milliSatsAmount = satsAmount * 1000;
        invoice = await createLightningInvoice(milliSatsAmount, orderNumber);
      }

      // Insert the order into the database
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

      // After successfully creating the order
      await sendOrderNotification({
        ...data,
        totalAmountTL,
        milliSatsAmount,
        invoice
      }, orderNumber);

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
