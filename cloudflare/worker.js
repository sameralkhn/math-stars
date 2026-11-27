// خادم صغير على Cloudflare Workers يرسل إشعارات الدعوات عبر Firebase Cloud Messaging.
// الإعداد: أضف سرًّا باسم SERVICE_ACCOUNT يحوي ملف حساب الخدمة (JSON) كاملًا من Firebase.
const enc = new TextEncoder();
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = s => b64u(enc.encode(s));
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

let JWKS = null, JWKS_T = 0, TOK = null, TOK_T = 0;

async function verifyIdToken(tok, projectId) {
  const [h, p, s] = tok.split('.');
  const hd = JSON.parse(new TextDecoder().decode(unb64u(h))), pl = JSON.parse(new TextDecoder().decode(unb64u(p)));
  if (!JWKS || Date.now() - JWKS_T > 3600e3) {
    JWKS = (await (await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')).json()).keys; JWKS_T = Date.now();
  }
  const jwk = JWKS.find(k => k.kid === hd.kid); if (!jwk) throw 'kid';
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(s), enc.encode(h + '.' + p));
  const now = Date.now() / 1000;
  if (!ok || pl.aud !== projectId || pl.iss !== 'https://securetoken.google.com/' + projectId || pl.exp < now || !pl.sub) throw 'token';
  return pl.sub;
}

async function accessToken(sa) {
  if (TOK && Date.now() - TOK_T < 50 * 60e3) return TOK;
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64uStr(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', unb64u(pem.replace(/\+/g, '-').replace(/\//g, '_')), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + body));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + body + '.' + b64u(sig) });
  const j = await r.json(); if (!j.access_token) throw 'oauth: ' + JSON.stringify(j);
  TOK = j.access_token; TOK_T = Date.now(); return TOK;
}

async function getDoc(sa, at, path) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${path}`, { headers: { Authorization: 'Bearer ' + at } });
  if (r.status === 404) return null; const j = await r.json(); if (!j.fields) return null;
  const o = {}; for (const [k, v] of Object.entries(j.fields)) o[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? null; return o;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return J({ ok: true, service: 'math-stars push' });
    try {
      const sa = JSON.parse(env.SERVICE_ACCOUNT);
      const uid = await verifyIdToken((req.headers.get('Authorization') || '').replace('Bearer ', ''), sa.project_id);
      const { inv } = await req.json(); if (!/^[A-Za-z0-9]{10,40}$/.test(inv || '')) return J({ error: 'bad' }, 400);
      const at = await accessToken(sa);
      const d = await getDoc(sa, at, 'invites/' + inv);
      if (!d || d.from !== uid) return J({ error: 'not yours' }, 403);
      const t = await getDoc(sa, at, 'pushtokens/' + d.to);
      if (!t || !t.t) return J({ ok: false, reason: 'no-token' });
      const names = { k: '🃏 آخر ورقة', t: '♠️ الطرنيب', x: '❌ إكس أو', i: '🪨 إدريس', c: '🏆 تجميع الذهب' };
      const msg = { message: { token: t.t, webpush: { headers: { Urgency: 'high', TTL: '900' }, data: {
        title: '📣 ' + String(d.n || 'لاعب').slice(0, 30) + ' يدعوك للعب', body: (names[d.k] || 'لعبة') + ' — غرفة ' + d.code + ' • اضغط للانضمام', k: String(d.k), code: String(d.code), inv } } } };
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, { method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
      const j = await r.json(); return J({ ok: r.ok, fcm: r.ok ? undefined : j });
    } catch (e) { return J({ error: String(e) }, 401); }
  }
};
