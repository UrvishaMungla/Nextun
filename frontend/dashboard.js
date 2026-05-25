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
});
