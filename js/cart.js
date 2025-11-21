// Cart Page Logic
let cart = [];
let appliedCoupon = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartCount();
});

function loadCart() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    displayCartItems();
    updateSummary();
}

function displayCartItems() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text2); padding: 2rem;">Your cart is empty</p>';
        return;
    }
    
    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>${formatCurrency(item.price)} each</p>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity(${index}, -1)">−</button>
                    <input type="number" value="${item.quantity}" readonly>
                    <button onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <div class="cart-remove" onclick="removeFromCart(${index})">Remove</div>
            </div>
        `;
        container.appendChild(cartItem);
    });
}

function updateQuantity(index, change) {
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity < 1) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    showToast('Item removed from cart', 'success');
}

function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCharge = DELIVERY_CHARGE;
    let discount = 0;
    
    if (appliedCoupon) {
        discount = Math.floor(subtotal * (appliedCoupon.discount / 100));
    }
    
    const total = subtotal + deliveryCharge - discount;
    
    const subtotalEl = document.getElementById('subtotal');
    const deliveryEl = document.getElementById('deliveryCharge');
    const discountEl = document.getElementById('discountAmount');
    const totalEl = document.getElementById('totalAmount');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (deliveryEl) deliveryEl.textContent = formatCurrency(deliveryCharge);
    if (discountEl) discountEl.textContent = formatCurrency(discount);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

async function applyCoupon() {
    const couponCode = document.getElementById('couponCode')?.value.trim().toUpperCase();
    
    if (!couponCode) {
        showToast('Please enter a coupon code', 'error');
        return;
    }
    
    try {
        const user = getCurrentUser();
        if (!user) {
            showToast('Please login to use coupons', 'error');
            return;
        }
        
        const snapshot = await db.collection('coupons').where('code', '==', couponCode).get();
        
        if (snapshot.empty) {
            showToast('Invalid coupon code', 'error');
            appliedCoupon = null;
            return;
        }
        
        const coupon = snapshot.docs[0].data();
        
        if (!coupon.active) {
            showToast('This coupon is not active', 'error');
            return;
        }
        
        if (coupon.expiryDate && new Date(coupon.expiryDate.toDate()) < new Date()) {
            showToast('This coupon has expired', 'error');
            return;
        }
        
        // Check if user has already used this coupon
        const userCouponUsage = await db.collection('couponUsage')
            .where('userId', '==', user.uid)
            .where('couponCode', '==', couponCode)
            .get();
        
        if (!userCouponUsage.empty) {
            showToast('You have already used this coupon code', 'error');
            return;
        }
        
        appliedCoupon = coupon;
        updateSummary();
        showToast(`Coupon applied! ${coupon.discount}% discount`, 'success');
    } catch (error) {
        console.error('Error applying coupon:', error);
        showToast('Error applying coupon', 'error');
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    if (!isAuthenticated()) {
        showToast('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }
    
    // Save cart and coupon to sessionStorage for checkout page
    sessionStorage.setItem('checkoutCart', JSON.stringify(cart));
    if (appliedCoupon) {
        sessionStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
    }
    
    window.location.href = 'checkout.html';
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = count;
    }
}
