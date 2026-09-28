document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const grantedScreen = document.getElementById('grantedScreen');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const submitBtn = document.getElementById('submitBtn');
  const lockBtn = document.getElementById('lockBtn');

  // Verify existing session on load
  const existingToken = sessionStorage.getItem('clan_session_token');
  if (existingToken) {
    if (window.location.protocol.startsWith('http')) {
      fetch('/api/verify', {
        headers: { 'Authorization': `Bearer ${existingToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          showGranted();
        } else {
          sessionStorage.removeItem('clan_session_token');
        }
      })
      .catch(() => {
        // If offline or network issue, maintain authorized view if flagged
        if (sessionStorage.getItem('clan_session_auth') === 'true') {
          showGranted();
        }
      });
    } else if (sessionStorage.getItem('clan_session_auth') === 'true') {
      showGranted();
    }
  }

  // Toggle Password Visibility
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

  // Handle Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value;

    if (!enteredPassword) {
      showError('Please enter the password.');
      return;
    }

    setLoading(true);
    errorMessage.textContent = '';

    try {
      // Production path (on Vercel): Secure Serverless API
      if (window.location.protocol.startsWith('http')) {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: enteredPassword })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          sessionStorage.setItem('clan_session_token', result.token);
          sessionStorage.setItem('clan_session_auth', 'true');
          showGranted();
        } else {
          showError(result.error || 'Access denied. Incorrect password.');
        }
      } else {
        // Local file protocol fallback (e.g. testing double-clicked index.html)
        // Uses SubtleCrypto SHA-256 hash comparison - password still NEVER stored in plaintext!
        const TARGET_HASH = 'f1fe824010238a2d55463040d76df6c427ffc2bc01bac04683b1d1be70849073';
        const msgUint8 = new TextEncoder().encode(enteredPassword.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex === TARGET_HASH) {
          sessionStorage.setItem('clan_session_auth', 'true');
          showGranted();
        } else {
          showError('Access denied. Incorrect password.');
        }
      }
    } catch (err) {
      console.error(err);
      showError('Authentication service unreachable. Please try again.');
    } finally {
      setLoading(false);
    }
  });

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
    // Pure textContent - zero XSS vulnerability
    errorMessage.textContent = msg;
    loginScreen.classList.remove('shake');
    void loginScreen.offsetWidth;
    loginScreen.classList.add('shake');
    passwordInput.focus();
    passwordInput.select();
  }

  function showGranted() {
    loginScreen.classList.remove('active');
    grantedScreen.classList.add('active');
  }

  lockBtn.addEventListener('click', () => {
    sessionStorage.removeItem('clan_session_token');
    sessionStorage.removeItem('clan_session_auth');
    passwordInput.value = '';
    errorMessage.textContent = '';
    grantedScreen.classList.remove('active');
    loginScreen.classList.add('active');
    passwordInput.focus();
  });
});
