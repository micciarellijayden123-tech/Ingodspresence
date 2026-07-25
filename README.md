# Ingodspresence Website

This project contains:

- Static frontend pages (`index.html`, `store.html`, `admin.html`, etc.)
- A Node.js backend in `server/` for admin auth, orders, image uploads, and PayPal verification
- GitHub Pages deployment support for the frontend
- Deployment prep for a free backend host

## Free hosting setup

### Frontend (free)
Use GitHub Pages to host the static site for free.

- GitHub Pages URL: `https://micciarellijayden123-tech.github.io/Ingodspresence/`
- The frontend is already configured with `.github/workflows/pages.yml`

### Backend (free)
You can host the backend on a free platform like Render, Railway, or Fly.io.

Recommended: Render Free Service

#### Render deployment
1. Create a free Render account.
2. Connect the GitHub repo: `micciarellijayden123-tech/Ingodspresence`.
3. Create a new Web Service using `render.yaml`.
4. Set environment variables in Render:
   - `JWT_SECRET`
   - `ADMIN_USER` (optional, default `Jayden Micciarelli`)
   - `ADMIN_PASS` (optional, default `123456`)
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV` (`sandbox` or `live`)
   - Optional email vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `NOTIFY_EMAIL`

#### Link frontend to backend
Edit `config.js` with your deployed backend URL:

```js
window.APP_CONFIG = {
  API_BASE: 'https://your-backend.onrender.com',
};
```

Then use the frontend normally. The admin login will connect to the hosted backend.

## Local testing

1. Start backend:
```bash
cd server
npm install
npm start
```

2. Serve frontend locally:
```bash
cd ..
python3 -m http.server 8000
```

3. Open:
`http://localhost:8000/admin-login.html`

### Default admin credentials
- Username: `Jayden Micciarelli`
- Password: `123456`

## Notes
- GitHub Pages only hosts the frontend. The backend must be hosted separately.
- This repo now includes `server/Procfile`, `server/Dockerfile`, `server/.dockerignore`, and `render.yaml` for deployment.
