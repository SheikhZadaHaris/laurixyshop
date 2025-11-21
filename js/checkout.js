// Checkout Page Logic
let checkoutCart = [];
let appliedCoupon = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to initialize
    await new Promise(resolve => {
        const checkAuth = setInterval(() => {
            if (getCurrentUser() !== null) {
                clearInterval(checkAuth);
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkAuth);
            resolve();
        }, 5000);
    });
    
    // Check if authenticated
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadCheckoutData();
    updatePaymentDetails();
    setupCheckoutForm();
});

function loadCheckoutData() {
    checkoutCart = JSON.parse(sessionStorage.getItem('checkoutCart')) || [];
    appliedCoupon = JSON.parse(sessionStorage.getItem('appliedCoupon')) || null;
    
    if (checkoutCart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    
    displayOrderItems();
    updateOrderSummary();
}

function displayOrderItems() {
    const container = document.getElementById('orderItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    checkoutCart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
        `;
        container.appendChild(itemDiv);
    });
}

function updateOrderSummary() {
    const subtotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = DELIVERY_CHARGE;
    let discount = 0;
    
    if (appliedCoupon) {
        discount = Math.floor(subtotal * (appliedCoupon.discount / 100));
    }
    
    const total = subtotal + deliveryCharge - discount;
    
    document.getElementById('summarySubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summaryDelivery').textContent = formatCurrency(deliveryCharge);
    document.getElementById('summaryDiscount').textContent = formatCurrency(discount);
    document.getElementById('summaryTotal').textContent = formatCurrency(total);
}

function updatePaymentDetails() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'bank';
    const detailsBox = document.getElementById('paymentDetailsBox');
    
    if (!detailsBox) return;
    
    let details = '';
    
    switch(method) {
        case 'bank':
            details = `
                <p><strong>Bank Transfer</strong></p>
                <p>IBAN: ${paymentMethods.bank.iban}</p>
                <p>Account: ${paymentMethods.bank.account}</p>
            `;
            break;
        case 'jazzcash':
            details = `
                <p><strong>JazzCash</strong></p>
                <p>Phone: ${paymentMethods.jazzcash.number}</p>
            `;
            break;
        case 'easypaisa':
            details = `
                <p><strong>Easypaisa</strong></p>
                <p>Phone: ${paymentMethods.easypaisa.number}</p>
            `;
            break;
        case 'raast':
            details = `
                <p><strong>Raast</strong></p>
                <p>Account: ${paymentMethods.raast.account}</p>
            `;
            break;
    }
    
    detailsBox.innerHTML = details;
}

function setupCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', handleCheckoutSubmit);
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user) {
        showToast('Please login to continue', 'error');
        return;
    }
    
    const fullName = document.getElementById('fullName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const city = document.getElementById('city').value.trim();
    const address = document.getElementById('address').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const transactionId = document.getElementById('transactionId').value.trim();
    
    if (!fullName || !phoneNumber || !city || !address || !transactionId) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const subtotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discount = 0;
        
        if (appliedCoupon) {
            discount = Math.floor(subtotal * (appliedCoupon.discount / 100));
        }
        
        const totalAmount = subtotal + DELIVERY_CHARGE - discount;
        
        // Get user data
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Create order
        const orderData = {
            userFullName: fullName,
            username: userData.username,
            gmail: user.email,
            phoneNumber: phoneNumber,
            city: city,
            address: address,
            productsOrdered: checkoutCart,
            totalAmount: totalAmount,
            couponApplied: appliedCoupon ? appliedCoupon.code : null,
            discountAmount: discount,
            transactionId: transactionId,
            paymentDate: new Date().toLocaleDateString('en-PK'),
            paymentTime: new Date().toLocaleTimeString('en-PK'),
            paymentMethod: paymentMethod,
            orderStatus: 'Pending',
            createdAt: new Date(),
            userId: user.uid
        };
        
        // Save order to Firestore
        const orderRef = await db.collection('orders').add(orderData);
        
        // Save to Realtime Database for live tracking
        await rtdb.ref('orders/' + orderRef.id).set({
            ...orderData,
            createdAt: new Date().toISOString()
        });
        
        // Record coupon usage if coupon was applied
        if (appliedCoupon) {
            await db.collection('couponUsage').add({
                userId: user.uid,
                couponCode: appliedCoupon.code,
                orderId: orderRef.id,
                usedAt: new Date(),
                discountAmount: discount
            });
        }
        
        // Clear cart
        localStorage.removeItem('cart');
        sessionStorage.removeItem('checkoutCart');
        sessionStorage.removeItem('appliedCoupon');
        
        showToast('Order placed successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Error placing order: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
