// Check auth and load dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    await loadDashboard();
    setupRealTimeUpdates();
});

async function loadDashboard() {
    try {
        // Load user profile
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        // Update UI with user data
        document.getElementById('userName').textContent = profile.full_name || 'User';
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userBalance').textContent = (profile.balance || 0).toFixed(2);
        document.getElementById('userPoints').textContent = profile.points || 0;
        
        // Load stats
        await loadOrderStats();
        await loadRecentOrders();
        await loadTicketCount();
        
    } catch (err) {
        console.error('Dashboard load error:', err);
        showToast('Failed to load dashboard', 'error');
    }
}

async function loadOrderStats() {
    const { data: orders } = await supabaseClient
        .from('orders')
        .select('status, amount')
        .eq('user_id', currentUser.id);
    
    if (orders) {
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const totalSpent = orders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + o.amount, 0);
        
        // Animate numbers
        animateValue('totalOrders', 0, total, 1000);
        animateValue('completedOrders', 0, completed, 1000);
        document.getElementById('totalSpent').textContent = '₦' + totalSpent.toLocaleString();
    }
}

async function loadRecentOrders() {
    const { data: orders } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);
    
    const container = document.getElementById('recentOrders');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="empty-state">No orders yet</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <h4>${order.product_name}</h4>
                <p>₦${order.amount.toLocaleString()} • ${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <span class="order-status ${order.status}">${order.status}</span>
        </div>
    `).join('');
}

async function loadTicketCount() {
    const { data: tickets } = await supabaseClient
        .from('tickets')
        .select('id')
        .eq('user_id', currentUser.id)
        .in('status', ['open', 'pending']);
    
    animateValue('openTickets', 0, tickets?.length || 0, 1000);
}

// Animate number counting
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    const range = end - start;
    const minTimer = 50;
    let stepTime = Math.abs(Math.floor(duration / range));
    stepTime = Math.max(stepTime, minTimer);
    
    let startTime = new Date().getTime();
    let endTime = startTime + duration;
    let timer;
    
    function run() {
        let now = new Date().getTime();
        let remaining = Math.max((endTime - now) / duration, 0);
        let value = Math.round(end - (remaining * range));
        obj.textContent = value;
        if (value == end) {
            clearInterval(timer);
        }
    }
    
    timer = setInterval(run, stepTime);
    run();
}

// Real-time updates via Supabase
function setupRealTimeUpdates() {
    supabaseClient
        .channel('orders')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'orders',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                console.log('Order update:', payload);
                loadOrderStats();
                loadRecentOrders();
            }
        )
        .subscribe();
    
    supabaseClient
        .channel('profile')
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${currentUser.id}`
            },
            (payload) => {
                console.log('Profile update:', payload);
                loadDashboard();
            }
        )
        .subscribe();
}

// Update user profile (including username)
async function updateProfile(updates) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Profile updated successfully!', 'success');
        loadDashboard();
    } catch (err) {
        showToast('Failed to update profile: ' + err.message, 'error');
    }
}

async function redeemPoints() {
    const points = parseInt(document.getElementById('userPoints').textContent);
    if (points < 1) {
        showToast('You need at least 1 point to redeem', 'error');
        return;
    }
    
    if (!confirm(`Redeem ${points} points for ₦${points * 100}?`)) return;
    
    try {
        await supabaseClient.from('points_redemptions').insert({
            user_id: currentUser.id,
            points_used: points,
            value_received: points * 100,
            status: 'completed'
        });
        
        await supabaseClient.rpc('add_user_balance', {
            p_user_id: currentUser.id,
            p_amount: points * 100,
            p_reason: 'Points redemption'
        });
        
        showToast(`Redeemed! ₦${points * 100} added to balance.`, 'success');
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
function toggleProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        // Load current profile data
        document.getElementById('profileName').value = document.getElementById('userName').textContent;
        document.getElementById('profileEmail').value = currentUser.email;
        document.getElementById('profilePhone').value = ''; // Load from profile if available
        modal.classList.add('active');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    
    await updateProfile({
        full_name: fullName,
        phone: phone || null
    });
    
    toggleProfileModal();
}
