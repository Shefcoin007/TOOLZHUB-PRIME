// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard loading...');
    
    // Check authentication
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        console.log('No session, redirecting to index');
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    console.log('User authenticated:', currentUser.email);
    
    // Load dashboard data
    await loadDashboard();
    
    // Setup real-time updates
    setupRealTimeUpdates();
});

async function loadDashboard() {
    try {
        console.log('Loading dashboard for user:', currentUser.id);
        
        // Load user profile from Supabase
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profileError) {
            console.error('Error loading profile:', profileError);
            // Create profile if doesn't exist
            await createProfile();
            return;
        }
        
        console.log('Profile loaded:', profile);
        
        // Update UI elements
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        const userBalanceEl = document.getElementById('userBalance');
        const userPointsEl = document.getElementById('userPoints');
        
        if (userNameEl) userNameEl.textContent = profile.full_name || currentUser.email.split('@')[0];
        if (userEmailEl) userEmailEl.textContent = currentUser.email;
        if (userBalanceEl) userBalanceEl.textContent = (profile.balance || 0).toFixed(2);
        if (userPointsEl) userPointsEl.textContent = profile.points || 0;
        
        // Load stats
        await loadOrderStats();
        await loadRecentOrders();
        await loadTicketCount();
        
    } catch (err) {
        console.error('Dashboard load error:', err);
        showToast('Failed to load dashboard data', 'error');
    }
}

async function createProfile() {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .insert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
                balance: 0,
                points: 0
            });
        
        if (error) throw error;
        
        console.log('Profile created successfully');
        loadDashboard(); // Reload after creation
    } catch (err) {
        console.error('Error creating profile:', err);
    }
}

async function loadOrderStats() {
    try {
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('status, amount')
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        const total = orders?.length || 0;
        const completed = orders?.filter(o => o.status === 'completed').length || 0;
        const totalSpent = orders
            ?.filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + o.amount, 0) || 0;
        
        // Update DOM elements safely
        const totalOrdersEl = document.getElementById('totalOrders');
        const completedOrdersEl = document.getElementById('completedOrders');
        const totalSpentEl = document.getElementById('totalSpent');
        
        if (totalOrdersEl) totalOrdersEl.textContent = total;
        if (completedOrdersEl) completedOrdersEl.textContent = completed;
        if (totalSpentEl) totalSpentEl.textContent = '₦' + totalSpent.toLocaleString();
        
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadRecentOrders() {
    try {
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('recentOrders');
        if (!container) return;
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No orders yet</p>
                    <a href="marketplace.html" class="btn-primary" style="margin-top: 16px; display: inline-block;">
                        <i class="fas fa-shopping-bag"></i> Browse Products
                    </a>
                </div>
            `;
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
        
    } catch (err) {
        console.error('Error loading orders:', err);
    }
}

async function loadTicketCount() {
    try {
        const { data: tickets } = await supabaseClient
            .from('tickets')
            .select('id')
            .eq('user_id', currentUser.id)
            .in('status', ['open', 'pending']);
        
        const openTicketsEl = document.getElementById('openTickets');
        if (openTicketsEl) {
            openTicketsEl.textContent = tickets?.length || 0;
        }
    } catch (err) {
        console.error('Error loading tickets:', err);
    }
}

function setupRealTimeUpdates() {
    // Subscribe to orders changes
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
    
    // Subscribe to profile changes
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

async function redeemPoints() {
    const pointsEl = document.getElementById('userPoints');
    const points = parseInt(pointsEl?.textContent || '0');
    
    if (points < 1) {
        showToast('You need at least 1 point to redeem', 'error');
        return;
    }
    
    if (!confirm(`Redeem ${points} points for ₦${points * 100}?`)) return;
    
    try {
        // Create redemption record
        await supabaseClient.from('points_redemptions').insert({
            user_id: currentUser.id,
            points_used: points,
            value_received: points * 100,
            status: 'completed'
        });
        
        // Add balance via RPC or direct update
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('balance')
            .eq('id', currentUser.id)
            .single();
        
        await supabaseClient
            .from('profiles')
            .update({ 
                balance: (profile?.balance || 0) + (points * 100),
                points: 0
            })
            .eq('id', currentUser.id);
        
        showToast(`Redeemed! ₦${points * 100} added to balance.`, 'success');
        loadDashboard();
        
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('profileName')?.value;
    const phone = document.getElementById('profilePhone')?.value;
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                full_name: fullName,
                phone: phone || null
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Profile updated successfully!', 'success');
        toggleProfileModal();
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

function toggleProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        // Load current data
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        
        document.getElementById('profileName').value = userNameEl?.textContent || '';
        document.getElementById('profileEmail').value = userEmailEl?.textContent || '';
        document.getElementById('profilePhone').value = '';
        
        modal.classList.add('active');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
