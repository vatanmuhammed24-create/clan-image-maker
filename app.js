/**
 * Clan Headquarters - Napoleonic Promotion Studio Engine (English Edition)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Screens
  const loginScreen = document.getElementById('loginScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const submitBtn = document.getElementById('submitBtn');
  const lockBtn = document.getElementById('lockBtn');
  const toast = document.getElementById('toast');

  // Canvas elements
  const paperCanvas = document.getElementById('paperCanvas');
  const ctx = paperCanvas.getContext('2d');
  const sigCanvas = document.getElementById('sigCanvas');
  const sigCtx = sigCanvas.getContext('2d');

  // Promotion Form State - 100% English, Starts empty for the promoter to fill in
  const state = {
    promotedName: '',
    promotedRank: '',
    reason: '',
    citationDate: '',
    promoterRank: '',
    promoterName: '',
    crest: 'eagle',
    sealColor: 'red',
    hasSignature: false
  };

  // --- 1. AUTHENTICATION & SESSION HANDLING ---
  checkSession();

  async function checkSession() {
    try {
      const res = await fetch('/api/portal', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          showDashboard();
        }
      }
    } catch {
      // Unauthenticated, stay on login gate
    }
  }

  // Toggle Password Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  });

  // Login Form Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value;
    if (!enteredPassword) return;

    setLoading(true);
    errorMessage.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: enteredPassword })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showDashboard();
      } else {
        showError(result.error || 'Access denied.');
      }
    } catch {
      showError('Authentication service unreachable.');
    } finally {
      setLoading(false);
    }
  });

  // Lock Portal
  lockBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    passwordInput.value = '';
    errorMessage.textContent = '';
    passwordInput.focus();
  });

  function showDashboard() {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    initSignaturePad();
    renderPaper();
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.style.opacity = loading ? '0.7' : '1';
    submitBtn.querySelector('span').textContent = loading ? 'VERIFYING...' : 'ENTER';
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    loginScreen.classList.remove('shake');
    void loginScreen.offsetWidth;
    loginScreen.classList.add('shake');
    passwordInput.focus();
  }

  // --- 2. INPUT BINDINGS ---
  function bindInput(id, stateKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      state[stateKey] = e.target.value;
      renderPaper();
    });
  }

  bindInput('promotedName', 'promotedName');
  bindInput('promotedRank', 'promotedRank');
  bindInput('promotionReason', 'reason');
  bindInput('citationDate', 'citationDate');
  bindInput('promoterRank', 'promoterRank');
  bindInput('promoterName', 'promoterName');

  document.getElementById('crestSelect').addEventListener('change', (e) => {
    state.crest = e.target.value;
    renderPaper();
  });

  document.getElementById('sealColor').addEventListener('change', (e) => {
    state.sealColor = e.target.value;
    renderPaper();
  });

  // Quick Rank Pills
  document.querySelectorAll('.rank-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.promotedRank = pill.dataset.rank;
      document.getElementById('promotedRank').value = pill.dataset.rank;
      renderPaper();
    });
  });

  // --- 3. INTERACTIVE SIGNATURE PAD ---
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  function initSignaturePad() {
    sigCtx.lineWidth = 2.4;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#1a1005'; // Dark sepia ink
  }

  function getSigCoords(e) {
    const rect = sigCanvas.getBoundingClientRect();
    const scaleX = sigCanvas.width / rect.width;
    const scaleY = sigCanvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startSig(e) {
    isDrawing = true;
    const { x, y } = getSigCoords(e);
    lastX = x;
    lastY = y;
  }

  function drawSig(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();

    const { x, y } = getSigCoords(e);
    sigCtx.beginPath();
    sigCtx.moveTo(lastX, lastY);
    sigCtx.lineTo(x, y);
    sigCtx.stroke();

    lastX = x;
    lastY = y;
    state.hasSignature = true;
    renderPaper();
  }

  function stopSig() {
    isDrawing = false;
  }

  // Mouse & Touch events
  sigCanvas.addEventListener('mousedown', startSig);
  sigCanvas.addEventListener('mousemove', drawSig);
  window.addEventListener('mouseup', stopSig);

  sigCanvas.addEventListener('touchstart', startSig, { passive: false });
  sigCanvas.addEventListener('touchmove', drawSig, { passive: false });
  sigCanvas.addEventListener('touchend', stopSig);

  document.getElementById('clearSigBtn').addEventListener('click', () => {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    state.hasSignature = false;
    renderPaper();
  });

  document.getElementById('sampleSigBtn').addEventListener('click', () => {
    drawSampleSignature();
  });

  function drawSampleSignature() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigCtx.save();
    sigCtx.strokeStyle = '#1a1005';
    sigCtx.lineWidth = 2.4;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    // Ornate 19th Century Napoleonic Flourish Signature
    sigCtx.beginPath();
    sigCtx.moveTo(40, 55);
    sigCtx.bezierCurveTo(60, 20, 80, 25, 95, 60);
    sigCtx.bezierCurveTo(110, 30, 125, 45, 140, 58);
    sigCtx.bezierCurveTo(155, 35, 170, 50, 190, 56);
    sigCtx.stroke();

    // Flourish Paraph
    sigCtx.beginPath();
    sigCtx.moveTo(35, 68);
    sigCtx.bezierCurveTo(110, 72, 210, 65, 270, 48);
    sigCtx.bezierCurveTo(285, 35, 260, 25, 230, 45);
    sigCtx.bezierCurveTo(180, 75, 120, 78, 60, 75);
    sigCtx.stroke();

    sigCtx.restore();
    state.hasSignature = true;
    renderPaper();
  }

  // --- 4. NAPOLEONIC PAPER RENDERING ENGINE (100% ENGLISH) ---
  function renderPaper() {
    const w = paperCanvas.width;
    const h = paperCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // A. Aged Parchment Background
    drawParchmentBackground(w, h);

    // B. Ornate Napoleonic Triple Borders & Corners
    drawNapoleonicBorders(w, h);

    // C. Imperial Header & Crest
    drawImperialHeader(w, h);

    // D. Main Decree Text
    drawDecreeBody(w, h);

    // E. 3D Wax Seal (with VA monogram) & Signature Block
    drawWaxSealAndSignature(w, h);
  }

  function drawParchmentBackground(w, h) {
    // Warm antique parchment gradient
    const bg = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#faf4e4');
    bg.addColorStop(0.55, '#f3e6ca');
    bg.addColorStop(0.85, '#e4d0a7');
    bg.addColorStop(1, '#c9b183');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle aged paper texture / stains
    ctx.save();
    ctx.fillStyle = 'rgba(120, 80, 30, 0.03)';
    for (let i = 0; i < 40; i++) {
      const rx = (Math.sin(i * 99) * 0.5 + 0.5) * w;
      const ry = (Math.cos(i * 77) * 0.5 + 0.5) * h;
      const r = 20 + (i % 5) * 25;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Dark burned vignette edges
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.42, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(75, 48, 18, 0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  function drawNapoleonicBorders(w, h) {
    ctx.save();
    const margin = 45;

    // 1. Outer Dark Sepia Border
    ctx.strokeStyle = '#2b1b0c';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    // 2. Middle Fine Double Line
    ctx.strokeStyle = '#8a6a3b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(margin + 8, margin + 8, w - (margin + 8) * 2, h - (margin + 8) * 2);
    ctx.strokeRect(margin + 14, margin + 14, w - (margin + 14) * 2, h - (margin + 14) * 2);

    // 3. Inner Ornate Frame with Corner Insets
    const inMargin = margin + 26;
    ctx.strokeStyle = '#2b1b0c';
    ctx.lineWidth = 2;
    ctx.strokeRect(inMargin, inMargin, w - inMargin * 2, h - inMargin * 2);

    // Ornate French Corner Brackets
    drawCornerFlourish(inMargin, inMargin, 1, 1);
    drawCornerFlourish(w - inMargin, inMargin, -1, 1);
    drawCornerFlourish(inMargin, h - inMargin, 1, -1);
    drawCornerFlourish(w - inMargin, h - inMargin, -1, -1);

    ctx.restore();
  }

  function drawCornerFlourish(x, y, dirX, dirY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dirX, dirY);
    ctx.strokeStyle = '#6e4f24';
    ctx.fillStyle = '#6e4f24';
    ctx.lineWidth = 2;

    // Rosette & scrolls
    ctx.beginPath();
    ctx.arc(14, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, 25);
    ctx.bezierCurveTo(4, 10, 10, 4, 25, 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, 40);
    ctx.bezierCurveTo(6, 15, 15, 6, 40, 6);
    ctx.stroke();

    ctx.restore();
  }

  function drawImperialHeader(w, h) {
    ctx.save();
    const cx = w / 2;
    const topY = 125;

    // Draw Selected Imperial Crest
    drawCrest(cx, topY, state.crest);

    // Imperial Subtitle in English
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b4f2c';
    ctx.font = '700 13px "Cinzel", serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('VARANGIAN IMPERIAL COMMAND • HIGH WAR COUNCIL', cx, topY + 54);

    // Grand Title: COMMISSION OF PROMOTION
    ctx.fillStyle = '#1c1208';
    ctx.font = '900 44px "Cinzel Decorative", "Cinzel", serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('COMMISSION OF PROMOTION', cx, topY + 105);

    // Ornate Divider Flourish
    drawVintageFlourishDivider(cx, topY + 125, 260);

    ctx.restore();
  }

  function drawCrest(x, y, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#7a5a2d';
    ctx.strokeStyle = '#4a3316';
    ctx.lineWidth = 2.5;

    if (type === 'eagle') {
      // Napoleonic Imperial Eagle Vector
      ctx.beginPath();
      ctx.moveTo(-18, -32);
      ctx.lineTo(-22, -45);
      ctx.lineTo(-10, -38);
      ctx.lineTo(0, -48);
      ctx.lineTo(10, -38);
      ctx.lineTo(22, -45);
      ctx.lineTo(18, -32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      // Left Wing
      ctx.moveTo(0, -20);
      ctx.bezierCurveTo(-35, -35, -75, -20, -90, 5);
      ctx.bezierCurveTo(-70, 0, -45, 12, -25, 5);
      ctx.lineTo(-15, 20);
      // Tail & Claws
      ctx.lineTo(-20, 34);
      ctx.lineTo(0, 38);
      ctx.lineTo(20, 34);
      ctx.lineTo(15, 20);
      // Right Wing
      ctx.lineTo(25, 5);
      ctx.bezierCurveTo(45, 12, 70, 0, 90, 5);
      ctx.bezierCurveTo(75, -20, 35, -35, 0, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thunderbolts in Talons
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-45, 36);
      ctx.lineTo(45, 36);
      ctx.stroke();
    } else if (type === 'laurel') {
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      drawStar(0, 0, 5, 12, 6);
    } else {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-45, -28);
      ctx.bezierCurveTo(-15, -10, 20, 10, 45, 30);
      ctx.moveTo(45, -28);
      ctx.bezierCurveTo(15, -10, -20, 10, -45, 30);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  function drawVintageFlourishDivider(cx, cy, width) {
    ctx.save();
    ctx.strokeStyle = '#826338';
    ctx.fillStyle = '#826338';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx - width / 2, cy);
    ctx.lineTo(cx - 20, cy);
    ctx.moveTo(cx + 20, cy);
    ctx.lineTo(cx + width / 2, cy);
    ctx.stroke();

    // Center Diamond
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDecreeBody(w, h) {
    ctx.save();
    const cx = w / 2;
    let y = 305;

    // Proclamation intro in English
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3620';
    ctx.font = 'italic 500 21px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('By Order of the Supreme Command and by Virtue of Authority Vested,', cx, y);
    y += 28;
    ctx.fillText('Be it solemnly recognized and decreed that :', cx, y);
    y += 62;

    // PROMOTED NAME
    if (state.promotedName && state.promotedName.trim()) {
      ctx.fillStyle = '#1c1005';
      ctx.font = '700 52px "Cinzel", "Great Vibes", serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(state.promotedName.trim(), cx, y);
    } else {
      ctx.fillStyle = '#9b8260';
      ctx.font = 'italic 500 38px "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('[ Promoted Name ]', cx, y);
    }

    // Underline flourish for Promoted Name
    drawVintageFlourishDivider(cx, y + 16, 380);
    y += 56;

    // Transition text
    ctx.fillStyle = '#4a3620';
    ctx.font = 'italic 600 23px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('has been officially elevated and promoted to the rank of', cx, y);
    y += 54;

    // PROMOTED RANK
    if (state.promotedRank && state.promotedRank.trim()) {
      ctx.fillStyle = '#801818'; // Imperial Burgundy Accent
      ctx.font = '900 36px "Cinzel", serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(state.promotedRank.trim().toUpperCase(), cx, y);
    } else {
      ctx.fillStyle = '#9b8260';
      ctx.font = 'italic 500 30px "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('[ Promoted Rank ]', cx, y);
    }
    y += 56;

    // Reason Intro in English
    ctx.fillStyle = '#4a3620';
    ctx.font = 'italic 500 21px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('because :', cx, y);
    y += 38;

    // REASON (Wrapped multi-line elegant quote)
    if (state.reason && state.reason.trim()) {
      ctx.fillStyle = '#261708';
      ctx.font = 'italic 600 22px "Cormorant Garamond", Georgia, serif';
      const reasonText = `“ ${state.reason.trim()} ”`;
      wrapText(ctx, reasonText, cx, y, 920, 30);
    } else {
      ctx.fillStyle = '#9b8260';
      ctx.font = 'italic 500 21px "Cormorant Garamond", Georgia, serif';
      wrapText(ctx, '“ [ State reason for promotion ] ”', cx, y, 920, 30);
    }

    ctx.restore();
  }

  function drawWaxSealAndSignature(w, h) {
    const bottomY = h - 170;

    // 1. Date of Decree (Left-Center above seal)
    ctx.save();
    ctx.fillStyle = '#5c4327';
    ctx.font = 'italic 500 18px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'left';
    const dateText = state.citationDate && state.citationDate.trim() 
      ? state.citationDate.trim() 
      : 'Given under arms at Imperial Headquarters';
    ctx.fillText(dateText, 120, bottomY - 35);
    ctx.restore();

    // 2. Imperial Wax Seal (Bottom Left) stamped with VA monogram!
    drawWaxSeal(190, bottomY + 45, state.sealColor);

    // 3. Promoter Authority & Drawn Signature (Bottom Right)
    const sigX = w - 420;
    const sigY = bottomY;

    ctx.save();
    ctx.textAlign = 'center';

    // Authority Label in English
    ctx.fillStyle = '#4a3620';
    ctx.font = 'italic 600 19px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('By Order of the Commanding Authority :', sigX + 140, sigY - 45);

    // Stamping the Drawn Signature from sigCanvas!
    if (state.hasSignature) {
      ctx.drawImage(sigCanvas, sigX, sigY - 40, 280, 78);
    }

    // Vintage Dotted Signature Line
    ctx.strokeStyle = '#73532c';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sigX - 10, sigY + 38);
    ctx.lineTo(sigX + 290, sigY + 38);
    ctx.stroke();
    ctx.setLineDash([]);

    // Promoter Rank and Name
    const promoterRank = state.promoterRank && state.promoterRank.trim() ? state.promoterRank.trim() : '';
    const promoterName = state.promoterName && state.promoterName.trim() ? state.promoterName.trim() : '';
    const fullPromoter = (promoterRank || promoterName) ? `${promoterRank} ${promoterName}`.trim() : '[ Promoter Rank & Name ]';

    ctx.fillStyle = (promoterRank || promoterName) ? '#1c1005' : '#9b8260';
    ctx.font = (promoterRank || promoterName) ? '700 21px "Cinzel", serif' : 'italic 500 20px "Cormorant Garamond", serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(fullPromoter, sigX + 140, sigY + 64);

    ctx.fillStyle = '#7a5a2d';
    ctx.font = '600 13px "Cinzel", serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('COMMANDING OFFICER • OFFICIAL SEAL', sigX + 140, sigY + 84);

    ctx.restore();
  }

  function drawWaxSeal(x, y, colorType) {
    ctx.save();
    ctx.translate(x, y);

    // 1. Folded Imperial Ribbon beneath Seal
    ctx.fillStyle = '#1a2744'; // Imperial Navy Blue Ribbon
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-32, 70);
    ctx.lineTo(-12, 60);
    ctx.lineTo(-4, 72);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9e2a2b'; // Crimson Red Ribbon
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(4, 72);
    ctx.lineTo(16, 60);
    ctx.lineTo(34, 70);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();

    // 2. 3D Wax Seal Circle
    const baseColor = colorType === 'gold' ? '#c69214' : '#9e1b1b';
    const darkEdge = colorType === 'gold' ? '#785607' : '#570a0a';
    const highlight = colorType === 'gold' ? '#ffd868' : '#e04848';

    // Outer molten uneven rim
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fillStyle = darkEdge;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Inner wax body
    const waxGrad = ctx.createRadialGradient(-12, -12, 5, 0, 0, 48);
    waxGrad.addColorStop(0, highlight);
    waxGrad.addColorStop(0.4, baseColor);
    waxGrad.addColorStop(1, darkEdge);
    ctx.fillStyle = waxGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();

    // Stamped Crest in Wax
    ctx.strokeStyle = darkEdge;
    ctx.fillStyle = darkEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();

    // Stamped Imperial Monogram "VA" (Varangian)
    ctx.font = '700 28px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VA', 0, 2);

    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  // --- 5. EXPORT & DOWNLOAD ---
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function downloadPaper(format = 'image/png', ext = 'png') {
    const link = document.createElement('a');
    const safeSoldier = (state.promotedName || 'promotion').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `va_imperial_promotion_${safeSoldier}.${ext}`;
    link.href = paperCanvas.toDataURL(format, 0.96);
    link.click();
    showToast(`Decree saved as ${link.download}`);
  }

  document.getElementById('downloadPngBtn').addEventListener('click', () => downloadPaper('image/png', 'png'));
  document.getElementById('downloadJpgBtn').addEventListener('click', () => downloadPaper('image/jpeg', 'jpg'));

  document.getElementById('copyImgBtn').addEventListener('click', async () => {
    try {
      paperCanvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Decree copied to clipboard! Paste directly into Discord.');
      });
    } catch {
      showToast('Clipboard access restricted. Use "Download High-Res PNG" instead.');
    }
  });

  // Load fonts and initial draw
  document.fonts.ready.then(() => {
    renderPaper();
  });
});
