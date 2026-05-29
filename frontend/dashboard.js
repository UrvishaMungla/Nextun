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

  // --- Live Dashboard Data Fetching ---
  async function initDashboard() {
    try {
      const res = await fetch('http://localhost:5000/api/angelone/dashboard');
      const data = await res.json();
      
      if (data.success && data.data) {
        const d = data.data;
        
        // Format Currency Helper
        const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
        
        // 1. Available Funds & Margin
        if (d.rms) {
          const funds = parseFloat(d.rms.availablecash || 0);
          const margin = parseFloat(d.rms.utilisedmargin || 0);
          
          document.getElementById('broker-available-funds').textContent = formatCurrency(funds);
          document.getElementById('broker-margin-used').textContent = formatCurrency(margin);
          
          // Also update the big "Available Margin" card at top right
          const topMarginElem = document.getElementById('metric-available-margin');
          if(topMarginElem) {
             topMarginElem.textContent = formatCurrency(funds);
          }
        }
        
        // 2. Today's P&L, Total P&L, Open Positions
        if (d.positions) {
          document.getElementById('metric-todays-pnl').textContent = formatCurrency(d.positions.todaysPnl);
          // Set color based on profit/loss
          document.getElementById('metric-todays-pnl').className = d.positions.todaysPnl >= 0 ? 'text-green' : 'text-red';
          
          document.getElementById('metric-total-pnl').textContent = formatCurrency(d.positions.totalPnl);
          document.getElementById('metric-total-pnl').className = d.positions.totalPnl >= 0 ? 'text-green' : 'text-red';
          
          document.getElementById('metric-open-positions').textContent = d.positions.openCount;
        }

        // Change connect button state
        const connectBtn = document.getElementById('broker-connect-btn');
        if (connectBtn) {
          connectBtn.textContent = 'Connected to AngelOne';
          connectBtn.classList.remove('btn-outline');
          connectBtn.style.background = 'var(--green)';
          connectBtn.style.color = 'white';
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  }

  // Fetch immediately on load
  initDashboard();
});
