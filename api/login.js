const crypto = require('crypto');

// Secret for signing session tokens (can also be overridden in Vercel Environment Variables)
const JWT_SECRET = process.env.SESSION_SECRET || 'clan-auth-shield-98234-xK!';

// Cryptographic SHA-256 hash of the clan password (never stored in plaintext)
const TARGET_HASH = process.env.CLAN_PASSWORD_HASH || 'f1fe824010238a2d55463040d76df6c427ffc2bc01bac04683b1d1be70849073';

// Rate limiting in-memory map: IP -> { attempts: number, lockedUntil: number }
const rateLimit = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Security headers to prevent caching sensitive responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const ip = getClientIp(req);
  const now = Date.now();

  // 1. Anti-Brute-Force Protection / Rate Limiting
  const clientLimit = rateLimit.get(ip) || { attempts: 0, lockedUntil: 0 };
  if (clientLimit.lockedUntil > now) {
    const remainingSecs = Math.ceil((clientLimit.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Security lockout active for ${remainingSecs}s.`
    });
  }

  // 2. Parse & Validate Input Payload (Immune to SQL/NoSQL Injection)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON request format.' });
    }
  }

  const password = body?.password;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Password required.' });
  }

  // Prevent buffer overflow / DOS payload
  if (password.length > 128) {
    return res.status(400).json({ success: false, error: 'Input exceeds maximum allowed length.' });
  }

  // 3. Compute SHA-256 Hash of Input
  const inputHash = crypto.createHash('sha256').update(password.trim()).digest('hex');

  // 4. Constant-Time Timing-Safe Comparison (Prevents Timing Attacks)
  const inputBuf = Buffer.from(inputHash, 'utf8');
  const targetBuf = Buffer.from(TARGET_HASH, 'utf8');

  let isValid = false;
  try {
    isValid = inputBuf.length === targetBuf.length && crypto.timingSafeEqual(inputBuf, targetBuf);
  } catch {
    isValid = false;
  }

  if (isValid) {
    // Reset rate limiter on valid login
    rateLimit.delete(ip);

    // Generate tamper-proof cryptographic session token (valid 24h)
    const token = createToken({
      authenticated: true,
      role: 'commander',
      issuedAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000)
    });

    return res.status(200).json({
      success: true,
      token,
      message: 'Access granted.'
    });
  } else {
    // Track failed attempt
    clientLimit.attempts += 1;
    if (clientLimit.attempts >= 5) {
      clientLimit.lockedUntil = now + (10 * 60 * 1000); // 10 minute lockout
      rateLimit.set(ip, clientLimit);
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Portal locked for 10 minutes.'
      });
    }

    rateLimit.set(ip, clientLimit);
    const attemptsLeft = 5 - clientLimit.attempts;
    return res.status(401).json({
      success: false,
      error: `Access denied. Incorrect password (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining).`
    });
  }
};
