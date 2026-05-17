// ============================================
// TOOLZHUB-PRIME - PRODUCTION CONFIG
// ============================================

const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGJjdGlpdHJqcXRmc25oeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDIwNTcsImV4cCI6MjA5NDU3ODA1N30._nqkfipQgR3QzRii3C8zFtPckzxktOWmtlHs7PrntWc';

// Initialize Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// LOGGSPLUG API CONFIGURATION
// ============================================

const LOGGSPLUG_API_KEY = 'rsl_G1d2VNRaQrKvdy0Yt40bCbuU7oVruVlrJE9tkxlBiLvPT2FD';
const LOGGSPLUG_API_URL = 'https://loggsplug.online/api';
const PROFIT_MARKUP = 1.5; // 50% profit margin

// Currency Configuration
const CURRENCIES = {
    NGN: { symbol: '₦', rate: 1, name: 'Nigerian Naira' },
    USD: { symbol: '$', rate: 0.00065, name: 'US Dollar' }, // 1 NGN = 0.00065 USD
    GBP: { symbol: '£', rate: 0.00051, name: 'British Pound' },
    EUR: { symbol: '€', rate: 0.00060, name: 'Euro' }
};

let currentCurrency = 'NGN';
let productsCache = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

// Global State
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true, offset: 100 });
    }
    
    // Load saved currency
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency && CURRENCIES[savedCurrency]) {
        currentCurrency = savedCurrency;
        updateCurrencyDisplay();
    }
    
    // Initialize app
    initApp();
    loadProducts();
    checkAuth();
    setupEventListeners();
});

function initApp() {
    updateCartCount();
    
    // Load theme
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
}

function setupEventListeners() {
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });
}

// ============================================
// CURRENCY FUNCTIONS
// ============================================

function convertPrice(amountInNGN) {
    const rate = CURRENCIES[currentCurrency].rate;
    return (amountInNGN * rate).toFixed(2);
}

function getCurrencySymbol() {
    return CURRENCIES[currentCurrency].symbol;
}

function formatPrice(amountInNGN) {
    const converted = convertPrice(amountInNGN);
    const symbol = getCurrencySymbol();
    return `${symbol}${parseFloat(converted).toLocaleString()}`;
}

function updateCurrencyDisplay() {
    // Update all price displays on the page
    document.querySelectorAll('.product-price').forEach(el => {
        const ngnPrice = parseFloat(el.dataset.price);
        if (ngnPrice) {
            el.textContent = formatPrice(ngnPrice);
        }
    });
    
    // Update currency selector if exists
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
    }
}

function changeCurrency(currency) {
    if (!CURRENCIES[currency]) return;
    
    currentCurrency = currency;
    localStorage.setItem('currency', currency);
    updateCurrencyDisplay();
    
    // Refresh products to show new prices
    if (productsCache.length > 0) {
        renderProducts(productsCache);
    }
}

// ============================================
// LOGGSPLUG API INTEGRATION
// ============================================

async function fetchLoggsPlugProducts() {
    // Check cache
    const now = Date.now();
    if (productsCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('Using cached products');
        return productsCache;
    }
    
    try {
        console.log('Fetching from LoggsPlug API...');
        
        const response = await fetch(`${LOGGSPLUG_API_URL}/products`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LOGGSPLUG_API_KEY}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('LoggsPlug response:', data);
        
        // Map and transform products with 50% markup
        productsCache = (data.products || data.data || data).map(p => {
            const basePrice = parseFloat(p.price || p.amount || p.cost || 0);
            const markedUpPrice = basePrice * PROFIT_MARKUP; // 50% markup
            
            return {
                id: p.id || p._id || p.product_id || `prod_${Date.now()}_${Math.random()}`,
                name: p.name || p.title || p.product_name || 'Premium Digital Asset',
                category: mapCategory(p.category || p.type || 'general'),
                description: p.description || p.details || p.desc || 'High-quality digital product with instant delivery',
                price: markedUpPrice, // Price with 50% markup
                priceNGN: markedUpPrice, // Store original NGN price
                stock: parseInt(p.stock || p.quantity || p.available || 999),
                is_featured: p.featured || p.is_featured || false,
                image: p.image || p.image_url || p.thumbnail || null,
                metadata: p // Keep original data
            };
        });
        
        cacheTimestamp = now;
        console.log(`Loaded ${productsCache.length} products with 50% markup`);
        
        return productsCache;
        
    } catch (error) {
        console.error('Failed to fetch from LoggsPlug:', error);
        showToast('Using sample products (API unavailable)', 'error');
        return getSampleProducts();
    }
}

