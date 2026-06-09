document.addEventListener('DOMContentLoaded', () => {
  // Set Current Date and Time (Dynamic)
  function updateDateTime() {
    const datetimeSpan = document.getElementById('current-datetime');
    if (datetimeSpan) {
      const now = new Date();
      const options = { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: false 
      };
      datetimeSpan.textContent = now.toLocaleString('en-GB', options).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Handle Theme Toggling
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;
  
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    body.classList.add('dark-theme');
    if (themeButtons.length >= 2) {
      themeButtons[0].classList.remove('active');
      themeButtons[1].classList.add('active');
    }
  }

  if (themeButtons.length >= 2) {
    themeButtons[0].addEventListener('click', () => {
      body.classList.remove('dark-theme');
      themeButtons[0].classList.add('active');
      themeButtons[1].classList.remove('active');
      localStorage.setItem('theme', 'light');
    });

    themeButtons[1].addEventListener('click', () => {
      body.classList.add('dark-theme');
      themeButtons[1].classList.add('active');
      themeButtons[0].classList.remove('active');
      localStorage.setItem('theme', 'dark');
    });
  }

  // --- Backend Settings Integration ---
  const token = localStorage.getItem('nextunToken');
  if (!token) {
    window.location.href = 'index.html'; // Redirect if not logged in
    return;
  }

  // DOM Elements
  const usernameInput = document.getElementById('setting-username');
  const emailInput = document.getElementById('setting-email');
  const saveProfileBtn = document.getElementById('btn-save-profile');
  const changePasswordBtn = document.getElementById('btn-change-password');
  
  // Toggles
  const toggles = {
    is2FAEnabled: document.getElementById('toggle-2fa'),
    emailTradeConfirmations: document.getElementById('toggle-email-trade'),
    emailDailySummary: document.getElementById('toggle-email-daily'),
    emailStrategyUpdates: document.getElementById('toggle-email-strategy'),
    pushTradeExecutions: document.getElementById('toggle-push-trade'),
    pushPriceAlerts: document.getElementById('toggle-push-price'),
    pushMarketNews: document.getElementById('toggle-push-news'),
  };

  // 1. Fetch User Settings
  async function fetchSettings() {
    try {
      const res = await fetch('http://localhost:5000/api/user/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const user = data.data;
        if (usernameInput) usernameInput.value = user.username || '';
        if (emailInput) emailInput.value = user.email || '';
        
        if (toggles.is2FAEnabled) toggles.is2FAEnabled.checked = user.is2FAEnabled;
        
        if (user.notifications) {
          if (toggles.emailTradeConfirmations) toggles.emailTradeConfirmations.checked = user.notifications.emailTradeConfirmations;
          if (toggles.emailDailySummary) toggles.emailDailySummary.checked = user.notifications.emailDailySummary;
          if (toggles.emailStrategyUpdates) toggles.emailStrategyUpdates.checked = user.notifications.emailStrategyUpdates;
          if (toggles.pushTradeExecutions) toggles.pushTradeExecutions.checked = user.notifications.pushTradeExecutions;
          if (toggles.pushPriceAlerts) toggles.pushPriceAlerts.checked = user.notifications.pushPriceAlerts;
          if (toggles.pushMarketNews) toggles.pushMarketNews.checked = user.notifications.pushMarketNews;
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  // 2. Update Profile (Username/Email)
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const username = usernameInput.value;
      const email = emailInput.value;
      
      saveProfileBtn.textContent = 'Saving...';
      try {
        const res = await fetch('http://localhost:5000/api/user/settings', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ username, email })
        });
        const data = await res.json();
        if (data.success) {
          saveProfileBtn.textContent = 'Saved!';
          setTimeout(() => saveProfileBtn.textContent = 'Save', 2000);
        } else {
          alert('Failed to update profile: ' + data.message);
          saveProfileBtn.textContent = 'Save';
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        saveProfileBtn.textContent = 'Save';
      }
    });
  }

  // 3. Auto-save Toggles
  const saveToggles = async () => {
    const payload = {
      is2FAEnabled: toggles.is2FAEnabled ? toggles.is2FAEnabled.checked : false,
      notifications: {
        emailTradeConfirmations: toggles.emailTradeConfirmations ? toggles.emailTradeConfirmations.checked : true,
        emailDailySummary: toggles.emailDailySummary ? toggles.emailDailySummary.checked : false,
        emailStrategyUpdates: toggles.emailStrategyUpdates ? toggles.emailStrategyUpdates.checked : true,
        pushTradeExecutions: toggles.pushTradeExecutions ? toggles.pushTradeExecutions.checked : true,
        pushPriceAlerts: toggles.pushPriceAlerts ? toggles.pushPriceAlerts.checked : true,
        pushMarketNews: toggles.pushMarketNews ? toggles.pushMarketNews.checked : true,
      }
    };

    try {
      await fetch('http://localhost:5000/api/user/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Error updating toggles:', error);
    }
  };

  // Attach change listeners to all toggles
  Object.values(toggles).forEach(toggle => {
    if (toggle) {
      toggle.addEventListener('change', saveToggles);
    }
  });

  // 4. Change Password Modal Logic
  const passwordModal = document.getElementById('password-modal');
  const closePasswordModal = document.getElementById('close-password-modal');
  const submitPasswordBtn = document.getElementById('submit-password-btn');
  const currentPasswordInput = document.getElementById('current-password-input');
  const newPasswordInput = document.getElementById('new-password-input');

  if (changePasswordBtn && passwordModal) {
    changePasswordBtn.addEventListener('click', () => {
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      passwordModal.style.display = 'flex';
    });
    
    closePasswordModal.addEventListener('click', () => {
      passwordModal.style.display = 'none';
    });

    submitPasswordBtn.addEventListener('click', async () => {
      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      
      if (!currentPassword || !newPassword) {
        alert("Please fill in both fields");
        return;
      }

      submitPasswordBtn.textContent = 'Updating...';
      try {
        const res = await fetch('http://localhost:5000/api/user/password', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          alert("Password updated successfully!");
          passwordModal.style.display = 'none';
        } else {
          alert("Failed to update password: " + data.message);
        }
      } catch (error) {
        console.error('Error updating password:', error);
        alert("An error occurred while updating the password.");
      }
      submitPasswordBtn.textContent = 'Update Password';
    });
  }

  // Init
  fetchSettings();
});
