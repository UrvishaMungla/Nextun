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

  // --- Backend Trades Integration ---
  const token = localStorage.getItem('nextunToken');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  async function fetchTrades() {
    try {
      const res = await fetch('http://localhost:5000/api/trades', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        renderMetrics(data.metrics);
        renderTable(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  }

  function renderMetrics(metrics) {
    const totalTradesEl = document.getElementById('metric-total-trades');
    const winRateEl = document.getElementById('metric-win-rate');
    const totalPnlEl = document.getElementById('metric-total-pnl');
    const avgWinLossEl = document.getElementById('metric-avg-winloss');

    if (totalTradesEl) totalTradesEl.textContent = metrics.totalTrades;
    if (winRateEl) winRateEl.textContent = metrics.winRate;
    if (avgWinLossEl) avgWinLossEl.textContent = metrics.avgWinLoss;
    
    if (totalPnlEl) {
      const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
      totalPnlEl.textContent = formatCurrency(metrics.totalPnl);
      totalPnlEl.className = metrics.totalPnl >= 0 ? 'tm-val text-green' : 'tm-val text-red';
    }
  }

  function renderTable(trades) {
    const tbody = document.getElementById('trades-table-body');
    if (!tbody) return;

    let html = '';
    
    if (trades.length === 0) {
      html = '<tr><td colspan="7" style="text-align: center;">No trades found.</td></tr>';
    } else {
      trades.forEach(trade => {
        const typeClass = trade.type === 'BUY' ? 'text-green' : 'text-red';
        const pnlClass = trade.pnl >= 0 ? 'text-green' : 'text-red';
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

        html += `
          <tr>
            <td>${trade.symbol}</td>
            <td class="${typeClass}">${trade.type}</td>
            <td>${trade.quantity}</td>
            <td>${formatCurrency(trade.entryPrice)}</td>
            <td>${formatCurrency(trade.currentPrice)}</td>
            <td class="${pnlClass}">${pnlSign}${formatCurrency(trade.pnl)}</td>
            <td>${trade.status}</td>
          </tr>
        `;
      });
    }
    
    tbody.innerHTML = html;
  }

  fetchTrades();
});
