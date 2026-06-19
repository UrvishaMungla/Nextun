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

    // Check localStorage for saved theme on load
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

  // --- Live Dashboard Data Fetching ---
  async function initDashboard() {
    try {
      const token = localStorage.getItem('nextunToken');
      
      // 1. Fetch User Profile to check for Exness connection
      const userRes = await fetch('http://localhost:5000/api/user/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userRes.json();
      
      if (userData.success) {
        const user = userData.data;
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

        if (user.isExnessConnected) {
          // Swap UI to Exness
          document.getElementById('dashboard-broker-name').textContent = 'Exness MT5';
          document.getElementById('dashboard-broker-logo-box').innerHTML = '<h4 style="color: #ffc800; font-weight: 800; font-style: italic; letter-spacing: -1px; margin: 0;">exness</h4>';
          
          // Fetch real/dummy data from backend
          const exnessRes = await fetch('http://localhost:5000/api/exness/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const exnessData = await exnessRes.json();
          
          if (exnessData.success && exnessData.data) {
            const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
            
            document.getElementById('broker-available-funds').textContent = formatUSD(exnessData.data.balance);
            document.getElementById('broker-margin-used').textContent = formatUSD(exnessData.data.margin);
            const topMarginElem = document.getElementById('metric-available-margin');
            if(topMarginElem) topMarginElem.textContent = formatUSD(exnessData.data.freeMargin);
          }
        } else if (!user.isAngelOneConnected) {
          // Neither is connected
          document.getElementById('dashboard-broker-name').textContent = 'No Broker Connected';
          document.getElementById('dashboard-broker-logo-box').innerHTML = '<h4 style="color: #94a3b8; font-weight: 600; margin: 0;">Disconnected</h4>';
          
          document.getElementById('broker-available-funds').textContent = formatCurrency(0);
          document.getElementById('broker-margin-used').textContent = formatCurrency(0);
          const topMarginElem = document.getElementById('metric-available-margin');
          if(topMarginElem) topMarginElem.textContent = formatCurrency(0);
        }
      }
      
      // 2. Fetch Real Database Trades for P&L Analytics Engine
      const res = await fetch('http://localhost:5000/api/trades?filter=ALL', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tradeData = await res.json();
      
      if (tradeData.success && tradeData.data) {
        const trades = tradeData.data;
        
        // Mathematical Aggregation Algorithm
        let todaysPnl = 0;
        let totalPnl = tradeData.metrics.totalPnl || 0;
        let openCount = 0;
        
        const today = new Date();
        today.setHours(0,0,0,0);

        trades.forEach(t => {
           if (t.status === 'OPEN') openCount++;
           const tradeDate = new Date(t.createdAt);
           if (tradeDate >= today) {
               todaysPnl += t.pnl;
           }
        });

        // Format Currency Helper
        const isExness = userData.success && userData.data.isExnessConnected;
        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: isExness ? 'USD' : 'INR' 
        }).format(val);
        
        // Inject True Numbers into Dashboard UI
        document.getElementById('metric-todays-pnl').textContent = formatCurrency(todaysPnl);
        document.getElementById('metric-todays-pnl').className = todaysPnl >= 0 ? 'text-green' : 'text-red';
        
        document.getElementById('metric-total-pnl').textContent = formatCurrency(totalPnl);
        document.getElementById('metric-total-pnl').className = totalPnl >= 0 ? 'text-green' : 'text-red';
        
        document.getElementById('metric-open-positions').textContent = openCount;

        // Change connect button state based on actual broker
        const connectBtn = document.getElementById('broker-connect-btn');
        if (connectBtn && isExness) {
          connectBtn.textContent = 'Connected to Exness';
          connectBtn.classList.remove('btn-outline');
          connectBtn.style.background = 'var(--green)';
          connectBtn.style.color = 'white';
        }
      }

      // 3. Sync Active Strategy from Database
      const stratRes = await fetch('http://localhost:5000/api/strategies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const stratData = await stratRes.json();
      
      if (stratData.success && stratData.data && stratData.data.activeStrategy) {
        // User has an active strategy
        const activeId = stratData.data.activeStrategy;
        // Find it in the array
        const activeStrat = stratData.data.strategies.find(s => s._id === activeId);
        
        if (activeStrat) {
          document.getElementById('dash-strategy-name').textContent = activeStrat.name;
          document.getElementById('dash-strategy-desc').textContent = activeStrat.description;
          document.getElementById('dash-strategy-winrate').textContent = activeStrat.successRate;
          document.getElementById('dash-strategy-rr').textContent = activeStrat.riskReward;
          
          document.getElementById('dash-strategy-switch').style.display = 'block';
          document.getElementById('dash-strategy-metrics').style.display = 'flex';
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
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    
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
