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

  // --- Pagination State ---
  let allTrades = [];
  let currentPage = 1;
  const itemsPerPage = 12;

  async function fetchTrades() {
    try {
      const token = localStorage.getItem('nextunToken');
      if (!token) return;

      const filterVal = document.getElementById('filter-select')?.value || 'ALL';
      const sortVal = document.getElementById('sort-select')?.value || 'DATE_DESC';

      // Auto-sync Exness trades
      await fetch('http://localhost:5000/api/trades/seed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const res = await fetch(`http://localhost:5000/api/trades?filter=${filterVal}&sort=${sortVal}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        allTrades = data.data || [];
        currentPage = 1; // Reset to page 1 on new fetch
        renderMetrics(data.metrics);
        renderPaginatedTable();
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  }

  const filterSelect = document.getElementById('filter-select');
  const sortSelect = document.getElementById('sort-select');
  
  if (filterSelect) {
    filterSelect.addEventListener('change', fetchTrades);
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', fetchTrades);
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
      const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
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
        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

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

  function renderPaginatedTable() {
    const totalItems = allTrades.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    // Safety check
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    // Slice data
    const pageTrades = allTrades.slice(startIndex, endIndex);
    
    // Update Info Text
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
      if (totalItems === 0) {
        infoEl.textContent = 'Showing 0 to 0 of 0 trades';
      } else {
        infoEl.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} trades`;
      }
    }

    // Render Table
    renderTable(pageTrades);

    // Render Controls
    renderPaginationControls(totalPages);
  }

  function renderPaginationControls(totalPages) {
    const controlsEl = document.getElementById('pagination-controls');
    if (!controlsEl) return;
    
    if (totalPages <= 1) {
      controlsEl.innerHTML = '';
      return;
    }

    let html = '';
    
    // Prev Button
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.changePage(${currentPage - 1})"`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      // Logic for showing ellipsis could be added here for many pages, but simple 1-N is fine for now
      html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
    }

    // Next Button
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.changePage(${currentPage + 1})"`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>`;

    controlsEl.innerHTML = html;
  }

  // Global function for onclick handlers
  window.changePage = (page) => {
    currentPage = page;
    renderPaginatedTable();
  };

  fetchTrades();
});
