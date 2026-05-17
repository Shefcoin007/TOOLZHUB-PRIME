// ============================================
// TOOLZHUB-PRIME - PRODUCTION CONFIG
// ============================================

const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGJjdGlpdHJqcXRmc25oeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDIwNTcsImV4cCI6MjA5NDU3ODA1N30._nqkfipQgR3QzRii3C8zFtPckzxktOWmtlHs7PrntWc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// LOGGSPLUG API + FALLBACK SYSTEM
// ============================================

const LOGGSPLUG_API_KEY = 'rsl_G1d2VNRaQrKvdy0Yt40bCbuU7oVruVlrJE9tkxlBiLvPT2FD';
const LOGGSPLUG_API_URL = 'https://loggsplug.online/api';
const PROFIT_MARKUP = 1.5; // 50% profit

// Currency rates (1 NGN = X)
const CURRENCIES = {
    NGN: { symbol: '₦', rate: 1, name: 'Nigerian Naira' },
    USD: { symbol: '$', rate: 0.00065, name: 'US Dollar' },
    GBP: { symbol: '£', rate: 0.00051, name: 'British Pound' },
    EUR: { symbol: '€', rate: 0.00060, name: 'Euro' }
};

let currentCurrency = localStorage.getItem('currency') || 'NGN';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentUser = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
    
    initApp();
    loadProducts(); // Will try API, fallback to Supabase, then samples
    checkAuth();
    setupEventListeners();
    updateCurrencyDisplay();
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
    
    // Set currency selector
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) currencySelect.value = currentCurrency;
}

function setupEventListeners() {
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
    
    // Navbar scroll
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });
}

// ============================================
// PRODUCT LOADING - 3-TIER FALLBACK
// ============================================

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    // Show loading
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading products...</p></div>';
    
    try {
        // Tier 1: Try LoggsPlug API
        console.log('Attempting LoggsPlug API...');
        const apiProducts = await fetchFromLoggsPlug();
        
        if (apiProducts && apiProducts.length > 0) {
            products = apiProducts;
            console.log(`✅ Loaded ${products.length} products from LoggsPlug`);
            renderProducts(products);
            return;
        }
        
    } catch (apiError) {
        console.warn('LoggsPlug API failed:', apiError.message);
    }
    
    try {
        // Tier 2: Try Supabase
        console.log('Attempting Supabase...');
        const supabaseProducts = await fetchFromSupabase();
        
        if (supabaseProducts && supabaseProducts.length > 0) {
            products = supabaseProducts;
            console.log(`✅ Loaded ${products.length} products from Supabase`);
            renderProducts(products);
            showToast('Using local products (API unavailable)', 'warning');
            return;
        }
        
    } catch (dbError) {
        console.warn('Supabase failed:', dbError.message);
    }
    
    // Tier 3: Use sample products
    console.log('Using sample products');
    products = getSampleProducts();
    renderProducts(products);
    showToast('Showing sample products', 'warning');
}

