const express = require('express');
const path = require('path');
const config = require('./config.json');
const { store, scanChannelHistory } = require('./bot');

const app = express();
app.use(express.json());

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// 1. Bot & Server Status
app.get('/api/status', (req, res) => {
  const membersList = Array.from(store.members.values());
  const uniquePinged = membersList.filter(m => m.pingCount > 0).length;

  res.json({
    online: store.isReady,
    botUser: store.botUser,
    inviteUrl: store.inviteUrl,
    guild: store.guild ? {
      id: store.guild.id,
      name: store.guild.name,
      iconUrl: store.guild.iconURL({ size: 128 }),
      memberCount: store.guild.memberCount || membersList.length
    } : null,
    channel: store.channel ? {
      id: store.channel.id,
      name: store.channel.name,
      type: store.channel.type
    } : {
      id: config.channelId,
      name: 'Channel not yet accessible (invite bot first)'
    },
    stats: {
      isScanning: store.isScanning,
      scanProgress: store.scanProgress,
      scanStatusText: store.scanStatusText,
      lastScanTime: store.lastScanTime,
      totalMessagesScanned: store.totalMessagesScanned,
      totalPingsCounted: store.totalPingsCounted,
      uniqueMembersPinged: uniquePinged,
      totalMembers: membersList.length
    }
  });
});

// 2. Members List with Ping Counts
app.get('/api/members', (req, res) => {
  const { q = '', filter = 'all', sort = 'pings' } = req.query;
  let list = Array.from(store.members.values());

  // Search filter
  if (q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(m =>
      (m.displayName && m.displayName.toLowerCase().includes(term)) ||
      (m.username && m.username.toLowerCase().includes(term)) ||
      (m.tag && m.tag.toLowerCase().includes(term)) ||
      (m.id && m.id.includes(term))
    );
  }

  // Category filter
  if (filter === 'pinged') {
    list = list.filter(m => m.pingCount > 0);
  } else if (filter === 'zero') {
    list = list.filter(m => m.pingCount === 0);
  } else if (filter === 'top10') {
    list = list.sort((a, b) => b.pingCount - a.pingCount).slice(0, 10);
  }

  // Sorting
  if (sort === 'pings') {
    list.sort((a, b) => b.pingCount - a.pingCount);
  } else if (sort === 'name') {
    list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } else if (sort === 'least') {
    list.sort((a, b) => a.pingCount - b.pingCount);
  }

  res.json({
    total: list.length,
    members: list.map(m => ({
      id: m.id,
      username: m.username,
      displayName: m.displayName,
      tag: m.tag,
      isBot: m.isBot,
      avatarUrl: m.avatarUrl,
      pingCount: m.pingCount,
      percentage: store.totalPingsCounted > 0 
        ? ((m.pingCount / store.totalPingsCounted) * 100).toFixed(1)
        : '0.0',
      lastPinged: m.pings.length > 0 ? m.pings[m.pings.length - 1].timestamp : null
    }))
  });
});

// 3. Member Detail with Ping History
app.get('/api/member/:id', (req, res) => {
  const member = store.members.get(req.params.id);
  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  res.json({
    id: member.id,
    username: member.username,
    displayName: member.displayName,
    tag: member.tag,
    avatarUrl: member.avatarUrl,
    pingCount: member.pingCount,
    pings: member.pings
  });
});

// 4. Trigger Channel Re-scan
app.post('/api/scan', async (req, res) => {
  if (store.isScanning) {
    return res.status(400).json({ error: 'A scan is currently running.' });
  }

  // Run in background and return immediate response
  scanChannelHistory();
  res.json({ success: true, message: 'Scan started.' });
});

// 5. Recent Live Pings Stream
app.get('/api/recent', (req, res) => {
  res.json({ recent: store.recentPings });
});

function startServer(port = config.port || 3000) {
  return app.listen(port, () => {
    console.log(`[Dashboard] Running at http://localhost:${port}`);
  });
}

module.exports = {
  app,
  startServer
};
