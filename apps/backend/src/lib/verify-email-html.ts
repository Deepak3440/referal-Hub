function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Referaa</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #f8fafc; color: #1e293b; padding: 24px;
    }
    .card {
      max-width: 420px; width: 100%; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 16px; padding: 32px 28px; text-align: center; box-shadow: 0 8px 30px rgba(15,23,42,.06);
    }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: #157E9A; color: #fff;
      display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; margin-bottom: 16px; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    p { margin: 0; color: #64748b; line-height: 1.55; font-size: 0.95rem; }
    .email { color: #157E9A; font-weight: 600; word-break: break-all; }
    .ok { color: #22c55e; font-size: 42px; margin-bottom: 8px; }
    .err { color: #ef4444; font-size: 42px; margin-bottom: 8px; }
    a.btn {
      display: inline-block; margin-top: 20px; padding: 10px 18px; background: #157E9A; color: #fff !important;
      text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`;
}

export function renderVerifyEmailSuccess(email: string, signInUrl: string): string {
  return page(
    "Email verified",
    `<div class="logo">R</div>
     <div class="ok">✓</div>
     <h1>Email verified</h1>
     <p>Your account <span class="email">${escapeHtml(email)}</span> is verified.</p>
     <p style="margin-top:12px">You can sign in to Referaa now.</p>
     <a class="btn" href="${escapeHtml(signInUrl)}">Go to sign in</a>`,
  );
}

export function renderVerifyEmailError(
  reason: "invalid" | "expired" | "server",
  signInUrl: string,
): string {
  const message =
    reason === "expired"
      ? "This verification link has expired. Request a new one from the sign-in page."
      : reason === "invalid"
        ? "This verification link is invalid or was already used."
        : "Something went wrong. Please try again or request a new link.";

  return page(
    "Verification failed",
    `<div class="logo">R</div>
     <div class="err">✕</div>
     <h1>Could not verify</h1>
     <p>${escapeHtml(message)}</p>
     <a class="btn" href="${escapeHtml(signInUrl)}">Go to sign in</a>`,
  );
}
