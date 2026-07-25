const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'Faith Over Fear Tee',
    price: 28.0,
    desc: 'Soft cotton tee with scripture print',
    img: '',
    options: { sizes: ['S', 'M', 'L'], inventory: { S: 10, M: 8, L: 5 } },
  },
  {
    id: 'p2',
    name: 'Grace & Strength Hoodie',
    price: 42.0,
    desc: 'Comfortable heavyweight hoodie',
    img: '',
    options: { sizes: ['M', 'L'], inventory: { M: 6, L: 4 } },
  },
  {
    id: 'p3',
    name: 'Walk in Faith Cap',
    price: 18.0,
    desc: 'Minimal embroidered cap',
    img: '',
    options: { sizes: [], inventory: {} },
  },
];

let cart = [];
let windowProducts = [];
const savedProducts = localStorage.getItem('products');

function normalizeProduct(product) {
  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : Array.isArray(product.options?.sizes)
    ? product.options.sizes
    : [];
  const inventory = typeof product.inventory === 'object' && product.inventory !== null
    ? product.inventory
    : typeof product.options?.inventory === 'object' && product.options.inventory !== null
    ? product.options.inventory
    : {};
  return { ...product, options: { sizes, inventory } };
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('Product API unavailable');
    }
    const products = await response.json();
    if (Array.isArray(products) && products.length > 0) {
      windowProducts = products.map(normalizeProduct);
      localStorage.setItem('products', JSON.stringify(windowProducts));
      return;
    }
  } catch (err) {
    console.warn('Could not load products from API; falling back to saved products or defaults.', err);
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        if (Array.isArray(parsed)) {
          windowProducts = parsed.map(normalizeProduct);
          return;
        }
      } catch (parseErr) {
        console.warn('Failed to parse local saved products', parseErr);
      }
    }
    windowProducts = DEFAULT_PRODUCTS.map(normalizeProduct);
  }
}

function saveProducts(newProducts) {
  windowProducts = newProducts;
  localStorage.setItem('products', JSON.stringify(windowProducts));
  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCart === 'function') renderCart();
}

function formatPrice(n) {
  return n.toFixed(2);
}

function renderProducts() {
  const el = document.getElementById('products');
  if (!el) return;
  el.innerHTML = '';
  windowProducts.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const img = p.img || `https://via.placeholder.com/600x400?text=${encodeURIComponent(p.name)}`;
    let sizeHtml = '';
    const hasSizes = Array.isArray(p.options?.sizes) && p.options.sizes.length;
    if (hasSizes) {
      sizeHtml = `<label>Size<br><select class="size-select" data-id="${p.id}">`;
      p.options.sizes.forEach((s) => {
        const stock = (p.options.inventory && p.options.inventory[s]) || 0;
        sizeHtml += `<option value="${s}">${s} (${stock} in stock)</option>`;
      });
      sizeHtml += '</select></label>';
    }
    card.innerHTML = `
      <img src="${img}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <p style="font-weight:800;color:var(--primary)">$${formatPrice(p.price)}</p>
      ${sizeHtml}
      <button class="btn btn-primary" data-id="${p.id}">Add to cart</button>
    `;
    el.appendChild(card);
  });

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      addToCart(id);
    });
  });
}

function addToCart(id) {
  const product = windowProducts.find((p) => p.id === id);
  if (!product) return;
  const select = document.querySelector(`.size-select[data-id="${id}"]`);
  const selectedSize = select ? select.value : null;
  if (selectedSize && product.options?.inventory) {
    const available = product.options.inventory[selectedSize] || 0;
    const existingItem = cart.find((item) => item.id === id && item.size === selectedSize);
    const qtyInCart = existingItem ? existingItem.qty : 0;
    if (qtyInCart + 1 > available) {
      alert('Not enough stock for selected size.');
      return;
    }
  }
  const existing = cart.find((c) => c.id === id && c.size === selectedSize);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, size: selectedSize });
  }
  renderCart();
}

function removeFromCart(id, size = null) {
  cart = cart.filter((c) => !(c.id === id && c.size === size));
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl || !totalEl) return;
  itemsEl.innerHTML = '';
  if (cart.length === 0) {
    itemsEl.textContent = 'Your cart is empty.';
  } else {
    cart.forEach((c) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.marginBottom = '0.6rem';
      const sizeLabel = c.size ? ` (${c.size})` : '';
      row.innerHTML = `<div>${c.name}${sizeLabel} × ${c.qty}</div><div>$${formatPrice(c.price * c.qty)}</div>`;
      const rem = document.createElement('button');
      rem.textContent = 'Remove';
      rem.className = 'btn btn-secondary';
      rem.style.marginLeft = '0.6rem';
      rem.addEventListener('click', () => removeFromCart(c.id, c.size));
      row.appendChild(rem);
      itemsEl.appendChild(row);
    });
  }
  totalEl.textContent = formatPrice(cart.reduce((sum, c) => sum + c.price * c.qty, 0));
  renderPayPalButton();
}

function renderPayPalButton() {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';
  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  if (total <= 0) {
    container.textContent = 'Add items to the cart to checkout.';
    return;
  }
  if (typeof paypal === 'undefined') {
    container.textContent = 'PayPal SDK not loaded. Replace client-id in store.html.';
    return;
  }

  paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [
          {
            amount: { value: formatPrice(total) },
            description: 'Ingodspresence order',
          },
        ],
      });
    },
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (details) {
        try {
          const orderPayload = {
            paypalOrder: details,
            items: cart.slice(),
            total,
            createdAt: new Date().toISOString(),
          };
          fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload),
          }).catch((err) => console.warn('Order recording failed:', err));
        } catch (e) {
          console.warn('Error preparing order payload', e);
        }

        cart = [];
        renderCart();
        window.location.href = 'thanks.html';
      });
    },
    onError: function (err) {
      alert('Payment could not be completed. ' + err);
    },
  }).render('#paypal-button-container');
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderProducts();
  renderCart();
});
