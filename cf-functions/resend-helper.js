export async function sendOrderNotification(orderData, orderNumber, env) {
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
        html: generateEmailTemplate(orderData, orderNumber)
      })
    });

    const result = await response.json();
    
    console.log('Resend API Response:', result);

    if (!result.id) {
      throw new Error(`Email sending failed: ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending order notification:', error);
    
    throw error;
  }
}

function generateEmailTemplate(orderData, orderNumber) {
  return `
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
    <p>Lightning Ağı Ödemesi <b>(Zaten ödediyseniz tekrar ödemenize gerek yoktur!)</b></p>
    <p>${Math.round(orderData.milliSatsAmount / 1000)} sats</p>
    <p>Lightning cüzdanı ile okutun:</p>
    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${orderData.invoice}&amp;size=200x200" alt="" title="" />
    `}
    <p>Ya da cüzdana kopyalayın</p>
    <p>${orderData.invoice}</p>
  `;
}
