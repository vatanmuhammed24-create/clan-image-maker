function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const now = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayStr = getOrdinal(now.getUTCDate());
  const monthStr = months[now.getUTCMonth()];
  const yearStr = now.getUTCFullYear();

  return res.status(200).json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    promotionDate: `Given under arms this ${dayStr} day of ${monthStr}, ${yearStr}`,
    demotionDate: `Pronounced under disciplinary decree this ${dayStr} day of ${monthStr}, ${yearStr}`,
    displayDate: `${monthStr} ${now.getUTCDate()}, ${yearStr} (Server UTC)`
  });
};
