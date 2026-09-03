import { supabase } from './supabase.js';

let currentUser = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function orderStatusLabel(status) {
  const labels = {
    new: 'Order received',
    preparing: 'Preparing your Bloom',
    shipped: 'Shipped',
    delivered: 'Delivered'
  };
  return labels[status] || 'Order received';
}

function orderProgress(status) {
  const steps = ['new', 'preparing', 'shipped', 'delivered'];
  const index = Math.max(0, steps.indexOf(status));
  return ((index + 1) / steps.length) * 100;
}

function formatOrderDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatStatusDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function loadMember() {
  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData?.user) {
    window.location.href = 'login.html';
    return false;
  }

  currentUser = userData.user;

  let name = 'Member';

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (profileRow?.full_name?.trim()) {
    name = profileRow.full_name.trim();
  } else if (currentUser.user_metadata?.full_name?.trim()) {
    name = currentUser.user_metadata.full_name.trim();
  } else if (currentUser.user_metadata?.name?.trim()) {
    name = currentUser.user_metadata.name.trim();
  }

  const memberName = document.getElementById('memberName');
  if (memberName) memberName.textContent = name;

  return true;
}

function renderTracking(order) {
  const hasTracking =
    order.tracking_number ||
    order.shipping_carrier ||
    order.tracking_url;

  const hasDates =
    order.shipped_at ||
    order.delivered_at;

  if (!hasTracking && !hasDates) {
    return '';
  }

  const carrier = order.shipping_carrier
    ? `<div><span>Carrier</span><strong>${escapeHtml(order.shipping_carrier)}</strong></div>`
    : '';

  const number = order.tracking_number
    ? `<div><span>Tracking number</span><strong>${escapeHtml(order.tracking_number)}</strong></div>`
    : '';

  const shippedDate = order.shipped_at
    ? `<div><span>Shipped</span><strong>${escapeHtml(formatStatusDate(order.shipped_at))}</strong></div>`
    : '';

  const deliveredDate = order.delivered_at
    ? `<div><span>Delivered</span><strong>${escapeHtml(formatStatusDate(order.delivered_at))}</strong></div>`
    : '';

  const trackButton = order.tracking_url
    ? `
      <a class="customer-track-btn"
         href="${escapeAttr(order.tracking_url)}"
         target="_blank"
         rel="noopener noreferrer">
        Track Package
      </a>`
    : '';

  return `
    <div class="customer-tracking-box">
      <div class="customer-tracking-head">
        <div>
          <span class="tracking-kicker">Shipping details</span>
          <strong>Package Tracking</strong>
        </div>
        ${trackButton}
      </div>

      <div class="customer-tracking-grid">
        ${carrier}
        ${number}
        ${shippedDate}
        ${deliveredDate}
      </div>
    </div>
  `;
}

async function loadMyOrders() {
  const list = document.getElementById('myOrdersList');
  const message = document.getElementById('myOrdersMessage');

  if (!list || !currentUser) return;

  if (message) {
    message.style.display = 'block';
    message.textContent = 'Loading your orders...';
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      box_type,
      amount,
      payment_status,
      fulfillment_status,
      created_at,
      shipping_carrier,
      tracking_number,
      tracking_url,
      shipped_at,
      delivered_at
    `)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (message) {
      message.style.display = 'block';
      message.textContent = 'Could not load your orders: ' + error.message;
    }
    return;
  }

  if (!data?.length) {
    if (message) message.style.display = 'none';
    list.innerHTML = `
      <div class="empty-orders-card">
        <div class="empty-orders-heart">♡</div>
        <h3>No Bloom orders yet</h3>
        <p>When you purchase a Bloom Mini or Bloom Box, your order will appear here.</p>
        <a class="primary-btn order-shop-btn" href="purchase.html">Choose Your Bloom</a>
      </div>`;
    return;
  }

  if (message) message.style.display = 'none';

  list.innerHTML = data.map(order => {
    const status = order.fulfillment_status || 'new';
    const progress = orderProgress(status);
    const steps = ['new', 'preparing', 'shipped', 'delivered'];
    const current = Math.max(0, steps.indexOf(status));

    return `
      <article class="customer-order-card">
        <div class="customer-order-top">
          <div>
            <span class="order-date">${escapeHtml(formatOrderDate(order.created_at))}</span>
            <h3>${escapeHtml(order.box_type || 'MiriBloom Order')}</h3>
          </div>
          <div class="order-amount">$${Number(order.amount || 0).toFixed(2)}</div>
        </div>

        <div class="customer-order-status">
          <div class="order-status-row">
            <strong>${escapeHtml(orderStatusLabel(status))}</strong>
            <span>${order.payment_status === 'paid' ? 'Paid ✓' : escapeHtml(order.payment_status || '')}</span>
          </div>

          <div class="order-progress-track">
            <span style="width:${progress}%"></span>
          </div>

          <div class="order-progress-labels">
            <span class="${current >= 0 ? 'active' : ''}">Received</span>
            <span class="${current >= 1 ? 'active' : ''}">Preparing</span>
            <span class="${current >= 2 ? 'active' : ''}">Shipped</span>
            <span class="${current >= 3 ? 'active' : ''}">Delivered</span>
          </div>
        </div>

        ${renderTracking(order)}
      </article>`;
  }).join('');
}

document.getElementById('memberTrigger')?.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('memberDropdown')?.classList.toggle('open');
});

document.addEventListener('click', () => {
  document.getElementById('memberDropdown')?.classList.remove('open');
});

document.getElementById('memberDropdown')?.addEventListener('click', e => e.stopPropagation());

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

document.getElementById('refreshMyOrders')?.addEventListener('click', loadMyOrders);

if (await loadMember()) {
  await loadMyOrders();
}
