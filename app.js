// ============================================
// TOOLZHUB-PRIME - PRODUCTION CONFIG
// ============================================

const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGJjdGlpdHJqcXRmc25oeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDIwNTcsImV4cCI6MjA5NDU3ODA1N30._nqkfipQgR3QzRii3C8zFtPckzxktOWmtlHs7PrntWc';
const GOOGLE_CLIENT_ID = '204905426386-1opadlvd43t0uldv5q7hbvhv4vhdakfk.apps.googleusercontent.com';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let products = [];

// Constants
const POINTS_PER_ORDER = 1;
const POINTS_VALUE = 100;
const ADMIN_EMAIL = 'walijimoh007@gmail.com';
const SUPPORT_PHONE = '09087805425';
const SUPPORT_WHATSAPP = 'https://wa.me/2349087805425';

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
    initApp();
    loadProducts();
    checkAuth();
    setupEventListeners();
});

function initApp() {
    updateCartCount();
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
    
    // Navbar scroll
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 100);
        }
    });
}

// ============================================
// AUTH
// ============================================

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            updateAuthUI(true);
            
            // Redirect to dashboard if on landing page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                // Don't auto-redirect, just show dashboard link
            }
        }
    } catch (err) {
        console.error('Auth check error:', err);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI(true);
        toggleAuthModal();
        showToast('Welcome back!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
    } catch (err) {
        showToast('Login failed: ' + err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    
    if (!name || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });
        if (error) throw error;
        
        showToast('Account created! Check your email to verify.', 'success');
        document.getElementById('registerForm')?.reset();
        switchAuthTab('login');
    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
    }
}

async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html',
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) throw error;
    } catch (err) {
        showToast('Google sign-in failed: ' + err.message, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI(false);
    window.location.href = 'index.html';
}

function updateAuthUI(isLoggedIn) {
    const authBtn = document.getElementById('authBtn');
    const cartBtn = document.getElementById('cartBtn');
    const authText = document.getElementById('authText');
    
    if (isLoggedIn) {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i> <span>Dashboard</span>';
            authBtn.onclick = () => window.location.href = 'dashboard.html';
        }
        if (authText) authText.textContent = 'Dashboard';
        if (cartBtn) cartBtn.style.display = 'flex';
    } else {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Get Started</span>';
            authBtn.onclick = () => toggleAuthModal();
        }
        if (authText) authText.textContent = 'Get Started';
        if (cartBtn) cartBtn.style.display = 'none';
    }
}

// ============================================
// PRODUCTS
// ============================================

async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        products = data || [];
        renderProducts(products);
    } catch (err) {
        console.error('Load products error:', err);
        renderSampleProducts();
    }
}

function renderSampleProducts() {
    products = [
        { id: '1', name: '9PROXY 200IPS Unlimited', category: 'proxy', description: 'High-speed residential proxies', price: 31000, stock: 50, is_featured: true },
        { id: '2', name: 'Premium USA Logs', category: 'logs', description: 'Verified USA logs with full info', price: 15000, stock: 30, is_featured: true },
        { id: '3', name: 'Advanced Blueprint Pack', category: 'blueprint', description: 'Complete guide with videos', price: 25000, stock: 999, is_featured: true },
        { id: '4', name: '9PROXY 100IPS Standard', category: 'proxy', description: 'Reliable proxy service', price: 18000, stock: 100, is_featured: false },
        { id: '5', name: 'UK Bank Logs Bundle', category: 'logs', description: 'Tested UK banking logs', price: 12000, stock: 45, is_featured: false },
        { id: '6', name: 'Monthly Updates Sub', category: 'update', description: 'Get all new releases monthly', price: 10000, stock: 999, is_featured: false }
    ];
    renderProducts(products);
}

function renderProducts(list) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!list.length) {
        grid.innerHTML = '<p class="empty-state">No products available</p>';
        return;
    }
    
    grid.innerHTML = list.map(p => `
        <div class="product-card" data-aos="fade-up">
            ${p.is_featured ? '<span class="product-badge">Featured</span>' : ''}
            <span class="product-category">${p.category}</span>
            <h3 class="product-title">${p.name}</h3>
            <p class="product-description">${p.description}</p>
            <div class="product-footer">
                <span class="product-price">₦${p.price.toLocaleString()}</span>
                <span class="product-stock">${p.stock} in stock</span>
            </div>
            <button class="btn-add-cart" onclick="addToCart('${p.id}')">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    `).join('');
}

function filterProducts(category = 'all') {
    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.category === category);
    renderProducts(filtered);
}

// ============================================
// CART
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
    
    saveCart();
    updateCartCount();
    showToast(`${product.name} added to cart!`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        renderCart();
        modal.classList.add('active');
    }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!container || !footer) return;
    
    if (!cart.length) {
        container.innerHTML = '<p class="empty-state">Your cart is empty</p>';
        footer.style.display = 'none';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
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
    footer.style.display = 'block';
}

async function checkout() {
    if (!currentUser) {
        toggleCart();
        toggleAuthModal();
        showToast('Please login to checkout', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        // Get user balance
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', currentUser.id)
            .single();
        
        if (profileErr) throw profileErr;
        if (!profile || profile.balance < total) {
            showToast('Insufficient balance. Fund your wallet first.', 'error');
            toggleCart();
            setTimeout(() => window.location.href = 'wallet.html', 1500);
            return;
        }
        
        // Create orders
        for (const item of cart) {
            const { error } = await supabase.from('orders').insert({
                user_id: currentUser.id,
                product_id: item.id,
                product_name: item.name,
                amount: item.price * item.quantity,
                quantity: item.quantity,
                status: 'completed',
                points_earned: POINTS_PER_ORDER * item.quantity
            });
            if (error) throw error;
        }
        
        // Update balance and points
        const pointsEarned = POINTS_PER_ORDER * cart.reduce((s, i) => s + i.quantity, 0);
        await supabase.rpc('update_user_balance_points', {
            p_user_id: currentUser.id,
            p_deduct: total,
            p_add_points: pointsEarned
        });
        
        // Record transaction
        await supabase.from('transactions').insert({
            user_id: currentUser.id,
            type: 'purchase',
            amount: total,
            status: 'completed',
            metadata: { items: cart.map(i => ({ name: i.name, qty: i.quantity })) }
        });
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartCount();
        toggleCart();
        
        showToast(`Order successful! +${pointsEarned} points added.`, 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
        
    } catch (err) {
        console.error('Checkout error:', err);
        showToast('Checkout failed: ' + err.message, 'error');
    }
}

// ============================================
// UI UTILS
// ============================================

function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.toggle('active');
}

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
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Expose functions globally for HTML onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.toggleAuthModal = toggleAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollTo = scrollTo;
window.filterProducts = filterProducts;
