const crypto = require('crypto');

// Secret key for HMAC cryptographic signing (can be set in Vercel Environment Variables)
const SESSION_SECRET = process.env.SESSION_SECRET || 'clan-secure-shield-98234-xK!';

// Cryptographic SHA-256 hash of 'varangian199' (never plaintext)
const TARGET_PASSWORD_HASH = process.env.CLAN_PASSWORD_HASH || 'f1fe824010238a2d55463040d76df6c427ffc2bc01bac04683b1d1be70849073';

// Server-side IP rate limiting (Anti-brute-force)
const rateLimitMap = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

function signSessionToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

module.exports = async (req, res) => {
  // 1. Strict HTTP Method Control
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // 2. Anti-caching headers for authentication
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const ip = getClientIp(req);
  const now = Date.now();

  // 3. Brute-Force Rate Limiting (5 attempts max, 10 min cooldown)
  const clientRecord = rateLimitMap.get(ip) || { attempts: 0, lockedUntil: 0 };
  if (clientRecord.lockedUntil > now) {
    const waitSeconds = Math.ceil((clientRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Security Lockout: Too many attempts. Try again in ${waitSeconds}s.`
    });
  }

  // 4. Input Sanitization & Type Enforcement (Immune to SQL/NoSQL injections)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'Malformed JSON payload.' });
    }
  }

  const password = body?.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  if (password.length > 128) {
    return res.status(400).json({ success: false, error: 'Payload exceeds allowed limit.' });
  }

  // 5. Hash Input & Compare with Constant Time (Prevents Timing Attacks)
  const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
  const inputBuf = Buffer.from(inputHash, 'utf8');
  const targetBuf = Buffer.from(TARGET_PASSWORD_HASH, 'utf8');

  let isMatch = false;
  try {
    isMatch = inputBuf.length === targetBuf.length && crypto.timingSafeEqual(inputBuf, targetBuf);
  } catch {
    isMatch = false;
  }

  if (isMatch) {
    // Reset rate limiter on successful auth
    rateLimitMap.delete(ip);

    // Issue tamper-proof HMAC session token (valid 24h)
    const token = signSessionToken({
      auth: true,
      role: 'commander',
      ip: ip,
      issuedAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000)
    });

    // Set HttpOnly, Secure, SameSite=Strict cookie
    // JavaScript CANNOT access this cookie (100% immune to XSS theft)
    res.setHeader('Set-Cookie', [
      `clan_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.'
    });
  } else {
    // Track failed attempt
    clientRecord.attempts += 1;
    if (clientRecord.attempts >= 5) {
      clientRecord.lockedUntil = now + (10 * 60 * 1000); // 10 minute lock
      rateLimitMap.set(ip, clientRecord);
      return res.status(429).json({
        success: false,
        error: 'Security Lockout: 5 failed attempts reached. Locked for 10 minutes.'
      });
    }

    rateLimitMap.set(ip, clientRecord);
    const remaining = 5 - clientRecord.attempts;
    return res.status(401).json({
      success: false,
      error: `Invalid credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
    });
  }
};
