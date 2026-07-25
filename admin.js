const API_BASE = 'http://localhost:3000';
const TOKEN_KEY = 'adminToken';
window.products = [];

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'admin-login.html';
    throw new Error('Unauthorized');
  }
  return response;
}

async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || response.statusText || 'Request failed');
  }
  return body;
}

function parseSizes(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInventory(value) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Inventory must be a JSON object.');
    }
    return parsed;
  } catch (err) {
    throw new Error('Inventory must be valid JSON.');
  }
}

function renderAdminList() {
  const list = window.products || [];
  const el = document.getElementById('admin-list');
  el.innerHTML = '';
  if (list.length === 0) {
    el.textContent = 'No products found.';
    return;
  }
  list.forEach((p) => {
    const row = document.createElement('div');
    row.style.borderBottom = '1px solid var(--border)';
    row.style.padding = '0.6rem 0';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem; flex-wrap:wrap;">
        <div>
          <strong>${p.name}</strong>
          <div style="color:var(--muted)">$${(p.price || 0).toFixed(2)}</div>
        </div>
        <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn btn-secondary" data-id="${p.id}" data-action="edit">Edit</button>
          <button class="btn" data-id="${p.id}" data-action="delete">Delete</button>
        </div>
      </div>
    `;
    el.appendChild(row);
  });
}

function renderOrderList(orders) {
  const el = document.getElementById('order-list');
  el.innerHTML = '';
  if (!orders || orders.length === 0) {
    el.textContent = 'No recent orders.';
    return;
  }
  orders.forEach((order) => {
    const card = document.createElement('div');
    card.style.borderBottom = '1px solid var(--border)';
    card.style.padding = '0.8rem 0';
    const items = (order.items || [])
      .map((item) => `<li>${item.name}${item.size ? ` (${item.size})` : ''} × ${item.qty}</li>`)
      .join('');
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <strong>Order #${order.id}</strong>
          <div style="color:var(--muted)">Status: ${order.status}</div>
        </div>
        <div style="text-align:right; min-width:160px;">
          <div><strong>Total:</strong> $${(order.total || 0).toFixed(2)}</div>
          <div>${order.payer_email || 'No email'}</div>
          <div>${new Date(order.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div style="margin-top:0.6rem;">
        <strong>Items</strong>
        <ul style="margin:0.5rem 0 0 1rem; padding:0; list-style:disc;">${items}</ul>
      </div>
    `;
    el.appendChild(card);
  });
}

function clearForm() {
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-desc').value = '';
  document.getElementById('prod-img').value = '';
  document.getElementById('prod-sizes').value = '';
  document.getElementById('prod-inventory').value = '';
}

async function loadProducts() {
  if (!requireAuth()) return;
  try {
    const products = await apiJson('/api/admin/products');
    window.products = Array.isArray(products) ? products : [];
    renderAdminList();
  } catch (err) {
    console.error('Failed to load products:', err);
    const el = document.getElementById('admin-list');
    el.textContent = 'Unable to load products from the server.';
  }
}

async function loadOrders() {
  if (!requireAuth()) return;
  try {
    const orders = await apiJson('/api/admin/orders');
    renderOrderList(orders || []);
  } catch (err) {
    console.error('Failed to load orders:', err);
    const el = document.getElementById('order-list');
    el.textContent = 'Unable to load orders from the server.';
  }
}

async function saveProduct(product, isUpdate) {
  const path = isUpdate ? `/api/admin/products/${product.id}` : '/api/admin/products';
  const method = isUpdate ? 'PUT' : 'POST';
  await apiJson(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
}

async function deleteProduct(id) {
  await apiJson(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function replaceAllProducts(products) {
  const current = window.products || [];
  for (const existing of current) {
    await deleteProduct(existing.id);
  }
  for (const product of products) {
    await saveProduct(product, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadProducts();
  loadOrders();

  const form = document.getElementById('product-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idEl = document.getElementById('prod-id');
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const desc = document.getElementById('prod-desc').value.trim();
    const img = document.getElementById('prod-img').value.trim();
    const sizes = parseSizes(document.getElementById('prod-sizes').value);
    let inventory = {};
    try {
      inventory = parseInventory(document.getElementById('prod-inventory').value);
    } catch (err) {
      return alert(err.message);
    }

    if (!name || Number.isNaN(price)) {
      return alert('Product name and price are required.');
    }

    const product = {
      id: idEl.value || `p${Math.random().toString(36).slice(2, 9)}`,
      name,
      price,
      desc,
      img,
      sizes,
      inventory,
    };

    try {
      await saveProduct(product, Boolean(idEl.value));
      clearForm();
      await loadProducts();
      alert('Product saved successfully.');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + err.message);
    }
  });

  document.getElementById('prod-clear').addEventListener('click', (e) => {
    e.preventDefault();
    clearForm();
  });

  document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'admin-login.html';
  });

  const uploadBtn = document.getElementById('upload-image');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const fileEl = document.getElementById('image-file');
      if (!fileEl || !fileEl.files || fileEl.files.length === 0) {
        return alert('Choose a file first');
      }
      const fd = new FormData();
      fd.append('image', fileEl.files[0]);
      try {
        const response = await apiFetch('/api/upload-image', { method: 'POST', body: fd });
        const data = await response.json();
        if (data && data.url) {
          document.getElementById('prod-img').value = data.url;
          alert('Uploaded. Image URL set in the form.');
        } else {
          alert('Upload failed');
        }
      } catch (err) {
        console.error(err);
        alert('Upload error');
      }
    });
  }

  document.getElementById('admin-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      const product = (window.products || []).find((item) => item.id === id);
      if (!product) return;
      document.getElementById('prod-id').value = product.id;
      document.getElementById('prod-name').value = product.name;
      document.getElementById('prod-price').value = product.price;
      document.getElementById('prod-desc').value = product.desc || '';
      document.getElementById('prod-img').value = product.img || '';
      document.getElementById('prod-sizes').value = Array.isArray(product.sizes) ? product.sizes.join(',') : '';
      document.getElementById('prod-inventory').value = JSON.stringify(product.inventory || {}, null, 2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'delete') {
      if (!confirm('Delete this product?')) return;
      try {
        await deleteProduct(id);
        await loadProducts();
        alert('Product deleted.');
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Delete failed: ' + err.message);
      }
    }
  });

  document.getElementById('export-json').addEventListener('click', () => {
    document.getElementById('import-json').value = JSON.stringify(window.products || [], null, 2);
    alert('Exported current product data to the textarea.');
  });

  document.getElementById('import-btn').addEventListener('click', async () => {
    const raw = document.getElementById('import-json').value.trim();
    if (!raw) return alert('Paste JSON into the textarea first.');
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Expected an array of products.');
      const valid = parsed.every((p) => p.id && p.name && typeof p.price === 'number');
      if (!valid) throw new Error('Each product must contain id, name, and price.');
      if (!confirm('Import will replace current products on the backend. Continue?')) return;
      await replaceAllProducts(parsed);
      await loadProducts();
      alert('Products imported successfully.');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  });

  document.getElementById('download-json').addEventListener('click', () => {
    const data = JSON.stringify(window.products || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
});
