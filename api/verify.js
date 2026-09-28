const crypto = require('crypto');

const JWT_SECRET = process.env.SESSION_SECRET || 'clan-auth-shield-98234-xK!';

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.query?.token;

  const session = verifyToken(token);
  if (session) {
    return res.status(200).json({ valid: true, session });
  }
  return res.status(401).json({ valid: false, error: 'Session invalid or expired' });
};
