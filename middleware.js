// SwiftLoop — admin path protection (Vercel Routing Middleware)
// Runs on the Edge before any static file is served. Gates /admin and the
// internal /brand tools behind a password, serving an on-brand login page.
//
// Password: set ADMIN_PASSWORD in the Vercel project env to override the
// default below. Cookie is HttpOnly so the static pages themselves are never
// exposed to an unauthenticated request.

export const config = {
  matcher: ['/admin', '/admin.html', '/admin/:path*', '/brand/:path*'],
};

const PASSWORD = process.env.ADMIN_PASSWORD || 'sl2026';
const COOKIE = 'sl_admin';
const TOKEN = 'sl-console-9f3a2c7e-ok'; // opaque session marker
const MAX_AGE = 60 * 60 * 12; // 12 hours

function isProtected(pathname) {
  return (
    pathname === '/admin' ||
    pathname === '/admin.html' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/brand/')
  );
}

function hasValidCookie(request) {
  const raw = request.headers.get('cookie') || '';
  return raw.split(/;\s*/).some(function (c) {
    return c === COOKIE + '=' + TOKEN;
  });
}

function cookieHeader(url, value, maxAge) {
  const secure = url.protocol === 'https:' ? ' Secure;' : '';
  return (
    COOKIE + '=' + value + '; Path=/; HttpOnly;' + secure +
    ' SameSite=Lax; Max-Age=' + maxAge
  );
}

function redirect(url, to, cookie) {
  const headers = { Location: new URL(to, url).toString() };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Not a protected path — let it through untouched.
  if (!isProtected(pathname)) return;

  // Logout — clear cookie and bounce to the login screen.
  if (pathname === '/admin/logout') {
    return redirect(url, '/admin', cookieHeader(url, 'out', 0));
  }

  // Login submission.
  if (pathname === '/admin/login' && request.method === 'POST') {
    let password = '';
    try {
      const form = await request.formData();
      password = (form.get('password') || '').toString();
    } catch (e) {
      password = '';
    }
    if (password === PASSWORD) {
      return redirect(url, '/admin', cookieHeader(url, TOKEN, MAX_AGE));
    }
    return redirect(url, '/admin?error=1');
  }

  // Already authenticated — continue to the requested static file.
  if (hasValidCookie(request)) return;

  // Unauthenticated — serve the branded login page.
  const error = url.searchParams.get('error') === '1';
  return new Response(loginPage(error), {
    status: error ? 401 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>SwiftLoop — Restricted</title>
<link rel="preconnect" href="https://api.fontshare.com" />
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='38' fill='none' stroke='%23ff4d1f' stroke-width='14'/%3E%3C/svg%3E" />
<style>
:root{--ink:#0a0a0c;--ink-2:#101014;--ink-3:#17171d;--line:rgba(236,232,223,0.12);--bone:#ece8df;--bone-dim:#97948b;--accent:#ff4d1f;--font-display:"Clash Display","Arial Black",sans-serif;--font-body:"Satoshi","Helvetica Neue",sans-serif;--font-mono:"JetBrains Mono","SFMono-Regular",monospace;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--ink);color:var(--bone);font-family:var(--font-body);-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background-image:linear-gradient(rgba(236,232,223,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(236,232,223,0.05) 1px,transparent 1px);background-size:44px 44px;}
::selection{background:var(--accent);color:var(--ink);}
.mono{font-family:var(--font-mono);font-size:0.6875rem;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;}
.card{width:100%;max-width:380px;border:1px solid var(--line);background:var(--ink-2);border-radius:14px;padding:2.2rem 2rem;}
.brand{display:flex;align-items:center;gap:0.6rem;margin-bottom:1.6rem;}
.brand svg{width:30px;height:30px;}
.brand span{font-family:var(--font-display);font-weight:600;font-size:1.35rem;letter-spacing:-0.02em;}
.brand em{font-style:normal;color:var(--accent);}
h1{font-family:var(--font-display);font-weight:600;font-size:1.5rem;letter-spacing:-0.02em;margin-bottom:0.4rem;}
.sub{color:var(--bone-dim);font-size:0.85rem;line-height:1.5;margin-bottom:1.6rem;}
label{display:block;color:var(--bone-dim);margin-bottom:0.5rem;}
input{width:100%;background:var(--ink-3);border:1px solid var(--line);color:var(--bone);font-family:var(--font-mono);font-size:0.95rem;letter-spacing:0.1em;padding:0.7rem 0.85rem;border-radius:6px;outline:none;transition:border-color 0.2s;}
input:focus{border-color:var(--accent);}
button{width:100%;margin-top:1rem;font-family:var(--font-mono);font-size:0.6875rem;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;border-radius:99px;padding:0.8rem 1rem;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:var(--ink);transition:background 0.25s,color 0.25s;}
button:hover{background:var(--bone);border-color:var(--bone);}
.err{margin-top:1rem;color:var(--accent);font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.06em;${error ? '' : 'display:none;'}}
.foot{margin-top:1.6rem;color:var(--bone-dim);text-align:center;}
</style>
</head>
<body>
<form class="card" method="POST" action="/admin/login" autocomplete="off">
<div class="brand"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="38" fill="none" stroke="#ff4d1f" stroke-width="14"/></svg><span>Swift<em>Loop</em><em>.</em></span></div>
<h1>Restricted</h1>
<p class="sub">This is an internal SwiftLoop console. Enter the access password to continue.</p>
<label class="mono" for="pw">Access password</label>
<input id="pw" name="password" type="password" autofocus required />
<button type="submit">Unlock console</button>
<p class="err mono">✕ Incorrect password — try again</p>
<p class="foot mono">Authorised access only</p>
</form>
</body>
</html>`;
}
