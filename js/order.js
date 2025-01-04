const quantityInput = document.getElementById('quantity');
const totalPriceDiv = document.getElementById('totalPrice');
const paymentSelect = document.getElementById('payment');
const ibanInfo = document.getElementById('ibanInfo');
const lightningInfo = document.getElementById('lightningInfo');
const orderForm = document.getElementById('orderForm');

const BOOK_PRICE = 200;
const SHIPPING_PRICE = 25;
const LIGHTNING_DISCOUNT = 25;

function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BTC${timestamp}${random}`;
}

function updatePrice() {
    const quantity = parseInt(quantityInput.value);
    const totalBookPrice = BOOK_PRICE * quantity;
    const isLightning = paymentSelect.value === 'lightning';
    const discount = isLightning ? LIGHTNING_DISCOUNT : 0;
    const total = totalBookPrice + SHIPPING_PRICE - discount;

    let priceText = `Toplam: ${total} TL (Kitap: ${totalBookPrice} TL + Kargo: ${SHIPPING_PRICE} TL`;
    if (isLightning) {
        priceText += ` - İndirim: ${LIGHTNING_DISCOUNT} TL`;
    }
    priceText += ')';
    
    totalPriceDiv.textContent = priceText;
}

function updatePaymentInfo() {
    if (paymentSelect.value === 'lightning') {
        lightningInfo.style.display = 'block';
        ibanInfo.style.display = 'none';
    } else {
        lightningInfo.style.display = 'none';
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
        const result = await submitOrder(formData);

        if (formData.get('payment') === 'iban') {
            // Show IBAN info with the order number from the server
            document.getElementById('orderNumber').textContent = result.orderNumber;
            ibanInfo.style.display = 'block';
            
            // Disable form inputs
            const inputs = orderForm.querySelectorAll('input, textarea, select, button');
            inputs.forEach(input => input.disabled = true);
            
            // Change button text
            orderForm.querySelector('button').textContent = 'Sipariş Alındı';
        } else {
            // Handle Lightning payment
            alert('Bitcoin Lightning ödemesi için yönlendiriliyorsunuz...');
            // Here you would integrate with your Lightning payment provider
        }
    } catch (error) {
        alert('Sipariş işlemi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
        turnstile.reset();
    }
}); 