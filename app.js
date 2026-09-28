document.addEventListener('DOMContentLoaded', () => {
  const CORRECT_PASSWORD = 'varangian199';

  const loginScreen = document.getElementById('loginScreen');
  const grantedScreen = document.getElementById('grantedScreen');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const lockBtn = document.getElementById('lockBtn');

  // Check if session is already authorized
  if (sessionStorage.getItem('clan_authorized') === 'true') {
    showGranted();
  }

  // Toggle Password Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    if (isPassword) {
      // Eye-off icon
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      // Normal eye icon
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  });

  // Handle Login Submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPassword = passwordInput.value.trim();

    if (enteredPassword === CORRECT_PASSWORD) {
      errorMessage.textContent = '';
      sessionStorage.setItem('clan_authorized', 'true');
      showGranted();
    } else {
      showError('Incorrect password. Access denied.');
    }
  });

  // Display Error with Shake Effect
  function showError(msg) {
    errorMessage.textContent = msg;
    loginScreen.classList.remove('shake');
    // Force DOM reflow to re-trigger animation
    void loginScreen.offsetWidth;
    loginScreen.classList.add('shake');
    passwordInput.focus();
    passwordInput.select();
  }

  // Switch to Access Granted Screen
  function showGranted() {
    loginScreen.classList.remove('active');
    grantedScreen.classList.add('active');
  }

  // Lock / Logout
  lockBtn.addEventListener('click', () => {
    sessionStorage.removeItem('clan_authorized');
    passwordInput.value = '';
    errorMessage.textContent = '';
    grantedScreen.classList.remove('active');
    loginScreen.classList.add('active');
    passwordInput.focus();
  });
});
