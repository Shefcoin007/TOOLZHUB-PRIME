// Check auth on load
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
  
  // Load stats
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

async function redeemPoints() {
  const points = parseInt(document.getElementById('userPoints').textContent);
  if (points < 1) {
    showToast('You need at least 1 point to redeem', 'error');
    return;
  }
  
  if (!confirm(`Redeem ${points} point(s) for ₦${points * 100}?`)) return;
  
  try {
    // Create redemption record
    const { error } = await supabase.from('points_redemptions').insert({
      user_id: currentUser.id,
      points_used: points,
      value_received: points * 100, // 1 point = ₦100
      status: 'completed'
    });
    
    if (error) throw error;
    
    // Add balance
    await supabase.rpc('increment_balance', {
      user_id: currentUser.id,
      amount: points * 100
    });
    
    showToast(`Successfully redeemed ${points} points!`, 'success');
    loadDashboard(); // Refresh
  } catch (err) {
    showToast('Redemption failed: ' + err.message, 'error');
  }
}

function logout() {
  supabase.auth.signOut();
  window.location.href = 'index.html';
}