function mapCategory(loggsplugCategory) {
    const categoryMap = {
        'proxy': 'proxy',
        'proxies': 'proxy',
        'residential proxy': 'proxy',
        'datacenter proxy': 'proxy',
        'log': 'logs',
        'logs': 'logs',
        'fullz': 'logs',
        'cc': 'logs',
        'blueprint': 'blueprint',
        'blueprints': 'blueprint',
        'guide': 'blueprint',
        'guides': 'blueprint',
        'tutorial': 'blueprint',
        'update': 'update',
        'updates': 'update',
        'tool': 'update',
        'software': 'update',
        'account': 'accounts',
        'accounts': 'accounts',
        'social media': 'accounts'
    };
    
    const normalized = loggsplugCategory.toLowerCase();
    return categoryMap[normalized] || 'general';
}

function getSampleProducts() {
    return [
        { 
            id: '1', 
            name: '9PROXY 200IPS Unlimited', 
            category: 'proxy', 
            description: 'High-speed residential proxies with unlimited bandwidth', 
            price: 46500, // 31000 * 1.5
            priceNGN: 46500,
            stock: 50, 
            is_featured: true 
        },
        { 
            id: '2', 
            name: 'Premium USA Logs', 
            category: 'logs', 
            description: 'Verified USA logs with full information', 
            price: 22500, // 15000 * 1.5
            priceNGN: 22500,
            stock: 30, 
            is_featured: true 
        },
        { 
            id: '3', 
            name: 'Advanced Blueprint Pack', 
            category: 'blueprint', 
            description: 'Complete guide with video walkthroughs', 
            price: 37500, // 25000 * 1.5
            priceNGN: 37500,
            stock: 999, 
            is_featured: true 
        }
    ];
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    // Show loading
    grid.innerHTML = `
        <div class="loading-grid">
            <div class="skeleton-product"></div>
            <div class="skeleton-product"></div>
            <div class="skeleton-product"></div>
        </div>
    `;
    
    try {
        products = await fetchLoggsPlugProducts();
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h3>No products available</h3>
                    <p>Check back soon for new products!</p>
                </div>
            `;
            return;
        }
        
        renderProducts(products);
        
    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load products</h3>
                <p>Please refresh the page or try again later.</p>
                <button class="btn-primary" onclick="loadProducts()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
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
    
    const symbol = getCurrencySymbol();
    
    grid.innerHTML = list.map(p => {
        const displayPrice = formatPrice(p.priceNGN);
        
        return `
        <div class="product-card-modern" data-aos="fade-up" data-category="${p.category}">
            ${p.is_featured ? '<span class="product-badge">Featured</span>' : ''}
            
            ${p.image ? `
                <div class="product-image">
                    <img src="${p.image}" alt="${p.name}" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            
            <div class="product-category">${p.category.toUpperCase()}</div>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-description">${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}</p>
            
            <div class="product-footer-modern">
                <div class="product-price" data-price="${p.priceNGN}">${displayPrice}</div>
                <div class="product-stock">${p.stock} in stock</div>
            </div>
            
            <button class="btn-add-cart-modern" onclick="addToCart('${p.id}')">
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
        </div>
    `}).join('');
}

