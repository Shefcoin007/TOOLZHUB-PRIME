// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGJjdGlpdHJqcXRmc25oeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDIwNTcsImV4cCI6MjA5NDU3ODA1N30._nqkfipQgR3QzRii3C8zFtPckzxktOWmtlHs7PrntWc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGGSPLUG_API_KEY = 'rsl_G1d2VNRaQrKvdy0Yt40bCbuU7oVruVlrJE9tkxlBiLvPT2FD';
const LOGGSPLUG_API_URL = 'https://loggsplug.online/api';
const PROFIT_MARKUP = 1.5;

const CURRENCIES = {
    NGN: { symbol: '₦', rate: 1 },
    USD: { symbol: '$', rate: 0.00065 },
    GBP: { symbol: '£', rate: 0.00051 },
    EUR: { symbol: '€', rate: 0.00060 }
};

let currentCurrency = localStorage.getItem('currency') || 'NGN';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentUser = null;

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadProducts();
    checkAuth();
});

function initApp() {
    updateCartCount();
    
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
    
    const select = document.getElementById('currencySelect');
    if (select) select.value = currentCurrency;
}

// ============================================
// PRODUCTS - 3-TIER FALLBACK
// ============================================

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading products...</p></div>';
    
    try {
        // Try LoggsPlug API
        const apiProducts = await fetchFromLoggsPlug();
        if (apiProducts.length > 0) {
            products = apiProducts;
            renderProducts(products);
            console.log('✅ Loaded from LoggsPlug:', products.length);
            return;
        }
    } catch (e) {
        console.warn('LoggsPlug failed:', e.message);
    }
    
    try {
        // Try Supabase
        const dbProducts = await fetchFromSupabase();
        if (dbProducts.length > 0) {
            products = dbProducts;
            renderProducts(products);
            showToast('Using local products', 'warning');
            console.log('✅ Loaded from Supabase:', products.length);
            return;
        }
    } catch (e) {
        console.warn('Supabase failed:', e.message);
    }
    
    // Fallback to samples
    products = getSampleProducts();
    renderProducts(products);
    showToast('Showing sample products', 'warning');
}

async function fetchFromLoggsPlug() {
    const response = await fetch(`${LOGGSPLUG_API_URL}/products`, {
        headers: {
            'Authorization': `Bearer ${LOGGSPLUG_API_KEY}`,
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) throw new Error(`API ${response.status}`);
    
    const data = await response.json();
    const raw = data.products || data.data || data;
    
    return raw.map(p => ({
        id: p.id || p._id || `p${Date.now()}`,
        name: p.name || p.title || 'Product',
        category: mapCategory(p.category || 'general'),
        description: p.description || 'Digital product',
        price: (parseFloat(p.price || 0) * PROFIT_MARKUP),
        priceNGN: parseFloat(p.price || 0) * PROFIT_MARKUP,
        stock: parseInt(p.stock || 999),
        is_featured: p.featured || false
    }));
}

async function fetchFromSupabase() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true);
    
    if (error) throw error;
    
    return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        price: p.price * PROFIT_MARKUP,
        priceNGN: p.price * PROFIT_MARKUP,
        stock: p.stock,
        is_featured: p.is_featured
    }));
}

function getSampleProducts() {
    return [
        { id: '1', name: '9PROXY 200IPS Unlimited', category: 'proxy', description: 'High-speed residential proxies', price: 46500, priceNGN: 46500, stock: 50, is_featured: true },
        { id: '2', name: 'Premium USA Logs', category: 'logs', description: 'Verified USA logs', price: 22500, priceNGN: 22500, stock: 30, is_featured: true },
        { id: '3', name: 'Advanced Blueprint Pack', category: 'blueprint', description: 'Complete guide with videos', price: 37500, priceNGN: 37500, stock: 999, is_featured: true }
    ];
}

function mapCategory(c) {
    const m = { 'proxy': 'proxy', 'proxies': 'proxy', 'log': 'logs', 'logs': 'logs', 'blueprint': 'blueprint', 'guide': 'blueprint', 'update': 'update' };
    return m[c.toLowerCase()] || 'general';
}

function renderProducts(list) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!list.length) {
        grid.innerHTML = '<div class="empty-state"><h3>No products</h3></div>';
        return;
    }
    
    const sym = CURRENCIES[currentCurrency].symbol;
    
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            ${p.is_featured ? '<span class="product-badge">Featured</span>' : ''}
            <div class="product-category">${p.category.toUpperCase()}</div>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-description">${p.description}</p>
            <div class="product-footer">
                <div class="product-price">${sym}${(p.priceNGN * CURRENCIES[currentCurrency].rate).toLocaleString()}</div>
                <div class="product-stock">${p.stock} in stock</div>
            </div>
            <button class="btn-add-cart" onclick="addToCart('${p.id}')">
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
        </div>
    `).join('');
}

// ============================================
// CART
// ============================================

function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    
    const ex = cart.find(x => x.id === id);
    if (ex) ex.quantity++;
    else cart.push({ ...p, quantity: 1 });
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showToast(`${p.name} added!`, 'success');
}

function updateCartCount() {
    const n = cart.reduce((s, i) => s + i.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = n;
}

function toggleCart() {
    const m = document.getElementById('cartModal');
    if (!m) return;
    m.classList.toggle('active');
    if (m.classList.contains('active')) renderCart();
}

function renderCart() {
    const c = document.getElementById('cartItems');
    const f = document.getElementById('cartFooter');
    if (!c || !f) return;
    
    if (!cart.length) {
        c.innerHTML = '<p>Your cart is empty</p>';
        f.style.display = 'none';
        return;
    }
    
    const sym = CURRENCIES[currentCurrency].symbol;
    c.innerHTML = cart.map(i => `
        <div style="padding:12px;border-bottom:1px solid var(--border-color)">
            <strong>${i.name}</strong><br>
            <small>${sym}${i.price.toLocaleString()} × ${i.quantity}</small>
        </div>
    `).join('');
    
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
    f.style.display = 'flex';
}

// ============================================
// AUTH
// ============================================

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateAuthUI(true);
    }
}

function updateAuthUI(logged) {
    const btn = document.getElementById('authBtn');
    const cart = document.getElementById('cartBtn');
    
    if (logged) {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-user-circle"></i> Dashboard';
            btn.onclick = () => window.location.href = 'dashboard.html';
        }
        if (cart) cart.style.display = 'flex';
    } else {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-user"></i> Get Started';
            btn.onclick = toggleAuthModal;
        }
        if (cart) cart.style.display = 'none';
    }
}

function toggleAuthModal() {
    const m = document.getElementById('authModal');
    if (m) m.classList.toggle('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    });
    if (error) {
        showToast('Login failed: ' + error.message, 'error');
        return;
    }
    location.reload();
}

async function handleRegister(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signUp({
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        options: { data: { full_name: document.getElementById('registerName').value } }
    });
    if (error) {
        showToast('Failed: ' + error.message, 'error');
        return;
    }
    showToast('Check your email!', 'success');
}

async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
}

// ============================================
// UTILS
// ============================================

function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const dark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleMobileMenu() {
    const m = document.getElementById('navMenu');
    if (m) m.classList.toggle('active');
}

function changeCurrency(cur) {
    if (!CURRENCIES[cur]) return;
    currentCurrency = cur;
    localStorage.setItem('currency', cur);
    if (products.length) renderProducts(products);
}

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// Expose
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.toggleAuthModal = toggleAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.signInWithGoogle = signInWithGoogle;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.changeCurrency = changeCurrency;
