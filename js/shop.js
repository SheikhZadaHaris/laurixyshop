// Shop Page Logic
let allProducts = [];
let currentProduct = null;
let currentQuantity = 1;

// Load products on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    updateCartCount();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
}

// Load products from Firestore
async function loadProducts() {
    try {
        showLoading(true);
        const snapshot = await db.collection('products').get();
        allProducts = [];
        const categories = new Set();
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            if (product.category) {
                categories.add(product.category);
            }
        });
        
        // Populate category filter
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }
        
        displayProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    } finally {
        showLoading(false);
    }
}

// Display products
function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text2);">No products found</p>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/250x200?text=Product'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <div class="product-stock ${product.stock > 0 ? '' : 'out-of-stock'}">
                    ${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => openProductModal(product));
        grid.appendChild(card);
    });
}

// Filter products
function filterProducts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    
    let filtered = allProducts;
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    displayProducts(filtered);
}

// Open product modal
function openProductModal(product) {
    currentProduct = product;
    currentQuantity = 1;
    
    const modal = document.getElementById('productModal');
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.getElementById('thumbnails');
    
    // Set main image
    mainImage.src = product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/400x300?text=Product';
    
    // Set thumbnails
    thumbnails.innerHTML = '';
    if (product.images && product.images.length > 0) {
        product.images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img;
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.addEventListener('click', () => {
                mainImage.src = img;
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbnails.appendChild(thumb);
        });
    }
    
    // Set product details
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductDescription').textContent = product.description;
    document.getElementById('modalProductPrice').textContent = formatCurrency(product.price);
    document.getElementById('modalProductStock').className = `stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`;
    document.getElementById('modalProductStock').textContent = product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock';
    
    document.getElementById('quantityInput').value = 1;
    document.getElementById('quantityInput').max = product.stock;
    
    modal.classList.remove('hidden');
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Increase quantity
function increaseQuantity() {
    const input = document.getElementById('quantityInput');
    const max = parseInt(input.max);
    if (parseInt(input.value) < max) {
        input.value = parseInt(input.value) + 1;
        currentQuantity = parseInt(input.value);
    }
}

// Decrease quantity
function decreaseQuantity() {
    const input = document.getElementById('quantityInput');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
        currentQuantity = parseInt(input.value);
    }
}

// Add to cart
function addToCart() {
    if (!currentProduct) return;
    
    if (currentProduct.stock < currentQuantity) {
        showToast('Not enough stock available', 'error');
        return;
    }
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItem = cart.find(item => item.id === currentProduct.id);
    
    if (existingItem) {
        if (existingItem.quantity + currentQuantity > currentProduct.stock) {
            showToast('Not enough stock available', 'error');
            return;
        }
        existingItem.quantity += currentQuantity;
    } else {
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.images && currentProduct.images[0] ? currentProduct.images[0] : 'https://via.placeholder.com/100x100?text=Product',
            quantity: currentQuantity
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showToast('Added to cart!', 'success');
    closeProductModal();
}

// Update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = count;
    }
}

// Close modal on background click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (modal && e.target === modal) {
        closeProductModal();
    }
});
