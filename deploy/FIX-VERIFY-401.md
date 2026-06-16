# Fix "401 Unauthorized" on email verify link

Your server forces **HTTPS + password protection**. Email links must work **without login**.

## Step 1 — Add to `~/referal-Hub/.env`

```env
FRONTEND_URL=https://103.21.187.238
API_PUBLIC_URL=https://103.21.187.238

# Use HTTP in emails (avoids https basic-auth on some setups)
VERIFY_EMAIL_BASE_URL=http://103.21.187.238
VERIFY_EMAIL_LINK_HTTP=true
```

Restart API: `pm2 restart referaa-api --update-env`

## Step 2 — Fix Apache (your server uses Apache)

SSH into server:

```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```

Add **before** other rules:

```apache
# Email verify — PUBLIC, no password, no forced HTTPS redirect
<Location "/api/auth/verify-email">
    Require all granted
    Satisfy Any
</Location>

<Location "/verify-email">
    Require all granted
    Satisfy Any
</Location>
```

If you have **SSL redirect** for all HTTP traffic, exclude verify (in same file or `.htaccess`):

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/auth/verify-email [NC]
RewriteCond %{REQUEST_URI} !^/verify-email [NC]
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

If you have **AuthType Basic** on HTTPS, exclude verify:

```apache
<LocationMatch "^/(api/auth/verify-email|verify-email)">
    Satisfy Any
    Require all granted
</LocationMatch>
```

Enable proxy to backend (if not already):

```apache
ProxyPass /api http://127.0.0.1:5001/api
ProxyPassReverse /api http://127.0.0.1:5001/api
```

Reload:

```bash
sudo apache2ctl configtest && sudo systemctl reload apache2
```

## Step 3 — Test

```bash
curl -I "http://103.21.187.238/api/auth/verify-email?token=test"
```

Should return **200** or **400** (HTML page), **NOT 401**.

```bash
curl -Ik "https://103.21.187.238/api/auth/verify-email?token=test"
```

Should also **NOT** be 401 after Apache fix.

## Step 4 — Resend verification email

Old emails may have wrong links. Sign in page → resend, or sign up again.

New link format:

```
http://103.21.187.238/api/auth/verify-email?token=...
```

Clicking it shows **"Email verified"** HTML page (no redirect to password-protected site).
