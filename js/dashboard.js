// Dashboard Page Logic

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
    
    const user = getCurrentUser();
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            window.location.href = 'login.html';
            return;
        }
        
        const userData = userDoc.data();
        
        // Set greeting
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            greeting.textContent = `Welcome back, ${userData.username}!`;
        }
        
        // Load orders
        await loadUserOrders(user.uid);
        
        // Load profile
        loadUserProfile(user, userData);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        window.location.href = 'login.html';
    }
});

async function loadUserOrders(userId) {
    try {
        const ordersList = document.getElementById('ordersList');
        
        if (!ordersList) return;
        
        ordersList.innerHTML = '';
        
        // Try to get orders with orderBy, if it fails, get without orderBy
        let snapshot;
        try {
            snapshot = await db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        } catch (orderByError) {
            console.log('OrderBy not available, fetching without order:', orderByError.message);
            // Fallback: get orders without orderBy
            snapshot = await db.collection('orders').where('userId', '==', userId).get();
        }
        
        if (snapshot.empty) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--text2); padding: 2rem;">No orders yet</p>';
            return;
        }
        
        // Convert to array and sort by paymentDate if available
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by paymentDate descending (most recent first)
        orders.sort((a, b) => {
            const dateA = new Date(a.paymentDate || 0);
            const dateB = new Date(b.paymentDate || 0);
            return dateB - dateA;
        });
        
        // Display orders
        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            
            orderCard.innerHTML = `
                <div class="order-header">
                    <div class="order-id">Order #${order.id.substring(0, 8).toUpperCase()}</div>
                    <span class="order-status ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
                </div>
                <div class="order-details">
                    <p><strong>Date:</strong> ${order.paymentDate || 'N/A'}</p>
                    <p><strong>Amount:</strong> ${formatCurrency(order.totalAmount)}</p>
                    <p><strong>Items:</strong> ${order.productsOrdered ? order.productsOrdered.length : 0}</p>
                </div>
            `;
            
            orderCard.addEventListener('click', () => showOrderDetails(order));
            ordersList.appendChild(orderCard);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        const ordersList = document.getElementById('ordersList');
        if (ordersList) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--error); padding: 2rem;">Error loading orders. Please refresh the page.</p>';
        }
        showToast('Error loading orders: ' + error.message, 'error');
    }
}

function loadUserProfile(user, userData) {
    document.getElementById('profileUsername').textContent = userData.username;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileMemberSince').textContent = formatDate(userData.createdAt);
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.remove('hidden');
        tab.classList.add('active');
    }
    
    // Add active class to button
    event.target.classList.add('active');
}

function showOrderDetails(order) {
    try {
        const modal = document.getElementById('orderDetailsModal');
        const content = document.getElementById('orderDetailsContent');
        
        // Safe access to productsOrdered
        let productsHTML = '';
        if (order.productsOrdered && Array.isArray(order.productsOrdered)) {
            order.productsOrdered.forEach(product => {
                productsHTML += `
                    <div class="product-item">
                        <span>${product.name || 'Unknown'} x${product.quantity || 1}</span>
                        <span>${formatCurrency((product.price || 0) * (product.quantity || 1))}</span>
                    </div>
                `;
            });
        } else {
            productsHTML = '<p style="color: var(--text2);">No products in this order</p>';
        }
        
        // Safe access to all fields
        const deliveryCharge = typeof DELIVERY_CHARGE !== 'undefined' ? DELIVERY_CHARGE : 0;
        const subtotal = (order.totalAmount || 0) - deliveryCharge + (order.discountAmount || 0);
        
        content.innerHTML = `
            <div class="order-detail-section">
                <h3>Order Information</h3>
                <div class="order-detail-row">
                    <label>Order ID:</label>
                    <span>#${order.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div class="order-detail-row">
                    <label>Status:</label>
                    <span class="order-status ${(order.orderStatus || 'pending').toLowerCase()}">${order.orderStatus || 'Pending'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Order Date:</label>
                    <span>${order.paymentDate || 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Order Time:</label>
                    <span>${order.paymentTime || 'N/A'}</span>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Delivery Information</h3>
                <div class="order-detail-row">
                    <label>Full Name:</label>
                    <span>${order.userFullName || 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Phone:</label>
                    <span>${order.phoneNumber || 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>City:</label>
                    <span>${order.city || 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Address:</label>
                    <span>${order.address || 'N/A'}</span>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Products</h3>
                <div class="order-detail-products">
                    ${productsHTML}
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Payment Information</h3>
                <div class="order-detail-row">
                    <label>Payment Method:</label>
                    <span>${order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Transaction ID:</label>
                    <span>${order.transactionId || 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <label>Subtotal:</label>
                    <span>${formatCurrency(subtotal)}</span>
                </div>
                <div class="order-detail-row">
                    <label>Delivery Charge:</label>
                    <span>${formatCurrency(deliveryCharge)}</span>
                </div>
                ${order.discountAmount ? `
                    <div class="order-detail-row">
                        <label>Discount (${order.couponApplied || 'Applied'}):</label>
                        <span>-${formatCurrency(order.discountAmount)}</span>
                    </div>
                ` : ''}
                <div class="order-detail-row" style="border-top: 2px solid var(--border); margin-top: 1rem; padding-top: 1rem;">
                    <label><strong>Total Amount:</strong></label>
                    <span><strong>${formatCurrency(order.totalAmount || 0)}</strong></span>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing order details:', error);
        showToast('Error loading order details', 'error');
    }
}

function closeOrderModal() {
    document.getElementById('orderDetailsModal').classList.add('hidden');
}

// Close modal on background click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('orderDetailsModal');
    if (modal && e.target === modal) {
        closeOrderModal();
    }
});
