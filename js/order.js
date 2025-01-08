const quantityInput = document.getElementById('quantity');
const totalPriceDiv = document.getElementById('totalPrice');
const totalPriceIBANDiv = document.getElementById('totalPriceIBAN');
const btcToTryRateDiv = document.getElementById('btcToTryRate');
const satsAmountDiv = document.getElementById('satsAmount');
const paymentSelect = document.getElementById('payment');
const ibanInfo = document.getElementById('ibanInfo');
const lightningInfo = document.getElementById('lightningInfo');
const lightningDiscountInfo = document.getElementById('lightningDiscountInfo');
const orderForm = document.getElementById('orderForm');
const orderNumberDiv = document.getElementById('orderNumber');
const orderNumberLightningDiv = document.getElementById('orderNumberLightning');
const lightningInvoiceInput = document.getElementById('lightningInvoice');
const copyInvoiceButton = document.getElementById('copyInvoiceButton');

const BOOK_PRICE = 200;
const SHIPPING_PRICE = 25;
const LIGHTNING_DISCOUNT = 25;

function copyInvoice(button) {
  const invoiceText = document.getElementById('lightningInvoice').textContent;
  
  navigator.clipboard.writeText(invoiceText);

  button.textContent = "Kopyalandı ✅";

  setTimeout(() => {
    button.textContent = "Kopyala 📋";
  }, 2000);
}

async function updatePrice() {
  const quantity = parseInt(quantityInput.value);
  const totalBookPrice = BOOK_PRICE * quantity;
  const isLightning = paymentSelect.value === 'lightning';
  const discount = isLightning ? LIGHTNING_DISCOUNT : 0;
  const total = totalBookPrice + SHIPPING_PRICE - discount;

  let priceText = `Toplam: ${total} TL (Kitap: ${totalBookPrice} TL + Kargo: ${SHIPPING_PRICE} TL`;
  
  if (isLightning) {
    priceText += ` - İndirim: ${LIGHTNING_DISCOUNT} TL`;

    try {
      const currencyRateApiResponse = await fetch("https://order-handler.nostrize.workers.dev/btc-try-rate");
      const rate = await currencyRateApiResponse.text();

      const btcToTryRate = parseInt(rate);
      const hundredMillion = 100 * 1000 * 1000;
      const satsAmount = Math.round(total / btcToTryRate * hundredMillion);

      btcToTryRateDiv.textContent = `1 Bitcoin ${rate} TL, `;
      satsAmountDiv.textContent = `${satsAmount} sathoshi = ${satsAmount / hundredMillion} BTC`;
    } catch (error) {
      console.error('Error fetching BTC price:', error);
      
      alert("Lightning ödemesi için gerekli TL Bitcoin borsa bilgisi çekilemedi. enbasitbitcoinkitabi@proton.me adresine e-posta atarak siparişinizi verebilirsiniz.");
      
      return;
    }
  }
  
  priceText += ')';
  
  totalPriceDiv.textContent = priceText;
  totalPriceIBANDiv.textContent = priceText;
}

function updatePaymentInfo() {
  if (paymentSelect.value === 'lightning') {
    lightningDiscountInfo.style.display = 'block';
  } else {
    lightningDiscountInfo.style.display = 'none';
  }
  
  updatePrice();
}

async function submitOrder(formData) {
  const orderData = {
    name: formData.get('name'),
    email: formData.get('email'),
    address: formData.get('address'),
    quantity: parseInt(formData.get('quantity')),
    payment_method: formData.get('payment'),
    cfTurnstileResponse: formData.get('cfTurnstileResponse')
  };

  try {
    console.log('Submitting order:', orderData);
    const response = await fetch('https://order-handler.nostrize.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    console.log('Order submission result:', result);
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || 'Order failed');
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    
    throw error;
  }
}

// Event Listeners
quantityInput.addEventListener('input', updatePrice);
paymentSelect.addEventListener('change', updatePaymentInfo);

// Initialize price and payment info
updatePaymentInfo();

orderForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const token = turnstile.getResponse();
  
  if (!token) {
      alert('Lütfen doğrulamayı tamamlayın.');
      
      return;
  }

  try {
    const formData = new FormData(this);
    formData.append('cfTurnstileResponse', token);
    
    const orderHandlerResult = await submitOrder(formData);

    console.log("worker result", orderHandlerResult);

    if (formData.get('payment') === 'iban') {
      // Show IBAN info with the order number from the server
      orderNumberDiv.textContent = orderHandlerResult.orderNumber;
      
      ibanInfo.style.display = 'block';
      
      // Disable form inputs
      const inputs = orderForm.querySelectorAll('input, textarea, select, button');
      
      inputs.forEach(input => input.disabled = true);
      
      // Change button text and color
      orderForm.querySelector('button').textContent = '✅ Sipariş Alındı';
      orderForm.querySelector('button').style.backgroundColor = "green";
    } else {
      btcToTryRateDiv.textContent = `1 Bitcoin ${orderHandlerResult.btcToTryRate} TL, `;
      satsAmountDiv.textContent = parseInt(orderHandlerResult.milliSatsAmount / 1000).toLocaleString();

      lightningInfo.style.display = "block";

      orderNumberLightningDiv.textContent = orderHandlerResult.orderNumber;

      const lnurl = "https://blink.sv/.well-known/lnurlp/dhalsim";
      const res = await fetch(lnurl);
      const body = await res.json();

      console.log(body);

      const url = `${body.callback}?amount=${orderHandlerResult.milliSatsAmount}&comment=${orderHandlerResult.orderNumber}`;
    
      const res2 = await fetch(url);
      const { pr: invoice } = await res2.json();

      copyInvoiceButton.style.display = "block";

      lightningInvoiceInput.textContent = invoice;

      // Clear any existing QR code
      document.getElementById('qrcode').innerHTML = '';

      new QRCode(document.getElementById("qrcode"), {
        text: invoice,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
      });

      console.log(invoice);
    }
  } catch (error) {
    alert('Sipariş işlemi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    
    turnstile.reset();
  }
}); 