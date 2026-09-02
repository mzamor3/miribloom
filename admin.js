import { supabase } from './supabase.js';

let allOrders = [];
let currentAdmin = null;

const ordersBody = document.getElementById('ordersBody');
const adminMessage = document.getElementById('adminMessage');
const statusFilter = document.getElementById('statusFilter');

function showMessage(text) {
  adminMessage.textContent = text;
  adminMessage.style.display = 'block';
}

function hideMessage() {
  adminMessage.style.display = 'none';
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

  currentAdmin = user;
  return true;
}

function fmtMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style:'currency',
    currency:'USD'
  }).format(Number(amount || 0));
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month:'short',
    day:'numeric',
    year:'numeric',
    hour:'numeric',
    minute:'2-digit'
  });
}

function getCustomerName(order) {
  return order.customer_name || order.customer_email || 'Customer';
}

function renderStats(orders) {
  document.getElementById('statTotal').textContent = orders.length;
  document.getElementById('statNew').textContent =
    orders.filter(o => o.fulfillment_status === 'new').length;
  document.getElementById('statPreparing').textContent =
    orders.filter(o => o.fulfillment_status === 'preparing').length;
  document.getElementById('statShipped').textContent =
    orders.filter(o => o.fulfillment_status === 'shipped').length;
}

function renderOrders() {
  const filter = statusFilter.value;
  const rows = filter === 'all'
    ? allOrders
    : allOrders.filter(o => o.fulfillment_status === filter);

  ordersBody.innerHTML = '';

  if (!rows.length) {
    showMessage('No orders match this filter.');
    return;
  }

  hideMessage();

  rows.forEach(order => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(getCustomerName(order))}</strong>
        <small>${escapeHtml(order.customer_email || '')}</small>
      </td>
      <td>${escapeHtml(order.box_type || '—')}</td>
      <td>${fmtMoney(order.amount)}</td>
      <td><span class="status-pill paid">${escapeHtml(order.payment_status || '—')}</span></td>
      <td>${fmtDate(order.created_at)}</td>
      <td>
        <select class="fulfillment-select" data-order-id="${order.id}">
          <option value="new" ${order.fulfillment_status==='new'?'selected':''}>New</option>
          <option value="preparing" ${order.fulfillment_status==='preparing'?'selected':''}>Preparing</option>
          <option value="shipped" ${order.fulfillment_status==='shipped'?'selected':''}>Shipped</option>
          <option value="delivered" ${order.fulfillment_status==='delivered'?'selected':''}>Delivered</option>
        </select>
      </td>
      <td>
        <button class="profile-btn" data-user-id="${order.user_id}" data-customer="${escapeAttr(getCustomerName(order))}">
          View Profile
        </button>
      </td>
    `;

    ordersBody.appendChild(tr);
  });

  document.querySelectorAll('.fulfillment-select').forEach(select => {
    select.addEventListener('change', async () => {
      await updateFulfillment(select.dataset.orderId, select.value);
    });
  });

  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await openBeautyProfile(btn.dataset.userId, btn.dataset.customer);
    });
  });
}

async function updateFulfillment(orderId, value) {
  const { error } = await supabase
    .from('orders')
    .update({
      fulfillment_status:value,
      updated_at:new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    alert('Could not update order: ' + error.message);
    return;
  }

  const row = allOrders.find(o => o.id === orderId);
  if (row) row.fulfillment_status = value;

  renderStats(allOrders);
}

async function openBeautyProfile(userId, customerName) {
  const { data, error } = await supabase
    .from('beauty_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    alert('Could not load Beauty Profile: ' + error.message);
    return;
  }

  const modal = document.getElementById('profileModal');
  const name = document.getElementById('profileModalName');
  const grid = document.getElementById('profileModalGrid');

  name.textContent = customerName || 'Customer';

  if (!data) {
    grid.innerHTML = '<p>No Beauty Profile is saved for this customer.</p>';
  } else {
    const fields = [
      ['Skin Tone', data.skin_tone],
      ['Undertone', data.undertone],
      ['Eye Color', data.eye_color],
      ['Hair Color', data.hair_color],
      ['Skin Type', data.skin_type],
      ['Skin Concern', data.skin_concern],
      ['Makeup Style', data.makeup_style],
      ['Favorite Category', data.favorite_category],
      ['Lip Preference', data.lip_preference],
      ['Hair Type', data.hair_type],
      ['Fragrance', data.fragrance],
    ];

    grid.innerHTML = fields.map(([label,value]) => `
      <div class="profile-field">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || '—')}</strong>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

async function loadOrders() {
  showMessage('Loading orders...');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending:false });

  if (error) {
    showMessage('Could not load orders: ' + error.message);
    return;
  }

  const enriched = [];

  for (const order of orders || []) {
    let customer_name = '';
    let customer_email = '';

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .maybeSingle();

    if (profileRow?.full_name) customer_name = profileRow.full_name;

    enriched.push({
      ...order,
      customer_name,
      customer_email
    });
  }

  allOrders = enriched;
  renderStats(allOrders);
  renderOrders();
}

document.getElementById('refreshOrdersBtn')?.addEventListener('click', loadOrders);
statusFilter?.addEventListener('change', renderOrders);

document.getElementById('profileModalClose')?.addEventListener('click', () => {
  document.getElementById('profileModal')?.classList.add('hidden');
});

document.getElementById('profileModal')?.addEventListener('click', e => {
  if (e.target.id === 'profileModal') {
    e.currentTarget.classList.add('hidden');
  }
});

document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

if (await requireAdmin()) {
  await loadOrders();
}
