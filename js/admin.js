// Admin Panel Logic

// Toggle admin sidebar on mobile
function toggleAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const hamburger = document.getElementById('adminHamburger');
    
    if (sidebar && hamburger) {
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check admin session
    if (!localStorage.getItem('adminSession')) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadDashboardStats();
    await loadOrders();
    await loadUsers();
    await loadProducts();
    await loadCoupons();
    await loadPaymentMethods();
    
    // Setup mobile sidebar
    setupAdminMobileSidebar();
    setupHamburgerMenuListeners();
});

// Setup mobile sidebar toggle
function setupAdminMobileSidebar() {
    const hamburger = document.getElementById('adminHamburger');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (!hamburger || !sidebar) return;
    
    // Handle window resize to close menu on desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 767) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
}

// Setup hamburger menu event listeners
function setupHamburgerMenuListeners() {
    const hamburger = document.getElementById('adminHamburger');
    const sidebar = document.querySelector('.admin-sidebar');
    const menuItems = document.querySelectorAll('.menu-item');
    
    if (!hamburger || !sidebar) return;
    
    // Close menu when a menu item is clicked
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 767) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !sidebar.contains(e.target)) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
        }
    });
}

// Admin Logout
function adminLogout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'index.html';
}

// Switch Admin Tab
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }
    
    event.target.classList.add('active');
}

// DASHBOARD
async function loadDashboardStats() {
    try {
        const ordersSnapshot = await db.collection('orders').get();
        const usersSnapshot = await db.collection('users').get();
        const productsSnapshot = await db.collection('products').get();
        
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            if (doc.data().orderStatus === 'Delivered') {
                totalRevenue += doc.data().totalAmount;
            }
        });
        
        document.getElementById('totalOrders').textContent = ordersSnapshot.size;
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('totalProducts').textContent = productsSnapshot.size;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Reset all orders - Delete all orders from database
async function resetAllOrders() {
    if (!confirm('⚠️ WARNING: This will PERMANENTLY DELETE ALL ORDERS from the database!\n\nThis action cannot be undone. Are you sure?')) {
        return;
    }
    
    try {
        showLoading(true);
        const ordersSnapshot = await db.collection('orders').get();
        
        // Delete all orders from database
        const batch = db.batch();
        ordersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Reset stats to 0
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('totalRevenue').textContent = formatCurrency(0);
        
        // Reload orders table
        await loadOrders();
        
        showToast('✅ All orders have been permanently deleted!', 'success');
        showLoading(false);
    } catch (error) {
        console.error('Error deleting orders:', error);
        showToast('❌ Error deleting orders: ' + error.message, 'error');
        showLoading(false);
    }
}

