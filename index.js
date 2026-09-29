const { client, store } = require('./bot');
const { startServer } = require('./server');
const config = require('./config.json');

const PORT = config.port || 3000;

// Start local web dashboard
startServer(PORT);

console.log('====================================================');
console.log('🚀 DISCORD PING TRACKER & DASHBOARD');
console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
console.log(`📌 Target Channel: ${config.channelId}`);
console.log('====================================================');
