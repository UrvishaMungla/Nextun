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
      const token = localStorage.getItem('nextunToken');
      const res = await fetch('http://localhost:5000/api/angelone/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
  fetchCalendarData();

  // --- Monthly P&L Calendar Logic ---
  async function fetchCalendarData() {
    const token = localStorage.getItem('nextunToken');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/pnl/calendar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        renderCalendar(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    }
  }

  function renderCalendar(records) {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    // Convert records array into a map by date (YYYY-MM-DD)
    const pnlMap = {};
    let netPnl = 0;
    let profitDays = 0;
    let lossDays = 0;

    records.forEach(r => {
      pnlMap[r.date] = r.pnl;
      netPnl += r.pnl;
      if (r.pnl >= 0) profitDays++;
      else lossDays++;
    });

    // Update Summary Metrics
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    
    document.getElementById('summary-net-pnl').textContent = formatCurrency(netPnl);
    document.getElementById('summary-net-pnl').className = netPnl >= 0 ? 'val text-green' : 'val text-red';
    document.getElementById('summary-profit-days').textContent = profitDays;
    document.getElementById('summary-loss-days').textContent = lossDays;
    
    const totalDays = profitDays + lossDays;
    const winRate = totalDays > 0 ? Math.round((profitDays / totalDays) * 100) : 0;
    document.getElementById('summary-win-rate').textContent = winRate + '%';

    // Calendar Generation Logic (Current Month)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthHeader = document.getElementById('calendar-month-year');
    if (monthHeader) monthHeader.textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay() is 0 (Sun) to 6 (Sat). We want Mon (0) to Sun (6)
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 

    // Build headers
    let html = '<div class="cal-header">MON</div><div class="cal-header">TUE</div><div class="cal-header">WED</div><div class="cal-header">THU</div><div class="cal-header">FRI</div><div class="cal-header">SAT</div><div class="cal-header">SUN</div>';

    // Build empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell" style="background: transparent;"></div>';
    }

    // Build days
    for (let day = 1; day <= daysInMonth; day++) {
      // Format as YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const pnl = pnlMap[dateStr];
      
      if (pnl !== undefined) {
        const bgClass = pnl >= 0 ? 'bg-green' : 'bg-red';
        const sign = pnl >= 0 ? '+' : '';
        html += `<div class="cal-cell ${bgClass}"><span class="day">${day}</span><span class="pl">${sign}${pnl}</span></div>`;
      } else {
        // No data for this day
        html += `<div class="cal-cell" style="background: transparent;"><span class="day" style="color:var(--text-gray);">${day}</span></div>`;
      }
    }

    grid.innerHTML = html;
  }
});
