// ============================================
// TOOLZHUB-PRIME - CONFIGURATION
// ============================================

// REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://nhlbctiitrjqtfsnhyvt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sW1LcPyBiJcsGJhtyb1Xbw_vMZaJcAU';
const GOOGLE_CLIENT_ID = '204905426386-1opadlvd43t0uldv5q7hbvhv4vhdakfk.apps.googleusercontent.com';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let cart = [];
let currentCurrency = 'NGN';
let currentCategory = 'all';

// Currency Exchange Rates (Base: NGN)
const exchangeRates = {
    NGN: 1,
    USD: 0.00065,
    EUR: 0.00060,
    GBP: 0.00051
};

const currencySymbols = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£'
};

// Hardcoded Products
const products = [
    {
        id: 1,
        name: '9PROXY 200IPS - Unlimited Residential',
        category: 'proxy',
        description: 'High-speed residential proxies for iOS, Android & PC. Unlimited bandwidth.',
        price: 31000,
        stock: 50,
        icon: '🌐'
    },
    {
        id: 2,
        name: '9PROXY 100IPS - Unlimited',
        category: 'proxy',
        description: 'Premium residential proxy service with 100 IPs',
        price: 18000,
        stock: 75,
        icon: '🌐'
    },
    {
        id: 3,
        name: '9PROXY 50IPS - Unlimited',
        category: 'proxy',
        description: 'Reliable proxy service with 50 IPs',
        price: 10500,
        stock: 100,
        icon: '🌐'
    },
    {
        id: 4,
        name: 'RANDOM FACEBOOK 30+ - 50+ FRIENDS',
        category: 'facebook',
        description: 'Aged Facebook accounts with real friends. Ready to use.',
        price: 4500,
        stock: 974,
        icon: '📘'
    },
    {
        id: 5,
        name: 'RANDOM FACEBOOK 500+ - 2000+ FRIENDS',
        category: 'facebook',
        description: 'High-quality aged Facebook accounts with large friend base',
        price: 6500,
        stock: 480,
        icon: '📘'
    },
    {
        id: 6,
        name: 'RANDOM FACEBOOK 0-5 FRIENDS',
        category: 'facebook',
        description: 'Fresh Facebook accounts in log format',
        price: 3000,
        stock: 2266,
        icon: '📘'
    },
    {
        id: 7,
        name: 'INSTAGRAM WITH REAL OLD POSTS',
        category: 'instagram',
        description: 'Aged Instagram accounts with engagement and old posts',
        price: 8000,
        stock: 234,
        icon: '📷'
    },
    {
        id: 8,
        name: 'A TO Z AMIRA UPDATE',
        category: 'tools',
        description: 'Latest Amirael Dahab banking update',
        price: 5000,
        stock: 158,
        icon: '🔧'
    },
    {
        id: 9,
        name: 'BYD UPDATE',
        category: 'tools',
        description: 'BYD banking tool update',
        price: 10000,
        stock: 351,
        icon: '🔧'
    },
    {
        id: 10,
        name: 'VIP PET UPDATE',
        category: 'tools',
        description: 'VIP Pet banking update',
        price: 10000,
        stock: 150,
        icon: '🔧'
    },
    {
        id: 11,
        name: 'CC FULLZ LOGS - USA',
        category: 'logs',
        description: 'Premium USA CC logs with full information',
        price: 15000,
        stock: 89,
        icon: '💳'
    },
    {
        id: 12,
        name: 'CC FULLZ LOGS - UK',
        category: 'logs',
        description: 'Premium UK CC logs with full information',
        price: 12000,
        stock: 156,
        icon: '💳'
    }
];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadProducts();
    setupGoogleSignIn();
    checkAuth();
    registerServiceWorker();
});

