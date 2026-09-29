const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');

// In-memory data store
const store = {
  botUser: null,
  guild: null,
  channel: null,
  inviteUrl: '',
  isReady: false,
  isScanning: false,
  scanProgress: 0,
  scanStatusText: 'Idle',
  lastScanTime: null,
  totalMessagesScanned: 0,
  totalPingsCounted: 0,
  
  // memberId -> { id, username, displayName, tag, avatarUrl, roles, pingCount, pings: [] }
  members: new Map(),

  // message logs
  recentPings: []
};

// Initialize Discord Client with full required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Calculate OAuth2 Invite URL
function computeInviteUrl(clientId) {
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
}

// Format Discord Avatar
function getAvatarUrl(user, member) {
  if (member && member.avatar) {
    return member.displayAvatarURL({ size: 128 });
  }
  if (user && typeof user.displayAvatarURL === 'function') {
    return user.displayAvatarURL({ size: 128 });
  }
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}

// 1. Fetch Full Member List from Server
async function fetchFullMemberList(guild) {
  if (!guild) return;
  try {
    console.log(`[Bot] Fetching full member list for guild: ${guild.name}...`);
    const fetchedMembers = await guild.members.fetch();
    console.log(`[Bot] Successfully loaded ${fetchedMembers.size} members.`);

    for (const [id, member] of fetchedMembers) {
      if (!store.members.has(id)) {
        store.members.set(id, {
          id: member.id,
          username: member.user.username,
          displayName: member.displayName || member.user.globalName || member.user.username,
          tag: member.user.tag || member.user.username,
          isBot: member.user.bot,
          avatarUrl: getAvatarUrl(member.user, member),
          joinedAt: member.joinedAt,
          pingCount: 0,
          pings: []
        });
      } else {
        // Update user profile info while preserving ping count
        const existing = store.members.get(id);
        existing.displayName = member.displayName || member.user.globalName || member.user.username;
        existing.avatarUrl = getAvatarUrl(member.user, member);
        existing.isBot = member.user.bot;
      }
    }
  } catch (err) {
    console.error('[Bot] Error fetching guild members (ensure Server Members Intent is enabled):', err.message);
  }
}

// 2. Scan Full Channel History for Pings
async function scanChannelHistory() {
  if (!store.channel) {
    console.warn('[Bot] Cannot scan: channel not found or bot lacks access.');
    return { success: false, error: 'Channel not found or bot not in server.' };
  }

  if (store.isScanning) {
    return { success: false, error: 'A scan is already in progress.' };
  }

  store.isScanning = true;
  store.scanProgress = 0;
  store.scanStatusText = 'Starting full channel history scan...';
  store.totalMessagesScanned = 0;
  store.totalPingsCounted = 0;

  // Reset ping counts for existing members
  for (const member of store.members.values()) {
    member.pingCount = 0;
    member.pings = [];
  }
  store.recentPings = [];

  const channel = store.channel;
  let lastMessageId = null;
  let hasMore = true;

  console.log(`[Bot] Scanning all messages in channel: #${channel.name} (${channel.id})...`);

  try {
    while (hasMore) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messages = await channel.messages.fetch(options);
      if (!messages || messages.size === 0) {
        hasMore = false;
        break;
      }

      store.totalMessagesScanned += messages.size;
      store.scanProgress = store.totalMessagesScanned;
      store.scanStatusText = `Scanned ${store.totalMessagesScanned.toLocaleString()} messages...`;

      for (const [msgId, msg] of messages) {
        processMessageForPings(msg);
      }

      lastMessageId = messages.last().id;

      // Gentle delay to respect Discord rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    store.isScanning = false;
    store.lastScanTime = new Date().toISOString();
    store.scanStatusText = `Completed! Scanned ${store.totalMessagesScanned.toLocaleString()} messages with ${store.totalPingsCounted.toLocaleString()} total pings.`;
    console.log(`[Bot] Scan finished: ${store.totalMessagesScanned} messages scanned, ${store.totalPingsCounted} pings counted.`);
    return { success: true, totalMessages: store.totalMessagesScanned, totalPings: store.totalPingsCounted };
  } catch (err) {
    store.isScanning = false;
    store.scanStatusText = `Scan error: ${err.message}`;
    console.error('[Bot] Error during channel scan:', err);
    return { success: false, error: err.message };
  }
}

