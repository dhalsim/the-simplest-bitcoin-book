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
        to: ['your-email@example.com', orderData.email], // Add your email to get notifications
        subject: `Sipariş Alındı - #${orderNumber}`,
        html: `
          <h2>Yeni Sipariş #${orderNumber}</h2>
          <p><strong>Ad Soyad:</strong> ${orderData.name}</p>
          <p><strong>E-posta:</strong> ${orderData.email}</p>
          <p><strong>Adres:</strong> ${orderData.address}</p>
          <p><strong>Miktar:</strong> ${orderData.quantity}</p>
          <p><strong>Ödeme Yöntemi:</strong> ${orderData.payment_method === 'lightning' ? 'Bitcoin Lightning' : 'Banka Havalesi'}</p>
          <p><strong>Toplam Tutar:</strong> ${orderData.total_amount} TL</p>
          ${orderData.payment_method === 'iban' ? `
          <p><strong>Ödeme Bilgileri:</strong></p>
          <p>IBAN: XXXX-XXXX-XX-XXXX</p>
          <p>Açıklama: ${orderNumber}</p>
          ` : ''}
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

export default {
  async fetch(request, env) {
    // Handle CORS with allowed origins
    const ALLOWED_ORIGINS = [
      'https://enbasitbitcoinkitabi.site',
      'http://localhost:8000',  // for development
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
        "SELECT id FROM orders ORDER BY id DESC LIMIT 1"
      ).first();
      
      const nextId = (lastOrder?.id || 0) + 1;
      const orderNumber = `BTC${nextId.toString().padStart(6, '0')}`;

      // Calculate total amount
      const bookPrice = 200;
      const shippingPrice = 25;
      const lightningDiscount = data.payment_method === 'lightning' ? 25 : 0;
      const totalAmount = (bookPrice * data.quantity) + shippingPrice - lightningDiscount;

      // Insert the order into the database
      const stmt = await env.DB.prepare(`
        INSERT INTO orders (order_number, name, email, address, quantity, payment_method, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        orderNumber,
        data.name,
        data.email,
        data.address,
        data.quantity,
        data.payment_method,
        totalAmount
      );

      await stmt.run();

      // After database insert
      console.log('Order created successfully:', {
        orderNumber,
        totalAmount,
        payment_method: data.payment_method
      });

      // After successfully creating the order
      await sendOrderNotification({
        ...data,
        total_amount: totalAmount
      }, orderNumber);

      // After email sending
      console.log('Order notification email sent');

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          orderNumber,
          totalAmount
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
