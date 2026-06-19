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

        // Set Mutually Exclusive Broker Connection UI state
        const btnExnessToggle = document.getElementById('btn-exness-toggle');
        const exnessStatus = document.getElementById('exness-status');
        const btnAngelOneToggle = document.getElementById('btn-angelone-toggle');
        const angelOneStatus = document.getElementById('angelone-status');

        if (btnExnessToggle && exnessStatus && btnAngelOneToggle && angelOneStatus) {
          if (user.isExnessConnected) {
            // Exness is Active
            btnExnessToggle.textContent = 'Disconnect';
            btnExnessToggle.style.borderColor = '#ff3333';
            btnExnessToggle.style.color = '#ff3333';
            exnessStatus.textContent = 'Active';
            exnessStatus.className = 'broker-status active';

            // AngelOne is InActive
            btnAngelOneToggle.innerHTML = 'Connect';
            btnAngelOneToggle.style.borderColor = '#0066ff';
            btnAngelOneToggle.style.color = '#0066ff';
            angelOneStatus.textContent = 'InActive';
            angelOneStatus.className = 'broker-status inactive';
          } else {
            // Exness is InActive
            btnExnessToggle.textContent = 'Connect';
            btnExnessToggle.style.borderColor = '#ffc800';
            btnExnessToggle.style.color = '#ffc800';
            exnessStatus.textContent = 'InActive';
            exnessStatus.className = 'broker-status inactive';

            if (user.isAngelOneConnected) {
              // AngelOne is Active
              btnAngelOneToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg> Disconnect`;
              btnAngelOneToggle.style.borderColor = '#ff3333';
              btnAngelOneToggle.style.color = '#ff3333';
              angelOneStatus.textContent = 'Active';
              angelOneStatus.className = 'broker-status active';
            } else {
              // AngelOne is InActive
              btnAngelOneToggle.innerHTML = 'Connect';
              btnAngelOneToggle.style.borderColor = '#0066ff';
              btnAngelOneToggle.style.color = '#0066ff';
              angelOneStatus.textContent = 'InActive';
              angelOneStatus.className = 'broker-status inactive';
            }
          }
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

  // 5. Exness Disconnect Logic
  const btnExnessToggle = document.getElementById('btn-exness-toggle');
  const exnessStatus = document.getElementById('exness-status');
  const angelOneStatus = document.getElementById('angelone-status');

  if (btnExnessToggle) {
    btnExnessToggle.addEventListener('click', async () => {
      if (btnExnessToggle.textContent.trim() === 'Connect') {
        window.location.href = 'signup.html';
        return;
      }

      btnExnessToggle.textContent = 'Disconnecting...';
      btnExnessToggle.disabled = true;

      try {
        const res = await fetch('http://localhost:5000/api/exness/disconnect', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          btnExnessToggle.textContent = 'Connect';
          btnExnessToggle.disabled = false;
          exnessStatus.textContent = 'InActive';
          exnessStatus.className = 'broker-status inactive';
          
          // Re-fetch settings to automatically toggle AngelOne back to Active
          fetchSettings();
          
          alert('Exness account disconnected securely.');
        } else {
          alert('Failed to disconnect: ' + data.message);
          btnExnessToggle.textContent = 'Disconnect';
          btnExnessToggle.disabled = false;
        }
      } catch (err) {
        console.error('Error disconnecting Exness:', err);
        alert('Server error: ' + err.message);
        btnExnessToggle.textContent = 'Disconnect';
        btnExnessToggle.disabled = false;
      }
    });
  }

  // 6. AngelOne Toggle Logic
  const btnAngelOneToggleGlobal = document.getElementById('btn-angelone-toggle');
  if (btnAngelOneToggleGlobal) {
    btnAngelOneToggleGlobal.addEventListener('click', () => {
      if (btnAngelOneToggleGlobal.textContent.trim() === 'Connect') {
        window.location.href = 'signup.html';
      } else {
        // Disconnect logic for AngelOne can be added here in the future
        alert('To disconnect AngelOne, please revoke access from your broker portal.');
      }
    });
  }

  // Init
  fetchSettings();
});
