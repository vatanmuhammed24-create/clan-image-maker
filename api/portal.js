const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'clan-secure-shield-98234-xK!';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=');
    if (name) cookies[name] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getImperialServerDate(now) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayStr = getOrdinal(now.getUTCDate());
  const monthStr = months[now.getUTCMonth()];
  const yearStr = now.getUTCFullYear();

  return {
    timestamp: now.getTime(),
    iso: now.toISOString(),
    promotionDate: `Given under arms this ${dayStr} day of ${monthStr}, ${yearStr}`,
    demotionDate: `Pronounced under disciplinary decree this ${dayStr} day of ${monthStr}, ${yearStr}`,
    displayDate: `${monthStr} ${now.getUTCDate()}, ${yearStr} (Server UTC)`
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Extract session token from HttpOnly cookie
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['clan_session'];

  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json({
      authorized: false,
      error: 'Unauthorized. Valid clan session cookie required.'
    });
  }

  const now = new Date();
  const serverDate = getImperialServerDate(now);

  return res.status(200).json({
    authorized: true,
    title: 'ACCESS GRANTED',
    securityClearance: 'LEVEL 1 - VERIFIED',
    sessionRole: session.role || 'commander',
    serverDate: serverDate,
    expiresAt: session.expiresAt
  });
};
