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


  // Handle Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear token
      localStorage.removeItem('nextunToken');
      // Redirect back to login screen
      window.location.href = '/';
    });
  }

  // Handle Theme Toggle
  const themeBtns = document.querySelectorAll('.theme-btn');
  if (themeBtns.length >= 2) {
    const lightBtn = themeBtns[0];
    const darkBtn = themeBtns[1];

    // Check if dark theme was previously set
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
    }

    lightBtn.addEventListener('click', () => {
      document.body.classList.remove('dark-theme');
      lightBtn.classList.add('active');
      darkBtn.classList.remove('active');
      localStorage.setItem('theme', 'light');
    });

    darkBtn.addEventListener('click', () => {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
      localStorage.setItem('theme', 'dark');
    });
  }

  // Handle Plan Selection
  const pricingCards = document.querySelectorAll('.pricing-card');
  pricingCards.forEach(card => {
    card.addEventListener('click', () => {
      // 1. Remove selected class from all cards
      pricingCards.forEach(c => {
        c.classList.remove('selected');
        // Reset all buttons to outline and "Get Started"
        const btn = c.querySelector('.plan-btn');
        if (btn) {
          btn.classList.remove('solid');
          btn.classList.add('outline');
        }
      });

      // 2. Add selected class to the clicked card
      card.classList.add('selected');
      // Update its button to solid and "Selected"
      const activeBtn = card.querySelector('.plan-btn');
      if (activeBtn) {
        activeBtn.classList.remove('outline');
        activeBtn.classList.add('solid');
      }
    });
  });
});
