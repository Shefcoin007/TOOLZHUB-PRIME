document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    await loadProducts();
});

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    try {
        // Try loading from Supabase
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            products = data;
            renderProducts(products);
        } else {
            // Load sample products
            loadSampleProducts();
        }
        
    } catch (err) {
        console.error('Error loading products:', err);
        loadSampleProducts();
    }
}

function loadSampleProducts() {
    products = [
        { id: '1', name: '9PROXY 200IPS Unlimited', category: 'proxy', description: 'High-speed residential proxies with unlimited bandwidth', price: 31000, stock: 50, is_featured: true },
        { id: '2', name: 'Premium USA Logs', category: 'logs', description: 'Verified USA logs with full information', price: 15000, stock: 30, is_featured: true },
        { id: '3', name: 'Advanced Blueprint Pack', category: 'blueprint', description: 'Complete guide with video walkthroughs', price: 25000, stock: 999, is_featured: true },
        { id: '4', name: '9PROXY 100IPS Standard', category: 'proxy', description: 'Reliable proxy service for everyday use', price: 18000, stock: 100, is_featured: false },
        { id: '5', name: 'UK Bank Logs Bundle', category: 'logs', description: 'Tested UK banking logs', price: 12000, stock: 45, is_featured: false },
        { id: '6', name: 'Monthly Updates Subscription', category: 'update', description: 'Get all new releases monthly', price: 10000, stock: 999, is_featured: false }
    ];
    
    renderProducts(products);
}

function renderProducts(list) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) return;
    
    if (!list || list.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    grid.innerHTML = list.map(p => `
        <div class="product-card-modern" data-aos="fade-up">
            ${p.is_featured ? '<span class="product-badge">Featured</span>' : ''}
            <div class="product-category">${p.category.toUpperCase()}</div>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-description">${p.description}</p>
            <div class="product-footer-modern">
                <div class="product-price">₦${p.price.toLocaleString()}</div>
                <div class="product-stock">${p.stock} in stock</div>
            </div>
            <button class="btn-add-cart-modern" onclick="addToCart('${p.id}')">
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
        </div>
    `).join('');
}

function filterByCategory(category) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter products
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

function filterProducts() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    if (!search) {
        renderProducts(products);
        return;
    }
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
    
    renderProducts(filtered);
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showToast(`${product.name} added to cart!`, 'success');
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!container || !footer) return;
    
    if (!cart.length) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        footer.style.display = 'none';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item-modern">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
                <strong>₦${(item.price * item.quantity).toLocaleString()}</strong>
            </div>
            <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    footer.style.display = 'flex';
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

async function checkout() {
    if (!currentUser) {
        toggleCart();
        showToast('Please login to checkout', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Check balance
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.id)
        .single();
    
    if (!profile || profile.balance < total) {
        showToast('Insufficient balance. Please add funds.', 'error');
        setTimeout(() => window.location.href = 'wallet.html', 1500);
        return;
    }
    
    // Process order
    try {
        for (const item of cart) {
            await supabaseClient.from('orders').insert({
                user_id: currentUser.id,
                product_id: item.id,
                product_name: item.name,
                amount: item.price * item.quantity,
                quantity: item.quantity,
                status: 'completed',
                points_earned: 1
            });
        }
        
        // Update balance
        await supabaseClient
            .from('profiles')
            .update({ balance: profile.balance - total })
            .eq('id', currentUser.id);
        
        showToast('Order placed successfully!', 'success');
        cart = [];
        localStorage.setItem('cart', '[]');
        updateCartCount();
        toggleCart();
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        
    } catch (err) {
        showToast('Checkout failed: ' + err.message, 'error');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// Expose functions globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.filterByCategory = filterByCategory;
window.filterProducts = filterProducts;
window.logout = logout;