// ORDERS MANAGEMENT
async function loadOrders() {
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        const table = document.getElementById('ordersList');
        
        if (!table) return;
        
        let html = '<table class="admin-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            html += `
                <tr>
                    <td>#${order.id.substring(0, 8).toUpperCase()}</td>
                    <td>${order.userFullName}</td>
                    <td>${formatCurrency(order.totalAmount)}</td>
                    <td><span class="order-status ${order.orderStatus.toLowerCase()}">${order.orderStatus}</span></td>
                    <td>${order.paymentDate}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="viewOrderDetails('${order.id}')">View</button>
                        ${order.orderStatus === 'Pending' ? `
                            <button class="btn-approve" onclick="approveOrder('${order.id}')">Approve</button>
                            <button class="btn-delete" onclick="rejectOrder('${order.id}')">Reject</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function viewOrderDetails(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        const order = { id: doc.id, ...doc.data() };
        
        const modal = document.getElementById('orderDetailsModal');
        const content = document.getElementById('orderDetailsContent');
        
        let productsHTML = '';
        order.productsOrdered.forEach(product => {
            productsHTML += `
                <div class="product-item">
                    <span>${product.name} x${product.quantity}</span>
                    <span>${formatCurrency(product.price * product.quantity)}</span>
                </div>
            `;
        });
        
        content.innerHTML = `
            <div class="order-detail-section">
                <h3>Order #${orderId.substring(0, 8).toUpperCase()}</h3>
                <div class="order-detail-row">
                    <label>Status:</label>
                    <div class="status-update">
                        <select id="statusSelect">
                            <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Approved" ${order.orderStatus === 'Approved' ? 'selected' : ''}>Approved</option>
                            <option value="Rejected" ${order.orderStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                            <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                        <button onclick="updateOrderStatus('${orderId}')">Update</button>
                    </div>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Customer Information</h3>
                <div class="order-detail-row">
                    <label>Name:</label>
                    <span>${order.userFullName}</span>
                </div>
                <div class="order-detail-row">
                    <label>Username:</label>
                    <span>${order.username}</span>
                </div>
                <div class="order-detail-row">
                    <label>Email:</label>
                    <span>${order.gmail}</span>
                </div>
                <div class="order-detail-row">
                    <label>Phone:</label>
                    <span>${order.phoneNumber}</span>
                </div>
                <div class="order-detail-row">
                    <label>Address:</label>
                    <span>${order.address}, ${order.city}</span>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Products</h3>
                <div class="order-detail-products">
                    ${productsHTML}
                </div>
            </div>
            
            <div class="order-detail-section">
                <h3>Payment Details</h3>
                <div class="order-detail-row">
                    <label>Method:</label>
                    <span>${order.paymentMethod}</span>
                </div>
                <div class="order-detail-row">
                    <label>Transaction ID:</label>
                    <span>${order.transactionId}</span>
                </div>
                <div class="order-detail-row">
                    <label>Amount:</label>
                    <span>${formatCurrency(order.totalAmount)}</span>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast('Error loading order details', 'error');
    }
}

async function updateOrderStatus(orderId) {
    const status = document.getElementById('statusSelect').value;
    
    try {
        showLoading(true);
        
        // Update Firestore
        await db.collection('orders').doc(orderId).update({ 
            orderStatus: status,
            updatedAt: new Date()
        });
        
        // Update Realtime Database
        await rtdb.ref('orders/' + orderId).update({ 
            orderStatus: status,
            updatedAt: new Date().toISOString()
        });
        
        showToast('Order status updated successfully', 'success');
        
        // Close modal
        const modal = document.getElementById('orderDetailsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Reload orders
        await loadOrders();
    } catch (error) {
        console.error('Error updating order:', error);
        showToast('Error updating order: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function approveOrder(orderId) {
    try {
        showLoading(true);
        
        // Update Firestore
        await db.collection('orders').doc(orderId).update({ 
            orderStatus: 'Approved',
            updatedAt: new Date()
        });
        
        // Update Realtime Database
        await rtdb.ref('orders/' + orderId).update({ 
            orderStatus: 'Approved',
            updatedAt: new Date().toISOString()
        });
        
        showToast('Order approved successfully', 'success');
        await loadOrders();
    } catch (error) {
        console.error('Error approving order:', error);
        showToast('Error approving order: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function rejectOrder(orderId) {
    await db.collection('orders').doc(orderId).update({ orderStatus: 'Rejected' });
    await rtdb.ref('orders/' + orderId).update({ orderStatus: 'Rejected' });
    showToast('Order rejected', 'success');
    await loadOrders();
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.add('hidden');
}

// USERS MANAGEMENT
async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        const table = document.getElementById('usersList');
        
        if (!table) return;
        
        let html = '<table class="admin-table"><thead><tr><th>Username</th><th>Email</th><th>Password</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            html += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${user.password || 'N/A'}</code></td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td class="action-buttons">
                        <button class="btn-delete" onclick="deleteUser('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await db.collection('users').doc(userId).delete();
            showToast('User deleted', 'success');
            await loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Error deleting user', 'error');
        }
    }
}

async function deleteAllUsers() {
    if (confirm('⚠️ WARNING: This will delete ALL users! Are you absolutely sure?')) {
        if (confirm('This action cannot be undone. Delete all users?')) {
            try {
                showLoading(true);
                const snapshot = await db.collection('users').get();
                
                let deleted = 0;
                for (const doc of snapshot.docs) {
                    await db.collection('users').doc(doc.id).delete();
                    deleted++;
                }
                
                showToast(`All ${deleted} users deleted successfully`, 'success');
                await loadUsers();
            } catch (error) {
                console.error('Error deleting all users:', error);
                showToast('Error deleting users', 'error');
            } finally {
                showLoading(false);
            }
        }
    }
}

// PRODUCTS MANAGEMENT
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        const table = document.getElementById('productsList');
        
        if (!table) return;
        
        let html = '<table class="admin-table"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            html += `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${product.stock}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="editProduct('${product.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function openAddProductModal() {
    document.getElementById('addProductModal').classList.remove('hidden');
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.add('hidden');
    document.getElementById('addProductForm').reset();
    document.getElementById('addProductForm').dataset.productId = '';
    
    // Reset button text and modal title
    const submitBtn = document.querySelector('#addProductForm button[type="submit"]');
    submitBtn.textContent = 'Add Product';
    document.querySelector('#addProductModal h2').textContent = 'Add Product';
}

const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const imagesText = document.getElementById('productImages').value;
        const images = imagesText.split(',').map(img => img.trim()).filter(img => img);
        
        const productId = addProductForm.dataset.productId;
        
        try {
            showLoading(true);
            
            if (productId) {
                // Update existing product
                await db.collection('products').doc(productId).update({
                    name, description, category, price, stock, images,
                    updatedAt: new Date()
                });
                showToast('Product updated successfully', 'success');
            } else {
                // Add new product
                await db.collection('products').add({
                    name, description, category, price, stock, images,
                    createdAt: new Date()
                });
                showToast('Product added successfully', 'success');
            }
            
            closeAddProductModal();
            await loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Error saving product', 'error');
        } finally {
            showLoading(false);
        }
    });
}

async function editProduct(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        const product = doc.data();
        
        // Populate form with product data
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productImages').value = product.images.join(', ');
        
        // Store product ID for update
        document.getElementById('addProductForm').dataset.productId = productId;
        
        // Change button text
        const submitBtn = document.querySelector('#addProductForm button[type="submit"]');
        submitBtn.textContent = 'Update Product';
        
        // Change modal title
        document.querySelector('#addProductModal h2').textContent = 'Edit Product';
        
        openAddProductModal();
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product', 'error');
    }
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await db.collection('products').doc(productId).delete();
            showToast('Product deleted', 'success');
            await loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Error deleting product', 'error');
        }
    }
}

