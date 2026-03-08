// Verify Clerk JWT from Authorization header
// Attach userId and role to context.data

let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binaryStr = atob(str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodeBase64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function parseJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64url(headerB64));
  const payload = JSON.parse(decodeBase64url(payloadB64));
  return { header, payload, headerB64, payloadB64, signatureB64 };
}

async function getJWKS(domain) {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }
  const response = await fetch(`https://${domain}/.well-known/jwks.json`);
  if (!response.ok) throw new Error('Failed to fetch JWKS');
  jwksCache = await response.json();
  jwksCacheTime = now;
  return jwksCache;
}

async function verifyClerkJWT(token, publishableKey) {
  // Extract domain from publishable key: pk_test_BASE64ENCODED$
  const parts = publishableKey.split('_');
  if (parts.length < 3) throw new Error('Invalid publishable key format');
  let encoded = parts[2];
  while (encoded.length % 4) encoded += '=';
  const domain = atob(encoded).replace(/\$$/, '');

  const { header, payload, headerB64, payloadB64, signatureB64 } = parseJWT(token);

  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  const jwks = await getJWKS(domain);
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Key not found in JWKS');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signature,
    signingInput
  );

  if (!isValid) throw new Error('Invalid signature');

  return payload;
}

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  // Only enforce auth on /api/ routes — let static assets and SPA pass through
  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyClerkJWT(token, env.CLERK_PUBLISHABLE_KEY);
    const clerkId = payload.sub;
    const email = payload.email || null;
    data.role = payload.role || payload.public_metadata?.role || payload.publicMetadata?.role || 'staff';
    data.sessionId = payload.sid;

    // Resolve D1 user record — fast path by clerk_id, fallback to email on first login
    if (env.DB) {
      let dbUser = await env.DB.prepare('SELECT * FROM users WHERE clerk_id = ?').bind(clerkId).first();

      if (!dbUser && email) {
        // First login: match by email, write clerk_id for future fast-path lookups
        dbUser = await env.DB.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').bind(email).first();
        if (dbUser) {
          await env.DB.prepare('UPDATE users SET clerk_id = ? WHERE id = ?').bind(clerkId, dbUser.id).run();
        }
      }

      data.userId = dbUser?.id || clerkId;   // prefer D1 id (email prefix), fall back to Clerk sub
      data.dbUser = dbUser || null;
    } else {
      data.userId = clerkId;
      data.dbUser = null;
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token', detail: err.message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return next();
}
