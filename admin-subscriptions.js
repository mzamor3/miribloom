import { supabase } from './supabase.js';

let allSubscriptions = [];

const body = document.getElementById('subscriptionsBody');
const message = document.getElementById('subscriptionMessage');
const searchInput = document.getElementById('subscriptionSearch');
const statusFilter = document.getElementById('subscriptionStatusFilter');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString(undefined, {
    month:'short',
    day:'numeric',
    year:'numeric'
  });
}

function statusLabel(status) {
  const labels = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Payment due',
    unpaid: 'Unpaid',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired'
  };

  return labels[status] || status || '—';
}

async function requireAdmin() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    window.location.href = 'login.html';
    return false;
  }

  const { data: adminRow, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !adminRow) {
    document.body.innerHTML = `
      <main style="font-family:Arial,sans-serif;max-width:700px;margin:80px auto;padding:24px">
        <h1>Access denied</h1>
        <p>This page is for MiriBloom administrators only.</p>
        <a href="account.html">Return to My Account</a>
      </main>
    `;
    return false;
  }

  return true;
}

function renderStats() {
  document.getElementById('statTotal').textContent =
    allSubscriptions.length;

  document.getElementById('statActive').textContent =
    allSubscriptions.filter(s =>
      s.status === 'active' || s.status === 'trialing'
    ).length;

  document.getElementById('statMini').textContent =
    allSubscriptions.filter(s => s.box_type === 'Bloom Mini').length;

  document.getElementById('statBox').textContent =
    allSubscriptions.filter(s => s.box_type === 'Bloom Box').length;
}

function renderSubscriptions() {
  const query = (searchInput?.value || '').trim().toLowerCase();
  const filter = statusFilter?.value || 'all';

  let rows = [...allSubscriptions];

  if (filter !== 'all') {
    rows = rows.filter(row => row.status === filter);
  }

  if (query) {
    rows = rows.filter(row => {
      const searchable = [
        row.customer_name,
        row.customer_email,
        row.box_type,
        row.status,
        row.stripe_subscription_id,
        row.stripe_customer_id
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }

  body.innerHTML = '';

  if (!rows.length) {
    message.style.display = 'block';
    message.textContent =
      query ? 'No subscriptions match your search.' :
      'No subscriptions match this filter.';
    return;
  }

  message.style.display = 'none';

  rows.forEach(row => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(row.customer_name || 'Customer')}</strong>
        <small>${escapeHtml(row.customer_email || '')}</small>
      </td>

      <td>
        <strong>${escapeHtml(row.box_type || '—')}</strong>
        <small>${row.box_type === 'Bloom Mini' ? '$15/month' :
          row.box_type === 'Bloom Box' ? '$29/month' : ''}</small>
      </td>

      <td>
        <span class="subscription-status-pill status-${escapeHtml(row.status || '')}">
          ${escapeHtml(statusLabel(row.status))}
        </span>
      </td>

      <td>${escapeHtml(formatDate(row.current_period_end))}</td>

      <td>
        ${row.cancel_at_period_end
          ? '<span class="canceling-badge">Yes</span>'
          : '<span class="not-canceling">No</span>'}
      </td>

      <td>
        <code class="subscription-id">
          ${escapeHtml(row.stripe_subscription_id || '—')}
        </code>
      </td>
    `;

    body.appendChild(tr);
  });
}

async function loadSubscriptions() {
  message.style.display = 'block';
  message.textContent = 'Loading subscriptions...';

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending:false });

  if (error) {
    message.textContent =
      'Could not load subscriptions: ' + error.message;
    return;
  }

  allSubscriptions = data || [];

  renderStats();
  renderSubscriptions();
}

searchInput?.addEventListener('input', renderSubscriptions);
statusFilter?.addEventListener('change', renderSubscriptions);
document
  .getElementById('refreshSubscriptionsBtn')
  ?.addEventListener('click', loadSubscriptions);

document
  .getElementById('adminLogoutBtn')
  ?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

if (await requireAdmin()) {
  await loadSubscriptions();
}
