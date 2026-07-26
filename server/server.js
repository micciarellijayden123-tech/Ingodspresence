const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';
const API_ORIGIN = process.env.API_ORIGIN ? process.env.API_ORIGIN.split(',') : true;

app.use(cors({ origin: API_ORIGIN }));
app.use(bodyParser.json({ limit: '200kb' }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const DB_FILE = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_FILE);

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        desc TEXT,
        img TEXT,
        sizes TEXT,
        inventory TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paypal_id TEXT,
        status TEXT,
        total REAL,
        items TEXT,
        payer_email TEXT,
        raw TEXT,
        created_at TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        created_at TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      )`, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function createAdminUser(username, password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (hashErr, password_hash) => {
      if (hashErr) return reject(hashErr);
      db.run(
        `INSERT INTO admin_users (username, password_hash)
         VALUES (?, ?)
         ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`,
        [username, password_hash],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  });
}

function verifyAdminUser(username, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT password_hash FROM admin_users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(false);
      bcrypt.compare(password, row.password_hash, (compareErr, valid) => {
        if (compareErr) return reject(compareErr);
        resolve(valid);
      });
    });
  });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-z0-9.\-\_]/gi, '_');
    cb(null, safe);
  },
});
const upload = multer({ storage });

function verifyPayPalOrder(orderId) {
  const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('PayPal credentials not set; skipping verification');
    return null;
  }

  const base = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  return axios
    .post(
      `${base}/v1/oauth2/token`,
      new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      {
        auth: { username: clientId, password: clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    .then((tokenResp) => {
      const accessToken = tokenResp.data.access_token;
      return axios.get(`${base}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    })
    .then((orderResp) => orderResp.data)
    .catch((err) => {
      console.error('PayPal verification failed', err?.response?.data || err.message);
      return null;
    });
}

let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function toProductResponse(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    desc: row.desc,
    img: row.img,
    sizes: row.sizes ? JSON.parse(row.sizes) : [],
    inventory: row.inventory ? JSON.parse(row.inventory) : {},
  };
}

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const valid = await verifyAdminUser(username, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(toProductResponse));
  });
});

app.get('/api/admin/products', requireAuth, (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(toProductResponse));
  });
});

app.post('/api/admin/products', requireAuth, (req, res) => {
  const { id, name, price, desc, img, sizes, inventory } = req.body;
  if (!id || !name || typeof price !== 'number') return res.status(400).json({ error: 'Invalid product payload' });
  const sizesJson = JSON.stringify(sizes || []);
  const inventoryJson = JSON.stringify(inventory || {});
  db.run(
    'INSERT INTO products (id, name, price, desc, img, sizes, inventory) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, price, desc || '', img || '', sizesJson, inventoryJson],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to save product' });
      res.json({ ok: true });
    }
  );
});

app.put('/api/admin/products/:id', requireAuth, (req, res) => {
  const { name, price, desc, img, sizes, inventory } = req.body;
  const id = req.params.id;
  if (!name || typeof price !== 'number') return res.status(400).json({ error: 'Invalid product payload' });
  const sizesJson = JSON.stringify(sizes || []);
  const inventoryJson = JSON.stringify(inventory || {});
  db.run(
    'UPDATE products SET name = ?, price = ?, desc = ?, img = ?, sizes = ?, inventory = ? WHERE id = ?',
    [name, price, desc || '', img || '', sizesJson, inventoryJson, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update product' });
      res.json({ ok: true });
    }
  );
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete product' });
    res.json({ ok: true });
  });
});

app.get('/api/admin/orders', requireAuth, (req, res) => {
  db.all('SELECT id, paypal_id, status, total, items, payer_email, created_at FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map((row) => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    })));
  });
});

