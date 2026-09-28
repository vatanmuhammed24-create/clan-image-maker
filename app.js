/**
 * ClanForge - Canvas Image & Banner Generator Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Canvas Elements
  const canvas = document.getElementById('clanCanvas');
  const ctx = canvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const canvasStage = document.getElementById('canvasStage');
  const canvasDimLabel = document.getElementById('canvasDimLabel');
  const zoomLevelText = document.getElementById('zoomLevelText');
  const toast = document.getElementById('toast');

  // State
  const state = {
    width: 600,
    height: 600,
    preset: 'discord-avatar',
    zoom: 1,
    
    // Text & Clan
    clanTag: '[VALOR]',
    clanName: 'SHADOW VANGUARD',
    playerName: 'PHANTOM',
    playerRole: 'CLAN LEADER',
    tagline: 'STRIKE FROM THE SHADOWS',
    font: 'Rajdhani',
    primaryColor: '#00f3ff',
    secondaryColor: '#7000ff',
    glowIntensity: 18,

    // Background
    bgImage: null,
    bgDarkness: 65,
    pattern: 'hex',
    patternOpacity: 20,

    // Logo & Emblem
    customLogo: null,
    emblem: 'shield',
    logoSize: 130,
    logoYOffset: 0,

    // Border & FX
    frameStyle: 'corners',
    borderWidth: 3,
    scanlines: true,
    noise: true,
    watermark: true
  };

  // Themes
  const themes = {
    'neon-cyan': { primary: '#00f3ff', secondary: '#7000ff' },
    'blood-red': { primary: '#ff0055', secondary: '#800020' },
    'cyber-gold': { primary: '#ffd700', secondary: '#ff8800' },
    'stealth-purple': { primary: '#b5179e', secondary: '#480ca8' },
    'emerald-tac': { primary: '#00ff88', secondary: '#006644' }
  };

  // --- TAB NAVIGATION ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // --- PRESET SELECTION ---
  const presetCards = document.querySelectorAll('.preset-card');
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      state.width = parseInt(card.dataset.w, 10);
      state.height = parseInt(card.dataset.h, 10);
      state.preset = card.dataset.preset;

      updateCanvasDimensions();
      fitZoom();
      render();
    });
  });

  // --- THEME CHIPS ---
  const themeChips = document.querySelectorAll('.theme-chip');
  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = themes[chip.dataset.theme];
      if (theme) {
        state.primaryColor = theme.primary;
        state.secondaryColor = theme.secondary;
        document.getElementById('primaryColor').value = theme.primary;
        document.getElementById('secondaryColor').value = theme.secondary;
        render();
      }
    });
  });

  // --- FORM BINDINGS ---
  function bindInput(id, stateKey, parser = v => v, eventName = 'input') {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(eventName, e => {
      state[stateKey] = parser(e.target.value);
      render();
    });
  }

  function bindCheckbox(id, stateKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', e => {
      state[stateKey] = e.target.checked;
      render();
    });
  }

  bindInput('clanTagInput', 'clanTag');
  bindInput('clanNameInput', 'clanName');
  bindInput('playerNameInput', 'playerName');
  bindInput('playerRoleInput', 'playerRole');
  bindInput('taglineInput', 'tagline');
  bindInput('fontSelect', 'font', v => v, 'change');
  bindInput('primaryColor', 'primaryColor');
  bindInput('secondaryColor', 'secondaryColor');
  bindInput('glowIntensity', 'glowIntensity', parseInt);
  bindInput('bgDarkness', 'bgDarkness', parseInt);
  bindInput('patternOpacity', 'patternOpacity', parseInt);
  bindInput('logoSize', 'logoSize', parseInt);
  bindInput('logoYOffset', 'logoYOffset', parseInt);
  bindInput('borderWidth', 'borderWidth', parseInt);

  bindCheckbox('scanlinesToggle', 'scanlines');
  bindCheckbox('noiseToggle', 'noise');
  bindCheckbox('watermarkToggle', 'watermark');

  // Toggle Groups (Pattern, Frame, Emblem)
  function setupToggleGroup(selector, stateKey) {
    const btns = document.querySelectorAll(selector);
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state[stateKey] = btn.dataset[Object.keys(btn.dataset)[0]];
        render();
      });
    });
  }

  setupToggleGroup('.button-toggle-group [data-pattern]', 'pattern');
  setupToggleGroup('.button-toggle-group [data-frame]', 'frameStyle');
  setupToggleGroup('.emblem-grid [data-emblem]', 'emblem');

  // --- IMAGE UPLOADS ---
  const bgUpload = document.getElementById('bgImageUpload');
  const removeBgBtn = document.getElementById('removeBgImageBtn');
  bgUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          state.bgImage = img;
          removeBgBtn.style.display = 'inline-block';
          render();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  removeBgBtn.addEventListener('click', () => {
    state.bgImage = null;
    bgUpload.value = '';
    removeBgBtn.style.display = 'none';
    render();
  });

  const logoUpload = document.getElementById('clanLogoUpload');
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  logoUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          state.customLogo = img;
          removeLogoBtn.style.display = 'inline-block';
          render();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  removeLogoBtn.addEventListener('click', () => {
    state.customLogo = null;
    logoUpload.value = '';
    removeLogoBtn.style.display = 'none';
    render();
  });

  // --- ZOOM & SIZING ---
  function updateCanvasDimensions() {
    canvas.width = state.width;
    canvas.height = state.height;
    canvasDimLabel.textContent = `${state.width} × ${state.height} px`;
  }

  function setZoom(z) {
    state.zoom = Math.max(0.2, Math.min(2.5, z));
    canvasWrapper.style.transform = `scale(${state.zoom})`;
    zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function fitZoom() {
    const stageWidth = canvasStage.clientWidth - 60;
    const stageHeight = canvasStage.clientHeight - 60;
    if (stageWidth <= 0 || stageHeight <= 0) return;
    const fitScale = Math.min(stageWidth / state.width, stageHeight / state.height, 1);
    setZoom(fitScale);
  }

  document.getElementById('zoomInBtn').addEventListener('click', () => setZoom(state.zoom + 0.1));
  document.getElementById('zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - 0.1));
  document.getElementById('zoomFitBtn').addEventListener('click', fitZoom);
  window.addEventListener('resize', fitZoom);

  // --- RENDERING ENGINE ---
  function render() {
    const { width, height } = state;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Base Background Gradient
    const bgGrad = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    bgGrad.addColorStop(0, '#151924');
    bgGrad.addColorStop(0.6, '#0d1017');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Custom Uploaded Wallpaper (if any)
    if (state.bgImage) {
      const img = state.bgImage;
      const hRatio = width / img.width;
      const vRatio = height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (width - img.width * ratio) / 2;
      const centerShiftY = (height - img.height * ratio) / 2;

      ctx.save();
      ctx.drawImage(img, 0, 0, img.width, img.height,
                    centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      ctx.restore();
    }

    // 3. Draw Darkness Overlay & Lighting
    const darkness = state.bgDarkness / 100;
    ctx.fillStyle = `rgba(5, 7, 10, ${darkness})`;
    ctx.fillRect(0, 0, width, height);

    // Dynamic colored ambient lights
    const glowL = ctx.createRadialGradient(width * 0.2, height * 0.3, 0, width * 0.2, height * 0.3, width * 0.5);
    glowL.addColorStop(0, hexToRgba(state.primaryColor, 0.25));
    glowL.addColorStop(1, 'transparent');
    ctx.fillStyle = glowL;
    ctx.fillRect(0, 0, width, height);

    const glowR = ctx.createRadialGradient(width * 0.8, height * 0.7, 0, width * 0.8, height * 0.7, width * 0.5);
    glowR.addColorStop(0, hexToRgba(state.secondaryColor, 0.25));
    glowR.addColorStop(1, 'transparent');
    ctx.fillStyle = glowR;
    ctx.fillRect(0, 0, width, height);

    // 4. Background Pattern
    if (state.pattern !== 'none' && state.patternOpacity > 0) {
      drawPattern(ctx, width, height, state.pattern, state.patternOpacity / 100, state.primaryColor);
    }

    // 5. Border / Frame
    if (state.frameStyle !== 'none') {
      drawFrame(ctx, width, height, state.frameStyle, state.borderWidth, state.primaryColor, state.secondaryColor);
    }

    // 6. Clan Logo / Emblem
    const centerX = width / 2;
    const isBanner = width / height >= 1.5;
    const centerY = isBanner ? height / 2 + state.logoYOffset : height * 0.36 + state.logoYOffset;

    if (state.customLogo) {
      const s = state.logoSize;
      const lRatio = Math.min(s / state.customLogo.width, s / state.customLogo.height);
      const lw = state.customLogo.width * lRatio;
      const lh = state.customLogo.height * lRatio;

      ctx.save();
      ctx.shadowColor = state.primaryColor;
      ctx.shadowBlur = state.glowIntensity;
      ctx.drawImage(state.customLogo, centerX - lw / 2, centerY - lh / 2, lw, lh);
      ctx.restore();
    } else if (state.emblem !== 'none') {
      drawVectorEmblem(ctx, centerX, centerY, state.logoSize, state.emblem, state.primaryColor, state.secondaryColor, state.glowIntensity);
    }

    // 7. Typography & Clan Info
    drawTypography(ctx, width, height, state, centerX, centerY, isBanner);

    // 8. Cyberpunk Scanlines
    if (state.scanlines) {
      drawScanlines(ctx, width, height);
    }

    // 9. Film Grain / Subtle Noise
    if (state.noise) {
      drawNoise(ctx, width, height);
    }

    // 10. Watermark / Stamp
    if (state.watermark) {
      drawWatermark(ctx, width, height, state.primaryColor);
    }
  }

  // --- DRAWING HELPERS ---
  function drawPattern(ctx, w, h, type, opacity, color) {
    ctx.save();
    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.fillStyle = hexToRgba(color, opacity);
    ctx.lineWidth = 1;

    if (type === 'grid') {
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (type === 'dots') {
      const step = 30;
      for (let x = step / 2; x < w; x += step) {
        for (let y = step / 2; y < h; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'hex') {
      const size = 32;
      const hStep = size * Math.sqrt(3);
      const vStep = size * 1.5;
      for (let row = -1; row * vStep < h + size; row++) {
        for (let col = -1; col * hStep < w + size; col++) {
          const cx = col * hStep + (row % 2 === 0 ? 0 : hStep / 2);
          const cy = row * vStep;
          drawHexagon(ctx, cx, cy, size * 0.85);
        }
      }
    }
    ctx.restore();
  }

  function drawHexagon(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawFrame(ctx, w, h, style, thickness, color1, color2) {
    const pad = 24;
    ctx.save();
    ctx.lineWidth = thickness;

    if (style === 'glow-border') {
      ctx.strokeStyle = color1;
      ctx.shadowColor = color1;
      ctx.shadowBlur = 12;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    } else if (style === 'corners') {
      const len = Math.min(w, h) * 0.12;
      ctx.strokeStyle = color1;
      ctx.shadowColor = color1;
      ctx.shadowBlur = 10;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(pad, pad + len);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + len, pad);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(w - pad - len, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + len);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(w - pad, h - pad - len);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad - len, h - pad);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(pad + len, h - pad);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad, h - pad - len);
      ctx.stroke();
    } else if (style === 'double') {
      ctx.strokeStyle = color1;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.strokeStyle = color2;
      ctx.strokeRect(pad + 8, pad + 8, w - (pad + 8) * 2, h - (pad + 8) * 2);
    }
    ctx.restore();
  }

  function drawVectorEmblem(ctx, x, y, size, emblem, c1, c2, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = c1;
    ctx.shadowBlur = glow;
    ctx.strokeStyle = c1;
    ctx.fillStyle = c2;
    ctx.lineWidth = 4;
    const r = size / 2;

    if (emblem === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.85, -r * 0.7);
      ctx.lineTo(r * 0.75, r * 0.25);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.75, r * 0.25);
      ctx.lineTo(-r * 0.85, -r * 0.7);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(c2, 0.4);
      ctx.fill();
      ctx.stroke();

      // Inner Crest
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(r * 0.45, -r * 0.4);
      ctx.lineTo(0, r * 0.6);
      ctx.lineTo(-r * 0.45, -r * 0.4);
      ctx.closePath();
      ctx.fillStyle = c1;
      ctx.fill();
    } else if (emblem === 'swords') {
      ctx.lineCap = 'round';
      // Sword 1
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.7);
      ctx.lineTo(r * 0.7, r * 0.7);
      ctx.stroke();
      // Crossguard 1
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.2);
      ctx.lineTo(-r * 0.2, -r * 0.4);
      ctx.stroke();

      // Sword 2
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.7);
      ctx.lineTo(-r * 0.7, r * 0.7);
      ctx.stroke();
      // Crossguard 2
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.2);
      ctx.lineTo(r * 0.2, -r * 0.4);
      ctx.stroke();
    } else if (emblem === 'crown') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.5);
      ctx.lineTo(-r * 0.9, -r * 0.3);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(0, -r * 0.7);
      ctx.lineTo(r * 0.4, 0);
      ctx.lineTo(r * 0.9, -r * 0.3);
      ctx.lineTo(r * 0.8, r * 0.5);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(c1, 0.35);
      ctx.fill();
      ctx.stroke();
    } else if (emblem === 'crosshair') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      // Reticle lines
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.9);
      ctx.moveTo(-r * 0.9, 0);
      ctx.lineTo(r * 0.9, 0);
      ctx.stroke();
    } else if (emblem === 'skull') {
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Jaw
      ctx.fillRect(-r * 0.3, r * 0.3, r * 0.6, r * 0.35);
      ctx.strokeRect(-r * 0.3, r * 0.3, r * 0.6, r * 0.35);
      // Eye sockets
      ctx.fillStyle = '#05070a';
      ctx.beginPath();
      ctx.arc(-r * 0.22, -r * 0.15, r * 0.16, 0, Math.PI * 2);
      ctx.arc(r * 0.22, -r * 0.15, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTypography(ctx, w, h, state, cx, cy, isBanner) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontFam = state.font;

    if (isBanner) {
      // Horizontal Banner Layout
      const textX = w * 0.58;
      const textY = h * 0.42;

      // 1. Clan Tag
      if (state.clanTag) {
        ctx.font = `700 ${h * 0.08}px ${fontFam}`;
        ctx.fillStyle = state.primaryColor;
        ctx.shadowColor = state.primaryColor;
        ctx.shadowBlur = state.glowIntensity;
        ctx.fillText(state.clanTag, textX, textY - h * 0.18);
      }

      // 2. Clan Name
      if (state.clanName) {
        ctx.font = `900 ${h * 0.16}px ${fontFam}`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = state.primaryColor;
        ctx.shadowBlur = state.glowIntensity * 1.2;
        ctx.fillText(state.clanName, textX, textY);
      }

      // 3. Player Name & Role
      let subY = textY + h * 0.16;
      if (state.playerName) {
        ctx.font = `700 ${h * 0.09}px ${fontFam}`;
        ctx.fillStyle = '#f1f5f9';
        ctx.shadowBlur = 0;
        const fullPlayer = state.playerRole ? `${state.playerName} • ${state.playerRole}` : state.playerName;
        ctx.fillText(fullPlayer, textX, subY);
        subY += h * 0.11;
      }

      // 4. Tagline
      if (state.tagline) {
        ctx.font = `600 ${h * 0.055}px ${fontFam}`;
        ctx.fillStyle = hexToRgba('#ffffff', 0.65);
        ctx.letterSpacing = '2px';
        ctx.fillText(state.tagline.toUpperCase(), textX, subY);
      }
    } else {
      // Square or Portrait Layout (Avatar / Card)
      let textY = cy + state.logoSize / 2 + (h * 0.08);

      // 1. Clan Tag
      if (state.clanTag) {
        ctx.font = `700 ${h * 0.045}px ${fontFam}`;
        ctx.fillStyle = state.primaryColor;
        ctx.shadowColor = state.primaryColor;
        ctx.shadowBlur = state.glowIntensity;
        ctx.fillText(state.clanTag, cx, textY);
        textY += h * 0.07;
      }

      // 2. Clan Name
      if (state.clanName) {
        ctx.font = `900 ${h * 0.085}px ${fontFam}`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = state.primaryColor;
        ctx.shadowBlur = state.glowIntensity * 1.2;
        ctx.fillText(state.clanName, cx, textY);
        textY += h * 0.085;
      }

      // 3. Player Name
      if (state.playerName) {
        ctx.font = `700 ${h * 0.065}px ${fontFam}`;
        ctx.fillStyle = '#f1f5f9';
        ctx.shadowBlur = 0;
        ctx.fillText(state.playerName, cx, textY);
        textY += h * 0.055;
      }

      // 4. Player Role
      if (state.playerRole) {
        ctx.font = `600 ${h * 0.038}px ${fontFam}`;
        ctx.fillStyle = state.primaryColor;
        ctx.fillText(state.playerRole, cx, textY);
        textY += h * 0.055;
      }

      // 5. Tagline
      if (state.tagline) {
        ctx.font = `500 ${h * 0.032}px ${fontFam}`;
        ctx.fillStyle = hexToRgba('#ffffff', 0.6);
        ctx.fillText(state.tagline.toUpperCase(), cx, textY);
      }
    }
    ctx.restore();
  }

  function drawScanlines(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
    ctx.restore();
  }

  function drawNoise(ctx, w, h) {
    ctx.save();
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 120;
    grainCanvas.height = 120;
    const gCtx = grainCanvas.getContext('2d');
    const imgData = gCtx.createImageData(120, 120);
    const buffer = new Uint32Array(imgData.data.buffer);
    for (let i = 0; i < buffer.length; i++) {
      if (Math.random() < 0.12) {
        buffer[i] = 0x14ffffff; // subtle white speck
      }
    }
    gCtx.putImageData(imgData, 0, 0);
    const pat = ctx.createPattern(grainCanvas, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawWatermark(ctx, w, h, color) {
    ctx.save();
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillStyle = hexToRgba(color, 0.4);
    ctx.textAlign = 'right';
    ctx.fillText('CLANFORGE VERIFIED', w - 24, h - 14);
    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  // --- EXPORT & COPY ---
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function downloadCanvas(type = 'image/png', ext = 'png') {
    const link = document.createElement('a');
    const safeClanName = (state.clanName || 'clan').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeClanName}_${state.preset}.${ext}`;
    link.href = canvas.toDataURL(type, 0.95);
    link.click();
    showToast(`Saved as ${link.download}`);
  }

  document.getElementById('downloadPngBtn').addEventListener('click', () => downloadCanvas('image/png', 'png'));
  document.getElementById('downloadJpgBtn').addEventListener('click', () => downloadCanvas('image/jpeg', 'jpg'));

  document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
      canvas.toBlob(async blob => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Image copied! Ready to paste in Discord (Ctrl+V)');
      });
    } catch (err) {
      console.error(err);
      showToast('Could not copy directly. Please use Download PNG.');
    }
  });

  // Initial setup
  updateCanvasDimensions();
  // Ensure fonts loaded before first draw
  document.fonts.ready.then(() => {
    fitZoom();
    render();
  });
});
