document.addEventListener('DOMContentLoaded', () => {
  // Set current date/time
  const datetimeSpan = document.getElementById('current-datetime');
  if (datetimeSpan) {
    const now = new Date();
    // Format: 28/11/2024, 17:56
    const options = { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    };
    datetimeSpan.textContent = now.toLocaleString('en-GB', options);
  }

  // Handle Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear token
      localStorage.removeItem('nextun_token');
      // Redirect back to login screen
      window.location.href = 'index.html';
    });
  }

  // Handle Theme Toggle
  const themeBtns = document.querySelectorAll('.theme-btn');
  if (themeBtns.length >= 2) {
    const lightBtn = themeBtns[0];
    const darkBtn = themeBtns[1];

    lightBtn.addEventListener('click', () => {
      document.body.classList.remove('dark-theme');
      lightBtn.classList.add('active');
      darkBtn.classList.remove('active');
    });

    darkBtn.addEventListener('click', () => {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
    });
  }

  // --- AngelOne Connect Modal Logic ---
  const connectBtn = document.getElementById('broker-connect-btn');
  const connectModal = document.getElementById('connect-broker-modal');
  const closeBtn = document.getElementById('close-broker-modal');
  const connectForm = document.getElementById('angelone-connect-form');
  const connectMessage = document.getElementById('connect-message');
  const submitBtn = document.getElementById('angel-submit-btn');

  if (connectBtn && connectModal) {
    connectBtn.addEventListener('click', () => {
      connectModal.style.display = 'flex';
    });
  }

  if (closeBtn && connectModal) {
    closeBtn.addEventListener('click', () => {
      connectModal.style.display = 'none';
      connectMessage.style.display = 'none'; // reset message
    });
  }

  if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const clientId = document.getElementById('angel-client-id').value;
      const pin = document.getElementById('angel-pin').value;
      const totp = document.getElementById('angel-totp').value;
      
      // Basic UI feedback
      submitBtn.textContent = 'Connecting...';
      submitBtn.disabled = true;
      connectMessage.style.display = 'none';
      
      try {
        const response = await fetch('http://localhost:5000/api/angelone/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ clientId, pin, totp })
        });
        
        const data = await response.json();
        
        connectMessage.style.display = 'block';
        if (data.success) {
          connectMessage.style.color = 'var(--green)';
          connectMessage.textContent = 'Successfully connected! (Data fetch will be active once API keys are added)';
          // Optionally change the main button to "Connected"
          connectBtn.textContent = 'Connected to AngelOne';
          connectBtn.classList.remove('btn-outline');
          connectBtn.style.background = 'var(--green)';
          connectBtn.style.color = 'white';
          
          setTimeout(() => {
            connectModal.style.display = 'none';
          }, 2000);
        } else {
          connectMessage.style.color = 'var(--red)';
          connectMessage.textContent = data.message || 'Failed to connect. Please check your credentials.';
        }
      } catch (error) {
        console.error('Error connecting to broker:', error);
        connectMessage.style.display = 'block';
        connectMessage.style.color = 'var(--red)';
        connectMessage.textContent = 'Server error. Please ensure backend is running.';
      } finally {
        submitBtn.textContent = 'Connect Account';
        submitBtn.disabled = false;
      }
    });
  }
});
