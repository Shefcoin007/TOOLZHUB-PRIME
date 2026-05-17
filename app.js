// ============================================
// TOOLZHUB-PRIME - PRODUCTION CONFIG
// ============================================

const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGJjdGlpdHJqcXRmc25oeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDIwNTcsImV4cCI6MjA5NDU3ODA1N30._nqkfipQgR3QzRii3C8zFtPckzxktOWmtlHs7PrntWc';

// Initialize Supabase ONCE
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let products = [];

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
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
            options: { 
                data: { full_name: name },
                emailRedirectTo: window.location.origin + '/TOOLZHUB-PRIME/dashboard.html'
            }
        });
        if (error) throw error;
        
        showToast('Account created! Check your email to verify.', 'success');
        document.getElementById('registerForm')?.reset();
        switchAuthTab('login');
    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
    }
}

// ✅ NEW: Forgot Password Function
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail')?.value;
    
    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/TOOLZHUB-PRIME/dashboard.html'
        });
        if (error) throw error;
        
        showToast('Password reset link sent to your email!', 'success');
        toggleForgotPasswordModal();
        document.getElementById('forgotPasswordForm')?.reset();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

// ✅ NEW: Update Password (after reset)
async function updatePassword(newPassword) {
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        
        showToast('Password updated successfully!', 'success');
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

async function signInWithGoogle() {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/TOOLZHUB-PRIME/dashboard.html',
                queryParams: { 
                    access_type: 'offline', 
                    prompt: 'consent' 
                }
            }
        });
        if (error) throw error;
    } catch (err) {
        showToast('Google sign-in failed: ' + err.message, 'error');
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

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI(false);
    window.location.href = 'index.html';
}

// ============================================
// PRODUCTS - FETCH FROM LOGGSPLUG
// ============================================

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    try {
        // Try to fetch from LoggsPlug API
        const response = await fetch('https://loggsplug.online/api/products');
        const data = await response.json();
        
        if (data && data.products) {
            products = data.products.map(p => ({
                id: p.id || p._id,
                name: p.name || p.title,
                category: p.category || 'general',
                description: p.description || '',
                price: p.price || 0,
                stock: p.stock || 999,
                is_featured: p.featured || false
            }));
        } else {
            // Fallback to Supabase
            await loadProductsFromSupabase();
        }
    } catch (err) {
        console.error('LoggsPlug fetch error:', err);
        await loadProductsFromSupabase();
    }
    
    renderProducts(products);
}

async function loadProductsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false });
        
        if (error) throw error;
        products = data || [];
    } catch (err) {
        console.error('Supabase load error:', err);
        products = getSampleProducts();
    }
}

function getSampleProducts() {
    return [
        { id: '1', name: '9PROXY 200IPS Unlimited', category: 'proxy', description: 'High-speed residential proxies', price: 31000, stock: 50, is_featured: true },
        { id: '2', name: 'Premium USA Logs', category: 'logs', description: 'Verified USA logs', price: 15000, stock: 30, is_featured: true },
        { id: '3', name: 'Advanced Blueprint Pack', category: 'blueprint', description: 'Complete guide with videos', price: 25000, stock: 999, is_featured: true }
    ];
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

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

async function checkout() {
    if (!currentUser) {
        toggleCart();
        toggleAuthModal();
        showToast('Please login to checkout', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    showToast(`Processing checkout: ₦${total.toLocaleString()}`, 'success');
    
    // TODO: Integrate payment gateway
    cart = [];
    localStorage.setItem('cart', '[]');
    updateCartCount();
    toggleCart();
}

// ============================================
// UI MODAL FUNCTIONS
// ============================================

function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.toggle('active');
}

function toggleForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
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

// Expose functions globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.checkout = checkout;
window.toggleAuthModal = toggleAuthModal;
window.toggleForgotPasswordModal = toggleForgotPasswordModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgotPassword = handleForgotPassword;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollTo = scrollTo;
