# Ingodspresence Orders Server

This is a minimal Node/Express example that records PayPal orders to a local `orders.json` file.

Usage (local testing):

1. Change to the `server` directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

The server listens on port `3000` by default and exposes:
- `POST /api/orders` — record an order (expects JSON payload)
- `GET /api/orders` — list saved orders

Additional endpoints:
- `POST /api/upload-image` — accepts `multipart/form-data` with field `image` and stores file in `server/uploads`, returns `{ url: '/uploads/filename' }`.

Environment variables (required for secure operation):
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` — REQUIRED for server-side PayPal order verification. Also set `PAYPAL_ENV` to `sandbox` or `live` (default `sandbox`). The server will reject orders if these are not set.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` — to enable sending email receipts via SMTP (optional but recommended).
- `NOTIFY_EMAIL` — fallback recipient for receipts if payer email not available.

To test PayPal flow locally:
1. In `../store.html` replace the PayPal SDK URL `client-id` with `sb` (sandbox):

```html
<script src="https://www.paypal.com/sdk/js?client-id=sb&currency=USD" defer></script>
```

2. Create sandbox REST API credentials in your PayPal developer dashboard and set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in your environment before starting the server. The server will use these credentials to verify that the client-side captured payment was actually completed.

To enable image uploads from the admin UI, POST files to `http://localhost:3000/api/upload-image` using the form field name `image`.

Security note: This example is intentionally minimal for local testing. For production you should:
- Add authentication and validation
- Use a real database instead of a flat file
- Verify PayPal orders server-side using PayPal APIs
