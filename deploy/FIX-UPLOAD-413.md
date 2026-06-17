# Fix HTTP 413 on profile photo upload

## What you see

```
HTTP 413 Request Entity Too Large
nginx/1.28.3 (Ubuntu)
```

## Where the error happens

| Layer | Limit | Status |
|-------|-------|--------|
| **nginx** (EC2) | **1 MB default** | **Blocks request — this is your error** |
| Express backend | 30 MB | OK (`apps/backend/src/app.ts`) |
| App validation | 5 MB file | OK (`apps/backend/src/lib/uploads.ts`) |

Upload flow:

1. Browser → `POST /api/users/me/avatar` with JSON `{ data: "<base64>", mimeType: "..." }`
2. **nginx** receives the request first
3. If body > `client_max_body_size` (default **1m**), nginx returns **413** before Node.js runs
4. Backend route `apps/backend/src/routes/users.ts` never executes

Base64 adds ~33% size, so even a **800 KB** photo can exceed nginx’s 1 MB limit.

## Fix on EC2 (nginx)

SSH into the server, then run:

```bash
# See which config file is active
sudo nginx -T 2>/dev/null | grep -E "server_name|client_max_body_size|sites-enabled"

# Edit your site (often one of these):
sudo nano /etc/nginx/sites-available/referaa
# or
sudo nano /etc/nginx/sites-available/default
```

Inside **each** `server { ... }` block (port 80 and 443), add near the top:

```nginx
client_max_body_size 30m;
```

Or paste the full example from `deploy/nginx-referaa.conf.example`.

Then test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

No API restart needed — this is nginx only.

## Quick one-liner (if you use `/etc/nginx/sites-available/referaa`)

```bash
sudo sed -i '/server_name/a\    client_max_body_size 30m;' /etc/nginx/sites-available/referaa
sudo nginx -t && sudo systemctl reload nginx
```

(If the line is added twice, open the file and keep only one `client_max_body_size` per server block.)

## Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1/api/users/me/avatar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"data":"'$(python3 -c "print('A'*2000000)")'","mimeType":"image/jpeg"}'
```

- **401** = reached backend (auth issue — good for size test)
- **413** = nginx limit still too low

## Local dev

`pnpm dev` does not use nginx, so uploads usually work locally. This issue appears on **production EC2** behind nginx.