async function fetchFromLoggsPlug() {
    const response = await fetch(`${LOGGSPLUG_API_URL}/products`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOGGSPLUG_API_KEY}`,
            'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    const rawProducts = data.products || data.data || data;
    
    return rawProducts.map(p => ({
        id: p.id || p._id || `prod_${Date.now()}_${Math.random()}`,
        name: p.name || p.title || 'Premium Digital Asset',
        category: mapCategory(p.category || p.type || 'general'),
        description: p.description || p.details || 'High-quality digital product',
        price: (parseFloat(p.price || p.amount || 0) * PROFIT_MARKUP),
        priceNGN: parseFloat(p.price || p.amount || 0) * PROFIT_MARKUP,
        stock: parseInt(p.stock || p.quantity || 999),
        is_featured: p.featured || false,
        image: p.image || null
    }));
}

async function fetchFromSupabase() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        price: p.price * PROFIT_MARKUP,
        priceNGN: p.price * PROFIT_MARKUP,
        stock: p.stock,
        is_featured: p.is_featured,
        image: p.image_url
    }));
}

function getSampleProducts() {
    return [
        { 
            id: '1', 
            name: '9PROXY 200IPS Unlimited', 
            category: 'proxy', 
            description: 'High-speed residential proxies with unlimited bandwidth', 
            price: 46500,
            priceNGN: 46500,
            stock: 50, 
            is_featured: true 
        },
        { 
            id: '2', 
            name: 'Premium USA Logs', 
            category: 'logs', 
            description: 'Verified USA logs with full information', 
            price: 22500,
            priceNGN: 22500,
            stock: 30, 
            is_featured: true 
        },
        { 
            id: '3', 
            name: 'Advanced Blueprint Pack', 
            category: 'blueprint', 
            description: 'Complete guide with video walkthroughs', 
            price: 37500,
            priceNGN: 37500,
            stock: 999, 
            is_featured: true 
        },
        { 
            id: '4', 
            name: 'UK Bank Logs Bundle', 
            category: 'logs', 
            description: 'Tested UK banking logs with high success rate', 
            price: 18000,
            priceNGN: 18000,
            stock: 45, 
            is_featured: false 
        }
    ];
}

function mapCategory(cat) {
    const map = {
        'proxy': 'proxy', 'proxies': 'proxy',
        'log': 'logs', 'logs': 'logs', 'fullz': 'logs',
        'blueprint': 'blueprint', 'guide': 'blueprint',
        'update': 'update', 'tool': 'update'
    };
    return map[cat.toLowerCase()] || 'general';
}

// ============================================
// RENDER & FILTER
// ============================================

function renderProducts(list) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!list || list.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No products available</h3></div>';
        return;
    }
    
    const symbol = CURRENCIES[currentCurrency].symbol;
    
    grid.innerHTML = list.map(p => {
        const displayPrice = formatPrice(p.priceNGN);
        return `
        <div class="product-card" data-category="${p.category}">
            ${p.is_featured ? '<span class="product-badge">Featured</span>' : ''}
            <div class="product-category">${p.category.toUpperCase()}</div>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-description">${p.description}</p>
            <div class="product-footer">
                <div class="product-price">${displayPrice}</div>
                <div class="product-stock">${p.stock} in stock</div>
            </div>
            <button class="btn-add-cart" onclick="addToCart('${p.id}')">
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
        </div>
    `}).join('');
}

function formatPrice(ngnAmount) {
    const converted = ngnAmount * CURRENCIES[currentCurrency].rate;
    const symbol = CURRENCIES[currentCurrency].symbol;
    return `${symbol}${converted.toLocaleString()}`;
}

function updateCurrencyDisplay() {
    const select = document.getElementById('currencySelect');
    if (select) select.value = currentCurrency;
    
    // Re-render products with new currency
    if (products.length > 0) {
        renderProducts(products);
    }
}

function changeCurrency(currency) {
    if (!CURRENCIES[currency]) return;
    currentCurrency = currency;
    localStorage.setItem('currency', currency);
    updateCurrencyDisplay();
}

function filterByCategory(category) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(category) || 
            (category === 'all' && btn.textContent.includes('All'))) {
            btn.classList.add('active');
        }
    });
    
    if (category === 'all') {
        renderProducts(products);
    } else {
        renderProducts(products.filter(p => p.category === category));
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
        p.description.toLowerCase().includes(search)
    );
    renderProducts(filtered);
}

// ============================================
// CART FUNCTIONS
// ============================================

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
        container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
        footer.style.display = 'none';
        return;
    }
    
    const symbol = CURRENCIES[currentCurrency].symbol;
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${symbol}${item.price.toLocaleString()} × ${item.quantity}</p>
            </div>
            <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    footer.style.display = 'flex';
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

// ============================================
// AUTH & UI
// ============================================

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateAuthUI(true);
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
            authBtn.onclick = toggleAuthModal;
        }
        if (cartBtn) cartBtn.style.display = 'none';
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.toggle('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showToast('Login failed: ' + error.message, 'error');
        return;
    }
    
    location.reload();
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    const { error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
    });
    
    if (error) {
        showToast('Registration failed: ' + error.message, 'error');
        return;
    }
    
    showToast('Account created! Check your email.', 'success');
}

async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
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

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check' : 'fa-exclamation'}"></i><span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Expose functions
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.toggleAuthModal = toggleAuthModal;
window.switchAuthTab = (tab) => {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
};
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.changeCurrency = changeCurrency;
window.filterByCategory = filterByCategory;
window.filterProducts = filterProducts;
