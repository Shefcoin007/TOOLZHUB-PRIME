// Check auth
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    await loadDashboard();
});

async function loadDashboard() {
    // Load profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (profile) {
        document.getElementById('userName').textContent = profile.full_name || 'User';
        document.getElementById('userBalance').textContent = profile.balance?.toFixed(2) || '0.00';
        document.getElementById('userPoints').textContent = profile.points || 0;
    }
    
    await loadOrderStats();
    await loadRecentOrders();
    await loadTicketCount();
}

async function loadOrderStats() {
    const { data: orders } = await supabase
        .from('orders')
        .select('status, amount')
        .eq('user_id', currentUser.id);
    
    if (orders) {
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('completedOrders').textContent = 
            orders.filter(o => o.status === 'completed').length;
        document.getElementById('totalSpent').textContent = '₦' + 
            orders.filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.amount, 0).toLocaleString();
    }
}

async function loadRecentOrders() {
    const { data: orders } = await supabase
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
    const { data: tickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('user_id', currentUser.id)
        .in('status', ['open', 'pending']);
    
    document.getElementById('openTickets').textContent = tickets?.length || 0;
}

async function redeemPoints() {
    const points = parseInt(document.getElementById('userPoints').textContent);
    if (points < 1) {
        showToast('You need at least 1 point to redeem', 'error');
        return;
    }
    
    if (!confirm(`Redeem ${points} point(s) for ₦${points * 100}?`)) return;
    
    try {
        // Create redemption record
        await supabase.from('points_redemptions').insert({
            user_id: currentUser.id,
            points_used: points,
            value_received: points * 100,
            status: 'completed'
        });
        
        // Add balance via RPC
        const { error } = await supabase.rpc('add_balance', {
            user_id: currentUser.id,
            amount: points * 100
        });
        
        if (error) throw error;
        
        showToast(`Successfully redeemed ${points} points!`, 'success');
        loadDashboard();
        
    } catch (err) {
        showToast('Redemption failed: ' + err.message, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}
