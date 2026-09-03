import { supabase } from './supabase.js';

let allOrders = [];
let currentAdmin = null;

const ordersBody = document.getElementById('ordersBody');
const adminMessage = document.getElementById('adminMessage');
const statusFilter = document.getElementById('statusFilter');
const orderSearch = document.getElementById('orderSearch');

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

function formatShipping(order) {
  const lines = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state].filter(Boolean).join(', '),
    order.shipping_postal_code,
    order.shipping_country
  ].filter(Boolean);

  return lines.length ? lines.join(' • ') : '—';
}

function getOrderType(order) {
  if (order.stripe_invoice_id) {
    return {
      key: 'renewal',
      label: 'Monthly Renewal'
    };
  }

  if (order.stripe_subscription_id) {
    return {
      key: 'subscription',
      label: 'New Subscription'
    };
  }

  return {
    key: 'one-time',
    label: 'One-Time Order'
  };
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
  const query = (orderSearch?.value || '').trim().toLowerCase();

  let rows = filter === 'all'
    ? [...allOrders]
    : allOrders.filter(o => o.fulfillment_status === filter);

  if (query) {
    rows = rows.filter(order => {
      const searchable = [
        order.id,
        order.customer_name,
        order.customer_email,
        order.box_type,
        getOrderType(order).label,
        order.payment_status,
        order.fulfillment_status,
        order.shipping_carrier,
        order.tracking_number,
        order.shipping_address_line1,
        order.shipping_address_line2,
        order.shipping_city,
        order.shipping_state,
        order.shipping_postal_code,
        order.shipping_country
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }

  ordersBody.innerHTML = '';

  if (!rows.length) {
    showMessage(query ? 'No orders match your search.' : 'No orders match this filter.');
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
      <td class="shipping-cell">${escapeHtml(formatShipping(order))}</td>
      <td>${escapeHtml(order.box_type || '—')}</td>
      <td>
        ${(() => {
          const type = getOrderType(order);
          return `<span class="order-type-badge order-type-${type.key}">${escapeHtml(type.label)}</span>`;
        })()}
      </td>
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
        <button class="tracking-btn"
                data-order-id="${order.id}"
                data-carrier="${escapeAttr(order.shipping_carrier || '')}"
                data-number="${escapeAttr(order.tracking_number || '')}"
                data-url="${escapeAttr(order.tracking_url || '')}">
          ${order.tracking_number ? 'Edit Tracking' : 'Add Tracking'}
        </button>
        ${order.tracking_number ? `<small class="tracking-summary">${escapeHtml(order.shipping_carrier || '')} ${escapeHtml(order.tracking_number)}</small>` : ''}
      </td>
      <td>
        <button class="order-detail-btn" data-order-id="${order.id}">
          View Order
        </button>
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
      const orderId = select.dataset.orderId;
      const newValue = select.value;
      const row = allOrders.find(o => o.id === orderId);
      const previousValue = row?.fulfillment_status || 'new';

      select.disabled = true;

      const ok = await updateFulfillment(orderId, newValue, previousValue);

      if (!ok) {
        select.value = previousValue;
      }

      select.disabled = false;
    });
  });

  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await openBeautyProfile(btn.dataset.userId, btn.dataset.customer);
    });
  });

  document.querySelectorAll('.tracking-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openTrackingModal(
        btn.dataset.orderId,
        btn.dataset.carrier,
        btn.dataset.number,
        btn.dataset.url
      );
    });
  });

  document.querySelectorAll('.order-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openOrderDetail(btn.dataset.orderId);
    });
  });
}

async function sendShippingEmail(orderId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('Could not read your admin session.');
  }

  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('Your admin session expired. Please log out and log in again.');
  }

  const response = await fetch(
    'https://kpyhtvymgfsrrhijyyjs.supabase.co/functions/v1/send-shipping-email',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order_id: orderId })
    }
  );

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Shipping email failed (${response.status})`
    );
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}


async function sendDeliveredEmail(orderId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('Could not read your admin session.');
  }

  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error('Your admin session expired. Please log out and log in again.');
  }

  const response = await fetch(
    'https://kpyhtvymgfsrrhijyyjs.supabase.co/functions/v1/send-delivered-email-v2',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        admin_token: token
      })
    }
  );

  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Delivered email failed (${response.status})`
    );
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

async function updateFulfillment(orderId, value, previousValue) {
  const updatePayload = {
    fulfillment_status: value,
    updated_at: new Date().toISOString()
  };

  if (value === 'shipped' && previousValue !== 'shipped') {
    updatePayload.shipped_at = new Date().toISOString();
  }

  if (value === 'delivered' && previousValue !== 'delivered') {
    updatePayload.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (error) {
    alert('Could not update order: ' + error.message);
    return false;
  }

  const row = allOrders.find(o => o.id === orderId);
  if (row) row.fulfillment_status = value;

  renderStats(allOrders);

  if (value === 'shipped' && previousValue !== 'shipped') {
    try {
      await sendShippingEmail(orderId);
      alert('Order marked Shipped and shipping email sent ✓');
    } catch (err) {
      console.error(err);
      alert(
        'Order was marked Shipped, but the email could not be sent: ' +
        (err.message || 'Unknown error')
      );
    }
  }

  if (value === 'delivered' && previousValue !== 'delivered') {
    try {
      await sendDeliveredEmail(orderId);
      alert('Order marked Delivered and delivery email sent ✓');
    } catch (err) {
      console.error(err);
      alert(
        'Order was marked Delivered, but the email could not be sent: ' +
        (err.message || 'Unknown error')
      );
    }
  }

  return true;
}



function formatDateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month:'short',
    day:'numeric',
    year:'numeric',
    hour:'numeric',
    minute:'2-digit'
  });
}