function initializeApp() {
    // Load saved cart
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    }
    
    // Load saved currency
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
        currentCurrency = savedCurrency;
        document.getElementById('currencySelect').value = savedCurrency;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateUIForLoggedInUser();
        loadUserData();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateUIForLoggedInUser();
        loadUserData();
        closeModal('loginModal');
        showToast('Login successful!', 'success');
        document.getElementById('loginForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        
        if (error) throw error;
        
        showToast('Registration successful! Please check your email to verify.', 'success');
        document.getElementById('registerForm').reset();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function setupGoogleSignIn() {
    // Google Sign-In button will be rendered here
    // You'll need to configure this with your Google OAuth credentials
}

async function handleGoogleSignIn(response) {
    try {
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateUIForLoggedInUser();
        loadUserData();
        closeModal('loginModal');
        showToast('Login successful!', 'success');
    } catch (error) {
        showToast('Google sign-in failed: ' + error.message, 'error');
    }
}

function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const cartBtn = document.getElementById('cartBtn');
    
    authButtons.innerHTML = `
        <div class="user-menu">
            <span class="user-email">${currentUser.email}</span>
            <button class="btn-icon" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        </div>
    `;
    
    cartBtn.style.display = 'flex';
    
    // Show banking and dashboard sections
    document.getElementById('bankingSection').style.display = 'grid';
    document.getElementById('authPrompt').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'grid';
    document.getElementById('dashboardPrompt').style.display = 'none';
}

async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    location.reload();
}

async function loadUserData() {
    if (!currentUser) return;
    
    // Load user profile
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        document.getElementById('userEmail').textContent = currentUser.email;
        updateBalanceDisplay(data.balance || 0);
        document.getElementById('totalDeposits').textContent = (data.total_deposits || 0).toLocaleString();
        document.getElementById('totalSpent').textContent = (data.total_spent || 0).toLocaleString();
        document.getElementById('totalBonuses').textContent = (data.bonuses || 0).toLocaleString();
    }
    
    // Load orders
    loadOrders();
}

