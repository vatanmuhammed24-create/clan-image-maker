document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const grantedScreen = document.getElementById('grantedScreen');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const submitBtn = document.getElementById('submitBtn');

  // 1. Check Server-Side Session on Load
  checkServerSession();

  async function checkServerSession() {
    try {
      const res = await fetch('/api/portal', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          renderAccessGrantedView(data);
        }
      }
    } catch {
      // Unauthenticated or network error, stay on login gate
    }
  }

  // 2. Toggle Password Visibility (Client UI only)
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

    if (isPassword) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });

  // 3. Handle Form Submission to Server
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value;

    if (!enteredPassword) {
      showError('Please enter password.');
      return;
    }

    setLoading(true);
    errorMessage.textContent = '';

    try {
      // POST to Vercel Serverless Authentication
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ password: enteredPassword })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Fetch protected server payload
        await checkServerSession();
      } else {
        showError(result.error || 'Access denied.');
      }
    } catch {
      showError('Server unreachable. Please verify connection.');
    } finally {
      setLoading(false);
    }
  });

  // 4. Render Server-Delivered Protected View
  function renderAccessGrantedView(data) {
    loginScreen.classList.remove('active');
    grantedScreen.classList.add('active');

    // Build the Access Granted DOM strictly from verified server data
    grantedScreen.innerHTML = `
      <div class="status-indicator">
        <span class="status-dot"></span>
        <span>SESSION ACTIVE</span>
      </div>

      <div class="granted-icon">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>

      <h1 class="granted-title">${escapeHtml(data.title || 'ACCESS GRANTED')}</h1>
      <p class="granted-subtitle">${escapeHtml(data.welcomeMessage || 'Welcome back, Commander.')}</p>

      <div class="granted-content-box">
        <div class="info-row">
          <span class="info-label">Security Clearance</span>
          <span class="info-val yellow-text">${escapeHtml(data.securityClearance || 'LEVEL 1')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-val">${escapeHtml(data.portalStatus || 'Active')}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button id="lockBtn" class="btn-secondary">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Lock Portal
        </button>
      </div>
    `;

    // Bind server-side logout
    document.getElementById('lockBtn').addEventListener('click', async () => {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'same-origin'
        });
      } catch {}

      grantedScreen.innerHTML = '';
      grantedScreen.classList.remove('active');
      loginScreen.classList.add('active');
      passwordInput.value = '';
      errorMessage.textContent = '';
      passwordInput.focus();
    });
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.querySelector('span').textContent = 'VERIFYING...';
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.querySelector('span').textContent = 'ENTER';
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    loginScreen.classList.remove('shake');
    void loginScreen.offsetWidth;
    loginScreen.classList.add('shake');
    passwordInput.focus();
    passwordInput.select();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
