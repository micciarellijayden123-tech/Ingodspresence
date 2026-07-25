# Ingodspresence Deployment

This repository contains a static frontend and a Node.js backend.

## Public deployment options

### Option 1: Host frontend on GitHub Pages
- The site is already configured for GitHub Pages.
- Frontend URL: `https://micciarellijayden123-tech.github.io/Ingodspresence/`
- This only serves the static site.

### Option 2: Host backend separately
The backend must run on a public server or cloud service so admin/login/products work.

Required environment variables:
- `PORT` (default `3000`)
- `JWT_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `ADMIN_USER` (optional; default is hardcoded to `Jayden Micciarelli`)
- `ADMIN_PASS` (optional; default is hardcoded to `123456`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `NOTIFY_EMAIL` (optional)

### Option 3: Deploy backend in Docker
Build and run locally or on a container host:

```bash
cd server
docker build -t ingodspresence-server .
docker run -d -p 3000:3000 \
  -e JWT_SECRET=your_jwt_secret \
  -e PAYPAL_CLIENT_ID=your_paypal_client_id \
  -e PAYPAL_CLIENT_SECRET=your_paypal_client_secret \
  -e ADMIN_USER="Jayden Micciarelli" \
  -e ADMIN_PASS="123456" \
  ingodspresence-server
```

### Option 4: Use a cloud app platform
- Deploy the `server/` folder to services like Render, Fly.io, Railway, or Heroku.
- Point the frontend admin API URL to the deployed backend.

## Update frontend to use a public backend
Edit `admin.js` and `store.js` if your backend is not on `http://localhost:3000`.

Example:
```js
const API_BASE = 'https://your-backend.example.com';
```

## Local test
1. Start backend:
```bash
cd server
npm install
npm start
```
2. Open frontend:
```bash
cd ..
python3 -m http.server 8000
```
3. Visit:
`http://localhost:8000/admin-login.html`

## Notes
- GitHub Pages cannot host the backend.
- The admin interface will only work when the backend API is reachable from the browser.