function orderDetailField(label, value) {
  return `
    <div class="order-detail-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || '—')}</strong>
    </div>
  `;
}

function openOrderDetail(orderId) {
  const order = allOrders.find(o => o.id === orderId);

  if (!order) {
    alert('Order not found.');
    return;
  }

  const modal = document.getElementById('orderDetailModal');
  const title = document.getElementById('orderDetailTitle');
  const grid = document.getElementById('orderDetailGrid');
  const profileBtn = document.getElementById('orderDetailProfileBtn');

  title.textContent = order.box_type || 'MiriBloom Order';

  const shippingAddress = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state].filter(Boolean).join(', '),
    order.shipping_postal_code,
    order.shipping_country
  ].filter(Boolean).join(' • ') || '—';

  grid.innerHTML = `
    <div class="order-detail-section">
      <h3>Customer</h3>
      <div class="order-detail-section-grid">
        ${orderDetailField('Name', order.customer_name)}
        ${orderDetailField('Email', order.customer_email)}
        ${orderDetailField('Shipping Address', shippingAddress)}
      </div>
    </div>

    <div class="order-detail-section">
      <h3>Order</h3>
      <div class="order-detail-section-grid">
        ${orderDetailField('Order ID', order.id)}
        ${orderDetailField('Box', order.box_type)}
        ${orderDetailField('Order Type', getOrderType(order).label)}
        ${orderDetailField('Amount', fmtMoney(order.amount))}
        ${orderDetailField('Payment Status', order.payment_status)}
        ${orderDetailField('Fulfillment', order.fulfillment_status)}
        ${orderDetailField('Order Date', formatDateOnly(order.created_at))}
      </div>
    </div>

    <div class="order-detail-section">
      <h3>Tracking</h3>
      <div class="order-detail-section-grid">
        ${orderDetailField('Carrier', order.shipping_carrier)}
        ${orderDetailField('Tracking Number', order.tracking_number)}
        ${orderDetailField('Tracking URL', order.tracking_url)}
        ${orderDetailField('Shipped At', formatDateOnly(order.shipped_at))}
        ${orderDetailField('Delivered At', formatDateOnly(order.delivered_at))}
      </div>
      ${
        order.tracking_url
          ? `<a class="order-detail-track-link"
                href="${escapeAttr(order.tracking_url)}"
                target="_blank"
                rel="noopener noreferrer">Track Package</a>`
          : ''
      }
    </div>
  `;

  profileBtn.dataset.userId = order.user_id || '';
  profileBtn.dataset.customer = getCustomerName(order);

  modal?.classList.remove('hidden');
}

function closeOrderDetail() {
  document.getElementById('orderDetailModal')?.classList.add('hidden');
}

document.getElementById('orderDetailClose')?.addEventListener('click', closeOrderDetail);
document.getElementById('orderDetailDoneBtn')?.addEventListener('click', closeOrderDetail);

document.getElementById('orderDetailModal')?.addEventListener('click', e => {
  if (e.target.id === 'orderDetailModal') {
    closeOrderDetail();
  }
});

document.getElementById('orderDetailProfileBtn')?.addEventListener('click', async e => {
  const btn = e.currentTarget;
  closeOrderDetail();
  await openBeautyProfile(btn.dataset.userId, btn.dataset.customer);
});

function openTrackingModal(orderId, carrier = '', number = '', url = '') {
  document.getElementById('trackingOrderId').value = orderId || '';
  document.getElementById('trackingCarrier').value = carrier || '';
  document.getElementById('trackingNumber').value = number || '';
  document.getElementById('trackingUrl').value = url || '';
  document.getElementById('trackingMessage').style.display = 'none';
  document.getElementById('trackingModal')?.classList.remove('hidden');
}

function closeTrackingModal() {
  document.getElementById('trackingModal')?.classList.add('hidden');
}

async function saveTracking() {
  const orderId = document.getElementById('trackingOrderId').value;
  const carrier = document.getElementById('trackingCarrier').value.trim();
  const number = document.getElementById('trackingNumber').value.trim();
  const url = document.getElementById('trackingUrl').value.trim();
  const message = document.getElementById('trackingMessage');

  if (!orderId) return;

  if (!number) {
    message.style.display = 'block';
    message.textContent = 'Please enter a tracking number.';
    return;
  }

  message.style.display = 'block';
  message.textContent = 'Saving tracking information...';

  const { error } = await supabase
    .from('orders')
    .update({
      shipping_carrier: carrier || null,
      tracking_number: number,
      tracking_url: url || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    message.textContent = 'Could not save tracking: ' + error.message;
    return;
  }

  const row = allOrders.find(o => o.id === orderId);
  if (row) {
    row.shipping_carrier = carrier || null;
    row.tracking_number = number;
    row.tracking_url = url || null;
  }

  message.textContent = 'Tracking saved ✓';

  setTimeout(() => {
    closeTrackingModal();
    renderOrders();
  }, 500);
}

document.getElementById('saveTrackingBtn')?.addEventListener('click', saveTracking);
document.getElementById('cancelTrackingBtn')?.addEventListener('click', closeTrackingModal);
document.getElementById('trackingModalClose')?.addEventListener('click', closeTrackingModal);

document.getElementById('trackingModal')?.addEventListener('click', e => {
  if (e.target.id === 'trackingModal') {
    closeTrackingModal();
  }
});

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

  allOrders = orders || [];
  renderStats(allOrders);
  renderOrders();
}

document.getElementById('refreshOrdersBtn')?.addEventListener('click', loadOrders);
statusFilter?.addEventListener('change', renderOrders);
orderSearch?.addEventListener('input', renderOrders);

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