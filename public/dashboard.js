/**
 * Discord Ping Tracker - Frontend Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const botAvatar = document.getElementById('botAvatar');
  const botName = document.getElementById('botName');
  const botStatusDot = document.getElementById('botStatusDot');
  const serverName = document.getElementById('serverName');
  const channelName = document.getElementById('channelName');
  const inviteBanner = document.getElementById('inviteBanner');
  const inviteLinkBtn = document.getElementById('inviteLinkBtn');
  const scanProgressBar = document.getElementById('scanProgressBar');
  const scanProgressText = document.getElementById('scanProgressText');
  const scanBtn = document.getElementById('scanBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Stats
  const statTotalMembers = document.getElementById('statTotalMembers');
  const statTotalMessages = document.getElementById('statTotalMessages');
  const statTotalPings = document.getElementById('statTotalPings');
  const statUniquePinged = document.getElementById('statUniquePinged');

  // Controls
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const sortSelect = document.getElementById('sortSelect');
  const tableBody = document.getElementById('membersTableBody');

  // Modal
  const detailModal = document.getElementById('detailModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalId = document.getElementById('modalId');
  const modalPingCount = document.getElementById('modalPingCount');
  const modalPingList = document.getElementById('modalPingList');
  const toast = document.getElementById('toast');

  // State
  let currentFilter = 'all';
  let currentSort = 'pings';
  let searchQuery = '';
  let cachedMembers = [];
  let isScanningPrev = false;

  // Initial Data Load
  fetchStatus();
  fetchMembers();

  // Auto-refresh poll every 3 seconds
  setInterval(() => {
    fetchStatus();
    fetchMembers(false); // silent update
  }, 3000);

  // 1. Fetch Bot & Guild Status
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();

      // Bot User
      if (data.botUser) {
        botName.textContent = data.botUser.tag || data.botUser.username;
        botAvatar.src = data.botUser.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
      }

      botStatusDot.className = `status-indicator ${data.online ? 'online' : 'offline'}`;

      // Guild Info
      if (data.guild) {
        serverName.textContent = data.guild.name;
        inviteBanner.style.display = 'none';
      } else {
        serverName.textContent = 'Not in any server yet';
        inviteBanner.style.display = 'flex';
        inviteLinkBtn.href = data.inviteUrl || '#';
      }

      // Channel Info
      if (data.channel) {
        channelName.textContent = data.channel.name ? `#${data.channel.name}` : `Channel ID: ${data.channel.id}`;
      }

      // KPIs
      statTotalMembers.textContent = (data.stats.totalMembers || 0).toLocaleString();
      statTotalMessages.textContent = (data.stats.totalMessagesScanned || 0).toLocaleString();
      statTotalPings.textContent = (data.stats.totalPingsCounted || 0).toLocaleString();
      statUniquePinged.textContent = (data.stats.uniqueMembersPinged || 0).toLocaleString();

      // Scan Progress State
      if (data.stats.isScanning) {
        scanProgressBar.style.display = 'flex';
        scanProgressText.textContent = data.stats.scanStatusText || 'Scanning channel history...';
        scanBtn.disabled = true;
        scanBtn.style.opacity = '0.6';
      } else {
        scanProgressBar.style.display = 'none';
        scanBtn.disabled = false;
        scanBtn.style.opacity = '1';

        if (isScanningPrev && !data.stats.isScanning) {
          showToast('Channel scan finished!');
          fetchMembers();
        }
      }

      isScanningPrev = data.stats.isScanning;
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }

  // 2. Fetch Members Table Data
  async function fetchMembers(showLoading = true) {
    try {
      const url = `/api/members?q=${encodeURIComponent(searchQuery)}&filter=${currentFilter}&sort=${currentSort}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      cachedMembers = data.members || [];
      renderTable(cachedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }

  // 3. Render Table Rows
  function renderTable(members) {
    if (members.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
            <strong>No members found.</strong>
            <p style="font-size: 0.8rem; margin-top: 0.25rem;">Try changing your search or filter settings.</p>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    members.forEach((m, idx) => {
      const rank = idx + 1;
      let rankBadge = `<span class="rank-badge rank-normal">#${rank}</span>`;
      if (rank === 1 && m.pingCount > 0) rankBadge = `<span class="rank-badge rank-gold" title="Rank 1">🥇</span>`;
      else if (rank === 2 && m.pingCount > 0) rankBadge = `<span class="rank-badge rank-silver" title="Rank 2">🥈</span>`;
      else if (rank === 3 && m.pingCount > 0) rankBadge = `<span class="rank-badge rank-bronze" title="Rank 3">🥉</span>`;

      let pingBadgeClass = 'ping-zero';
      if (m.pingCount > 10) pingBadgeClass = 'ping-high';
      else if (m.pingCount > 0) pingBadgeClass = 'ping-medium';

      const relativeTime = formatRelativeTime(m.lastPinged);

      html += `
        <tr data-id="${m.id}">
          <td>${rankBadge}</td>
          <td>
            <div class="member-cell">
              <img class="member-avatar" src="${escapeHtml(m.avatarUrl)}" alt="Avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
              <div class="member-names">
                <span class="member-display">${escapeHtml(m.displayName)} ${m.isBot ? '<span class="bot-badge">BOT</span>' : ''}</span>
                <span class="member-tag">@${escapeHtml(m.username)}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="id-pill" title="Click to copy ID" onclick="copyToClipboard('${m.id}')">
              ${m.id}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </span>
          </td>
          <td class="text-right">
            <span class="ping-badge ${pingBadgeClass}">${m.pingCount.toLocaleString()}</span>
          </td>
          <td>
            <div class="ratio-cell">
              <div class="ratio-bar-bg">
                <div class="ratio-bar-fill" style="width: ${Math.min(100, Math.max(m.pingCount > 0 ? 4 : 0, m.percentage))}%"></div>
              </div>
              <span class="ratio-text">${m.percentage}%</span>
            </div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">
            ${relativeTime}
          </td>
          <td class="text-center">
            ${m.pingCount > 0 ? `
              <button class="btn-detail" onclick="openMemberDetails('${m.id}')">
                View (${m.pingCount})
              </button>
            ` : `<span style="color: var(--text-dim); font-size: 0.75rem;">None</span>`}
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  // 4. Trigger Channel Scan
  scanBtn.addEventListener('click', async () => {
    try {
      scanBtn.disabled = true;
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Channel scan initiated!');
        fetchStatus();
      } else {
        showToast(data.error || 'Could not start scan.');
      }
    } catch {
      showToast('Error communicating with bot server.');
    }
  });

  // 5. Search & Filters
  let debounceTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    debounceTimeout = setTimeout(fetchMembers, 200);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    fetchMembers();
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      fetchMembers();
    });
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    fetchMembers();
  });

  // 6. Export to CSV
  exportBtn.addEventListener('click', () => {
    if (cachedMembers.length === 0) {
      showToast('No member data to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Rank,Username,DisplayName,UserID,PingCount,Percentage\n';
    cachedMembers.forEach((m, idx) => {
      const row = [
        idx + 1,
        `"${m.username.replace(/"/g, '""')}"`,
        `"${m.displayName.replace(/"/g, '""')}"`,
        `"${m.id}"`,
        m.pingCount,
        `"${m.percentage}%"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `discord_pings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV successfully!');
  });

  // 7. Member Details Modal
  window.openMemberDetails = async function(userId) {
    try {
      const res = await fetch(`/api/member/${userId}`);
      if (!res.ok) return;
      const data = await res.json();

      modalName.textContent = data.displayName;
      modalId.textContent = `ID: ${data.id} • @${data.username}`;
      modalAvatar.src = data.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
      modalPingCount.textContent = data.pingCount.toLocaleString();

      if (!data.pings || data.pings.length === 0) {
        modalPingList.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">No recorded message mentions found.</p>';
      } else {
        modalPingList.innerHTML = data.pings.map(p => `
          <div class="ping-item">
            <div class="ping-item-header">
              <span class="ping-author">Pinged by ${escapeHtml(p.authorTag)}</span>
              <span class="ping-time">${formatDate(p.timestamp)}</span>
            </div>
            <div class="ping-content">
              ${escapeHtml(p.content || '[Attachment / Embed or blank text]')}
            </div>
          </div>
        `).join('');
      }

      detailModal.classList.add('active');
    } catch (err) {
      console.error(err);
      showToast('Could not load member details.');
    }
  };

  closeModalBtn.addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      detailModal.classList.remove('active');
    }
  });

  // Helper Utilities
  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ID: ${text}`);
    }).catch(() => {
      showToast('Failed to copy ID.');
    });
  };

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatRelativeTime(iso) {
    if (!iso) return '-';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(iso);
  }
});