// 3. Process Individual Message For Pings
function processMessageForPings(msg) {
  if (!msg) return;

  const mentionedUserIds = new Set();

  // A. Check Discord API parsed mentions
  if (msg.mentions && msg.mentions.users) {
    for (const [userId] of msg.mentions.users) {
      mentionedUserIds.add(userId);
    }
  }

  // B. Also scan message content with Regex to catch raw <@userId> and <@!userId>
  if (msg.content) {
    const regex = /<@!?(\d+)>/g;
    let match;
    while ((match = regex.exec(msg.content)) !== null) {
      mentionedUserIds.add(match[1]);
    }
  }

  if (mentionedUserIds.size === 0) return;

  for (const userId of mentionedUserIds) {
    store.totalPingsCounted++;

    // Ensure member exists in store
    if (!store.members.has(userId)) {
      const mentionUser = msg.mentions?.users?.get(userId);
      store.members.set(userId, {
        id: userId,
        username: mentionUser ? mentionUser.username : `User_${userId.slice(-4)}`,
        displayName: mentionUser ? (mentionUser.globalName || mentionUser.username) : `User (${userId})`,
        tag: mentionUser ? mentionUser.tag : `User_${userId}`,
        isBot: mentionUser ? mentionUser.bot : false,
        avatarUrl: mentionUser ? getAvatarUrl(mentionUser) : 'https://cdn.discordapp.com/embed/avatars/0.png',
        pingCount: 0,
        pings: []
      });
    }

    const memberRecord = store.members.get(userId);
    memberRecord.pingCount++;

    const pingRecord = {
      messageId: msg.id,
      authorId: msg.author.id,
      authorTag: msg.author.tag || msg.author.username,
      authorAvatar: getAvatarUrl(msg.author),
      timestamp: msg.createdAt,
      content: msg.content
    };

    memberRecord.pings.push(pingRecord);

    if (store.recentPings.length < 50) {
      store.recentPings.unshift({
        targetId: userId,
        targetName: memberRecord.displayName,
        targetAvatar: memberRecord.avatarUrl,
        ...pingRecord
      });
    }
  }
}

// 4. Client Lifecycle Events
client.on('ready', async () => {
  store.botUser = {
    id: client.user.id,
    tag: client.user.tag,
    username: client.user.username,
    avatarUrl: client.user.displayAvatarURL({ size: 128 })
  };
  store.inviteUrl = computeInviteUrl(client.user.id);
  store.isReady = true;

  console.log(`[Bot] Online as ${client.user.tag}!`);
  console.log(`[Bot] Invite URL: ${store.inviteUrl}`);

  // Resolve target channel and guild
  await resolveTargetGuildAndChannel();
});

async function resolveTargetGuildAndChannel() {
  try {
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (channel) {
      store.channel = channel;
      store.guild = channel.guild;
      console.log(`[Bot] Connected to Guild: "${channel.guild.name}" | Channel: "#${channel.name}"`);

      // 1. Fetch full member list
      await fetchFullMemberList(channel.guild);

      // 2. Start initial full channel history scan
      scanChannelHistory();
    } else {
      console.warn(`[Bot] Channel ${config.channelId} not accessible yet. Ensure bot is invited to the server.`);
      if (client.guilds.cache.size > 0) {
        store.guild = client.guilds.cache.first();
        await fetchFullMemberList(store.guild);
      }
    }
  } catch (err) {
    console.error('[Bot] Error resolving guild/channel:', err.message);
  }
}

// When bot joins a new server, re-resolve target channel
client.on('guildCreate', async (guild) => {
  console.log(`[Bot] Joined new server: ${guild.name}`);
  await resolveTargetGuildAndChannel();
});

// Keep member list up to date
client.on('guildMemberAdd', (member) => {
  if (store.guild && member.guild.id === store.guild.id) {
    if (!store.members.has(member.id)) {
      store.members.set(member.id, {
        id: member.id,
        username: member.user.username,
        displayName: member.displayName || member.user.globalName || member.user.username,
        tag: member.user.tag || member.user.username,
        isBot: member.user.bot,
        avatarUrl: getAvatarUrl(member.user, member),
        joinedAt: member.joinedAt,
        pingCount: 0,
        pings: []
      });
    }
  }
});

client.on('guildMemberRemove', (member) => {
  // We keep their record or mark as departed so historic pings remain visible
});

// Real-time listener for incoming messages on target channel
client.on('messageCreate', (message) => {
  if (message.channelId === config.channelId) {
    store.totalMessagesScanned++;
    processMessageForPings(message);
    console.log(`[Bot] Real-time message detected in #${message.channel.name} by ${message.author.tag}`);
  }
});

// Connect to Discord Gateway
client.login(config.token).catch(err => {
  console.error('[Bot] Failed to log in to Discord Gateway:', err.message);
});

module.exports = {
  client,
  store,
  scanChannelHistory,
  fetchFullMemberList
};