async function loadOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (data && data.length > 0) {
        renderOrders(data);
        updateOrderStats(data);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('ordersList');
    container.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <h4>${order.product_name}</h4>
                <p>${currencySymbols[currentCurrency]}${convertCurrency(order.amount)} • ${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <span class="order-status ${order.status}">${order.status}</span>
        </div>
    `).join('');
}

function updateOrderStats(orders) {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const revenue = orders.reduce((sum, o) => sum + o.amount, 0);
    
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('completedOrders').textContent = completed;
    document.getElementById('processingOrders').textContent = processing;
    document.getElementById('revenue').textContent = `${currencySymbols[currentCurrency]}${convertCurrency(revenue).toLocaleString()}`;
}

// ============================================
// CURRENCY FUNCTIONS
// ============================================

function changeCurrency() {
    currentCurrency = document.getElementById('currencySelect').value;
    localStorage.setItem('currency', currentCurrency);
    
    // Update all price displays
    loadProducts();
    
    // Update balance if logged in
    if (currentUser) {
        loadUserData();
    }
    
    // Update cart
    renderCart();
    
    showToast(`Currency changed to ${currentCurrency}`, 'success');
}

function convertCurrency(amount) {
    const rate = exchangeRates[currentCurrency];
    return (amount * rate).toFixed(2);
}

function updateBalanceDisplay(balance) {
    document.getElementById('balanceCurrency').textContent = currencySymbols[currentCurrency];
    document.getElementById('totalBalance').textContent = convertCurrency(balance);
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = currencySymbols[currentCurrency];
    });
}

// ============================================
// PRODUCTS
// ============================================

function loadProducts() {
    renderProducts(products);
}

function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    
    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-search"></i>
                <p>No products found</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productsToRender.map(product => `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                <span style="font-size: 64px;">${product.icon || '📦'}</span>
                ${product.stock < 10 ? '<span class="product-badge">Low Stock</span>' : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">${currencySymbols[currentCurrency]}${convertCurrency(product.price)}</span>
                    <span class="product-stock">${product.stock} pcs</span>
                </div>
                <button class="btn-add-cart" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

function filterCategory(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(category) || (category === 'all' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });
    
    // Filter products
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
}

// ============================================
// CART FUNCTIONS
// ============================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
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

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCart();
        updateCartCount();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
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
        <div class="cart-item">
            <div class="cart-item-image">
                <span style="font-size: 32px;">${item.icon || '📦'}</span>
            </div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${currencySymbols[currentCurrency]}${convertCurrency(item.price)} each</p>
                <div class="cart-item-price">${currencySymbols[currentCurrency]}${convertCurrency(item.price * item.quantity)}</div>
            </div>
            <div class="cart-item-actions">
                <button class="btn-remove" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="quantity-control">
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = convertCurrency(total).toLocaleString();
    footer.style.display = 'block';
}

async function checkout() {
    if (!currentUser) {
        closeModal('cartModal');
        showModal('loginModal');
        showToast('Please login to checkout', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
        // Get user balance
        const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', currentUser.id)
            .single();
        
        if (userData.balance >= total) {
            // Create orders
            for (const item of cart) {
                const { error } = await supabase
                    .from('orders')
                    .insert({
                        user_id: currentUser.id,
                        product_id: item.id,
                        product_name: item.name,
                        amount: item.price * item.quantity,
                        quantity: item.quantity,
                        status: 'pending'
                    });
                
                if (error) throw error;
            }
            
            // Deduct from balance
            await supabase
                .from('users')
                .update({ 
                    balance: userData.balance - total,
                    total_spent: (userData.total_spent || 0) + total
                })
                .eq('id', currentUser.id);
            
            // Clear cart
            cart = [];
            saveCart();
            updateCartCount();
            closeModal('cartModal');
            showToast('Checkout successful!', 'success');
            loadUserData();
        } else {
            showToast('Insufficient balance. Please fund your wallet.', 'error');
            closeModal('cartModal');
            showModal('fundModal');
        }
    } catch (error) {
        showToast('Checkout failed: ' + error.message, 'error');
    }
}

// ============================================
// BANKING & FUNDING
// ============================================

async function refreshBalance() {
    if (currentUser) {
        await loadUserData();
        showToast('Balance refreshed', 'success');
    }
}

function selectPayment(method) {
    if (!currentUser) {
        showModal('loginModal');
        showToast('Please login to fund your wallet', 'error');
        return;
    }
    
    document.getElementById('fundMethod').value = method;
    showModal('fundModal');
}

async function handleFundSubmit(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('fundAmount').value);
    const method = document.getElementById('fundMethod').value;
    const reference = document.getElementById('fundReference').value;
    
    try {
        // Record transaction
        const { error } = await supabase
            .from('transactions')
            .insert({
                user_id: currentUser.id,
                type: 'deposit',
                amount: amount,
                method: method,
                reference: reference,
                status: 'pending'
            });
        
        if (error) throw error;
        
        closeModal('fundModal');
        showToast(`Fund request of ${currencySymbols[currentCurrency]}${convertCurrency(amount)} submitted via ${method}`, 'success');
        document.getElementById('fundForm').reset();
        
        // In production, integrate with payment gateway here
        // For now, admin will verify and approve manually
    } catch (error) {
        showToast('Failed to process: ' + error.message, 'error');
    }
}

function showWithdrawModal() {
    showToast('Withdrawal feature - Contact admin: 09087805425', 'success');
}

function showTransferModal() {
    showToast('Transfer feature - Contact admin: 09087805425', 'success');
}

// ============================================
// CONTACT & SUPPORT
// ============================================

async function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value
    };
    
    try {
        const { error } = await supabase
            .from('contact_messages')
            .insert(formData);
        
        if (error) throw error;
        
        showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
        document.getElementById('contactForm').reset();
    } catch (error) {
        showToast('Failed to send message: ' + error.message, 'error');
    }
}

function openWhatsApp() {
    window.open('https://wa.me/2349087805425', '_blank');
}

function openEmail() {
    window.location.href = 'mailto:walijimoh007@gmail.com';
}

// ============================================
// UI UTILITIES
// ============================================

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// PWA & SERVICE WORKER
// ============================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    }
}

// ============================================
// NAVIGATION
// ============================================

// Active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
    
    // Navbar background on scroll
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(var(--bg), 0.95)';
    } else {
        navbar.style.background = 'rgba(var(--bg), 0.8)';
    }
});

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Console Welcome
console.log('%c🚀 ToolzHub-Prime', 'color: #6366f1; font-size: 24px; font-weight: bold;');
console.log('%cLegitimate sales of Logs, Accounts and Social Media Platforms', 'color: #8b5cf6; font-size: 14px;');
console.log('%cAdmin: walijimoh007@gmail.com | Support: 09087805425', 'color: #ec4899; font-size: 12px;');