// ============================================
// CART FUNCTIONS
// ============================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('Product out of stock', 'error');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast('Maximum stock reached', 'error');
            return;
        }
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
                <button class="btn-secondary" onclick="toggleCart()">
                    <i class="fas fa-arrow-left"></i> Continue Shopping
                </button>
            </div>
        `;
        footer.style.display = 'none';
        return;
    }
    
    const symbol = getCurrencySymbol();
    
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        return `
        <div class="cart-item-modern">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${symbol}${item.price.toLocaleString()} × ${item.quantity}</p>
                <strong>${symbol}${itemTotal.toLocaleString()}</strong>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    footer.style.display = 'flex';
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stock) {
        showToast('Maximum stock reached', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
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
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        return;
    }
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check balance
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.id)
        .single();
    
    if (!profile || profile.balance < total) {
        showToast('Insufficient balance. Please add funds.', 'error');
        setTimeout(() => window.location.href = 'wallet.html', 2000);
        return;
    }
    
    try {
        // Process orders
        for (const item of cart) {
            await supabaseClient.from('orders').insert({
                user_id: currentUser.id,
                product_id: item.id,
                product_name: item.name,
                amount: item.price * item.quantity,
                quantity: item.quantity,
                status: 'completed',
                points_earned: 1 * item.quantity,
                delivery_data: item.metadata || {}
            });
        }
        
        // Update balance
        await supabaseClient
            .from('profiles')
            .update({ balance: profile.balance - total })
            .eq('id', currentUser.id);
        
        // Record transaction
        await supabaseClient.from('transactions').insert({
            user_id: currentUser.id,
            type: 'purchase',
            amount: total,
            method: 'wallet',
            status: 'completed',
            metadata: { items: cart.map(i => ({ name: i.name, qty: i.quantity })) }
        });
        
        const pointsEarned = cart.reduce((sum, item) => sum + item.quantity, 0);
        showToast(`Order successful! +${pointsEarned} points earned.`, 'success');
        
        // Clear cart
        cart = [];
        localStorage.setItem('cart', '[]');
        updateCartCount();
        toggleCart();
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Checkout failed: ' + error.message, 'error');
    }
}

// ============================================
// AUTH FUNCTIONS
// ============================================

async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            updateAuthUI(true);
        }
    } catch (err) {
        console.error('Auth error:', err);
    }
}

function updateAuthUI(isLoggedIn) {
    const authBtn = document.getElementById('authBtn');
    const cartBtn = document.getElementById('cartBtn');
    
    if (isLoggedIn) {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i> <span>Dashboard</span>';
            authBtn.onclick = () => window.location.href = 'dashboard.html';
        }
        if (cartBtn) cartBtn.style.display = 'flex';
    } else {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Get Started</span>';
            authBtn.onclick = () => toggleAuthModal();
        }
        if (cartBtn) cartBtn.style.display = 'none';
    }
}

async function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.toggle('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI(true);
        toggleAuthModal();
        showToast('Welcome back!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 800);
    } catch (err) {
        showToast('Login failed: ' + err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    
    try {
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });
        if (error) throw error;
        
        showToast('Account created! Check your email.', 'success');
        document.getElementById('registerForm')?.reset();
    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
    }
}

async function signInWithGoogle() {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/TOOLZHUB-PRIME/dashboard.html'
            }
        });
        if (error) throw error;
    } catch (err) {
        showToast('Google sign-in failed: ' + err.message, 'error');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI(false);
    window.location.href = 'index.html';
}

// ============================================
// UI UTILITIES
// ============================================

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const title = document.getElementById('authTitle');
    
    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        tabs[0]?.classList.add('active');
        tabs[1]?.classList.remove('active');
        if (title) title.textContent = 'Welcome Back';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        tabs[0]?.classList.remove('active');
        tabs[1]?.classList.add('active');
        if (title) title.textContent = 'Create Account';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleMobileMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('active');
}

function scrollTo(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(msg);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${msg}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Expose functions globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.updateQuantity = updateQuantity;
window.loadProducts = loadProducts;
window.filterByCategory = (cat) => {
    if (cat === 'all') {
        renderProducts(products);
    } else {
        renderProducts(products.filter(p => p.category === cat));
    }
};
window.filterProducts = () => {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (!search) {
        renderProducts(products);
    } else {
        renderProducts(products.filter(p => 
            p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search)
        ));
    }
};
window.toggleAuthModal = toggleAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollTo = scrollTo;
window.changeCurrency = changeCurrency;
