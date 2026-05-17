document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    await loadTickets();
});

async function createTicket(e) {
    e.preventDefault();
    
    const subject = document.getElementById('ticketSubject')?.value;
    const priority = document.getElementById('ticketPriority')?.value;
    const message = document.getElementById('ticketMessage')?.value;
    
    if (!subject || !message) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .insert({
                user_id: currentUser.id,
                subject,
                message,
                priority,
                status: 'open'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Ticket created! We\'ll respond soon.', 'success');
        document.getElementById('ticketForm')?.reset();
        loadTickets();
        
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

async function loadTickets() {
    try {
        const { data: tickets } = await supabaseClient
            .from('tickets')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        const container = document.getElementById('ticketsList');
        if (!container) return;
        
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p class="empty-state">No tickets yet</p>';
            return;
        }
        
        container.innerHTML = tickets.map(t => `
            <div class="ticket-item" onclick="openTicket('${t.id}')">
                <div class="ticket-header">
                    <strong>${t.subject}</strong>
                    <span class="priority-badge ${t.priority}">${t.priority}</span>
                </div>
                <p class="ticket-preview">${t.message.substring(0, 100)}${t.message.length > 100 ? '...' : ''}</p>
                <div class="ticket-meta">
                    <span class="status-badge ${t.status}">${t.status}</span>
                    <small>${new Date(t.created_at).toLocaleDateString()}</small>
                    ${t.admin_response ? '<span class="has-reply">✓ Admin replied</span>' : ''}
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Error loading tickets:', err);
        document.getElementById('ticketsList').innerHTML = '<p class="error">Failed to load tickets</p>';
    }
}

async function openTicket(ticketId) {
    // For now, just alert - you can create a modal later
    const { data: ticket } = await supabaseClient
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
    
    alert(`Ticket: ${ticket.subject}\nStatus: ${ticket.status}\n\n${ticket.message}`);
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// Expose functions
window.createTicket = createTicket;
window.openTicket = openTicket;
window.logout = logout;