app.post('/api/upload-image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.post('/api/orders', async (req, res) => {
  const order = req.body;
  if (!order || !order.paypalOrder) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalId = order.paypalOrder.id;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Server misconfigured: PayPal credentials not set.' });
  }
  if (!paypalId) {
    return res.status(400).json({ error: 'Missing PayPal order id for verification.' });
  }

  const verified = await verifyPayPalOrder(paypalId);
  if (!verified) {
    return res.status(400).json({ error: 'PayPal verification failed.' });
  }
  if (verified.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'PayPal order not completed.', status: verified.status });
  }

  const itemsJson = JSON.stringify(order.items || []);
  const total = order.total || cartTotalFromItems(order.items || []);
  const payer_email = (order.paypalOrder.payer && order.paypalOrder.payer.email_address) || null;
  const raw = JSON.stringify(order.paypalOrder);
  const createdAt = new Date().toISOString();

  db.run(
    'INSERT INTO orders (paypal_id, status, total, items, payer_email, raw, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [paypalId, verified.status, total, itemsJson, payer_email, raw, createdAt],
    function (err) {
      if (err) {
        console.error('Failed to save order', err);
        return res.status(500).json({ error: 'Could not save order' });
      }
      sendReceiptEmail(order, paypalId, total).catch((e) => console.warn('Receipt failed', e));
      res.json({ ok: true });
    }
  );
});

app.post('/api/signup', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const normalizedEmail = email.toLowerCase();
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO signups (email, created_at) VALUES (?, ?)',
    [normalizedEmail, createdAt],
    function (err) {
      if (err) {
        console.error('Failed to save signup', err);
        return res.status(500).json({ error: 'Could not save signup' });
      }
      sendSignupEmail(normalizedEmail, createdAt).catch((sendErr) => console.warn('Signup notification failed', sendErr));
      sendSignupConfirmationEmail(normalizedEmail).catch((sendErr) => console.warn('Signup confirmation failed', sendErr));
      res.json({ ok: true });
    }
  );
});

app.get('/api/admin/signups', requireAuth, (req, res) => {
  db.all('SELECT id, email, created_at FROM signups ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

function cartTotalFromItems(items) {
  return (items || []).reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

async function sendReceiptEmail(order, paypalId, total) {
  if (!mailer) return;
  const payerEmail = (order.paypalOrder.payer && order.paypalOrder.payer.email_address) || process.env.NOTIFY_EMAIL;
  if (!payerEmail) return;
  const itemsHtml = (order.items || [])
    .map((i) => `<li>${escapeHtml(i.name)}${i.size ? ` (${escapeHtml(i.size)})` : ''} — ${i.qty} × $${(i.price * i.qty).toFixed(2)}</li>`)
    .join('');
  const html = `<p>Thank you for your Ingodspresence order.</p><p><strong>Order ID:</strong> ${escapeHtml(paypalId)}<br/><strong>Total:</strong> $${total.toFixed(2)}</p><ul>${itemsHtml}</ul><p>We appreciate your support.</p>`;
  const textItems = (order.items || []).map((i) => `- ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty}: $${(i.price * i.qty).toFixed(2)}`).join('\n');
  const text = `Thank you for your Ingodspresence order.\n\nOrder ID: ${paypalId}\nTotal: $${total.toFixed(2)}\n\nItems:\n${textItems}\n\nWe appreciate your support.`;
  await mailer.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: payerEmail,
    subject: `Your Ingodspresence order (${paypalId})`,
    text,
    html,
  });
}

async function sendSignupEmail(email, createdAt) {
  if (!mailer) return;
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!notifyEmail) return;
  const html = `<p>A new signup has been received for Ingodspresence.</p><ul><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Signed up at:</strong> ${escapeHtml(createdAt)}</li></ul>`;
  const text = `New signup received for Ingodspresence.\n\nEmail: ${email}\nSigned up at: ${createdAt}\n`;
  await mailer.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: notifyEmail,
    subject: `New signup: ${email}`,
    text,
    html,
  });
}

async function sendSignupConfirmationEmail(email) {
  if (!mailer) return;
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const html = `<p>Thank you for joining the mission at Ingodspresence.</p><p>We will send you resources and encouragement to help you obey Matthew 28:19.</p><p>Stay tuned for the next update.</p>`;
  const text = `Thank you for joining the mission at Ingodspresence.\n\nWe will send you resources and encouragement to help you obey Matthew 28:19.\n\nStay tuned for the next update.`;
  await mailer.sendMail({
    from: fromEmail,
    to: email,
    subject: 'Welcome to Ingodspresence',
    text,
    html,
  });
}

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

app.listen(PORT, async () => {
  try {
    await initDb();
    await createAdminUser('Jayden Micciarelli', '123456');
    console.log('Admin user ensured: Jayden Micciarelli');
  } catch (err) {
    console.error('Failed to initialize database or admin user', err);
  }
  console.log(`Orders server running on http://localhost:${PORT}`);
});