// COUPONS MANAGEMENT
async function loadCoupons() {
    try {
        const snapshot = await db.collection('coupons').get();
        const table = document.getElementById('couponsList');
        
        if (!table) return;
        
        let html = '<table class="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Active</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const coupon = { id: doc.id, ...doc.data() };
            html += `
                <tr>
                    <td>${coupon.code}</td>
                    <td>${coupon.discount}%</td>
                    <td>${coupon.active ? 'Yes' : 'No'}</td>
                    <td>${coupon.expiryDate ? formatDate(coupon.expiryDate) : 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="btn-delete" onclick="deleteCoupon('${coupon.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

function openAddCouponModal() {
    document.getElementById('addCouponModal').classList.remove('hidden');
}

function closeAddCouponModal() {
    document.getElementById('addCouponModal').classList.add('hidden');
    document.getElementById('addCouponForm').reset();
}

const addCouponForm = document.getElementById('addCouponForm');
if (addCouponForm) {
    addCouponForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const code = document.getElementById('couponCode').value.toUpperCase();
        const discount = parseInt(document.getElementById('couponDiscount').value);
        const usageLimit = parseInt(document.getElementById('couponUsageLimit').value);
        const expiryDate = document.getElementById('couponExpiry').value;
        const active = document.getElementById('couponActive').checked;
        
        try {
            showLoading(true);
            await db.collection('coupons').add({
                code, discount, usageLimit, active,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                createdAt: new Date()
            });
            
            showToast('Coupon added successfully', 'success');
            closeAddCouponModal();
            await loadCoupons();
        } catch (error) {
            console.error('Error adding coupon:', error);
            showToast('Error adding coupon', 'error');
        } finally {
            showLoading(false);
        }
    });
}

async function deleteCoupon(couponId) {
    if (confirm('Are you sure you want to delete this coupon?')) {
        try {
            await db.collection('coupons').doc(couponId).delete();
            showToast('Coupon deleted', 'success');
            await loadCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
            showToast('Error deleting coupon', 'error');
        }
    }
}

// PAYMENT METHODS
async function loadPaymentMethods() {
    try {
        const doc = await db.collection('settings').doc('paymentMethods').get();
        if (doc.exists) {
            const methods = doc.data();
            document.getElementById('bankIban').value = methods.bank?.iban || '';
            document.getElementById('bankAccount').value = methods.bank?.account || '';
            document.getElementById('jazzcashNumber').value = methods.jazzcash?.number || '';
            document.getElementById('easypaisaNumber').value = methods.easypaisa?.number || '';
            document.getElementById('raastAccount').value = methods.raast?.account || '';
        }
    } catch (error) {
        console.error('Error loading payment methods:', error);
    }
}

async function updatePaymentMethod(method) {
    try {
        showLoading(true);
        
        let updateData = {};
        
        switch(method) {
            case 'bank':
                updateData = {
                    bank: {
                        iban: document.getElementById('bankIban').value,
                        account: document.getElementById('bankAccount').value
                    }
                };
                break;
            case 'jazzcash':
                updateData = {
                    jazzcash: {
                        number: document.getElementById('jazzcashNumber').value
                    }
                };
                break;
            case 'easypaisa':
                updateData = {
                    easypaisa: {
                        number: document.getElementById('easypaisaNumber').value
                    }
                };
                break;
            case 'raast':
                updateData = {
                    raast: {
                        account: document.getElementById('raastAccount').value
                    }
                };
                break;
        }
        
        await db.collection('settings').doc('paymentMethods').set(updateData, { merge: true });
        showToast('Payment method updated', 'success');
    } catch (error) {
        console.error('Error updating payment method:', error);
        showToast('Error updating payment method', 'error');
    } finally {
        showLoading(false);
    }
}

// Close modals on background click
document.addEventListener('click', (e) => {
    const modals = [
        document.getElementById('addProductModal'),
        document.getElementById('addCouponModal'),
        document.getElementById('orderDetailsModal')
    ];
    
    modals.forEach(modal => {
        if (modal && e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});
