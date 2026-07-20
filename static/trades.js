document.addEventListener('DOMContentLoaded', async () => {
  // ─── Datetime ────────────────────────────────────────────
  function updateDateTime() {
    const el = document.getElementById('current-datetime');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleString('en-GB', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit', hour12:false
      }).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // ─── Logout ───────────────────────────────────────────────
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('nextunToken');
    window.location.href = '/';
  });

  // ─── Theme Toggle ─────────────────────────────────────────
  const themeBtns = document.querySelectorAll('.theme-btn');
  if (themeBtns.length >= 2) {
    const [lightBtn, darkBtn] = themeBtns;
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active'); lightBtn.classList.remove('active');
    }
    lightBtn.addEventListener('click', () => {
      document.body.classList.remove('dark-theme');
      lightBtn.classList.add('active'); darkBtn.classList.remove('active');
      localStorage.setItem('theme', 'light');
    });
    darkBtn.addEventListener('click', () => {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active'); lightBtn.classList.remove('active');
      localStorage.setItem('theme', 'dark');
    });
  }

  // ─── Fetch Live Trades from API ───────────────
  const tableWrapper  = document.getElementById('trades-table-wrapper');
  const tbody         = document.getElementById('trades-table-body');
  const emptyState    = document.getElementById('trades-empty-state');
  const toolbar       = document.querySelector('.trades-toolbar');
  const metricsRow    = document.querySelector('.trades-metrics-row');

  function showEmptyState(message, subtext, btnLabel, btnHref) {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (toolbar)      toolbar.style.display      = 'none';
    if (metricsRow)   metricsRow.style.display   = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <h3 style="color:var(--text-main); font-size:19px; font-weight:700; margin-bottom:8px;">${message}</h3>
        <p style="color:var(--text-gray); font-size:14px; margin-bottom:24px; max-width:360px; margin-left:auto; margin-right:auto;">${subtext}</p>
        <a href="${btnHref}" style="display:inline-block; padding:11px 28px; text-decoration:none;
          background:linear-gradient(135deg,#3b82f6,#6366f1); color:white;
          border-radius:8px; font-size:13px; font-weight:700;">
          ${btnLabel}
        </a>`;
    }
  }

  const token = localStorage.getItem('nextunToken');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch('/api/trades', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      const trades = data.data;
      const metrics = data.metrics;

      // Update metric cards
      if (metrics) {
        const totalEl = document.getElementById('metric-total-trades');
        const wrEl    = document.getElementById('metric-win-rate');
        const pnlEl   = document.getElementById('metric-total-pnl');
        if (totalEl) totalEl.textContent = metrics.totalTrades;
        if (wrEl)    wrEl.textContent    = metrics.winRate + '%';
        if (pnlEl && metrics.totalPnl !== undefined) {
          pnlEl.textContent = (metrics.totalPnl >= 0 ? '+' : '') + metrics.totalPnl.toFixed(4);
          pnlEl.className = metrics.totalPnl >= 0 ? 'tm-val text-green' : 'tm-val text-red';
        }
      }

      renderTrades(trades, tbody);
      updatePaginationInfo(trades.length);
      
      // Store in window for filtering
      window.loadedTrades = trades;

    } else {
      showEmptyState(
        'No Trades Found',
        'Your live strategy has not placed any trades yet. Once the bot finds a pattern, they will appear here.',
        'View Strategies',
        '/strategies'
      );
    }
  } catch (err) {
    console.error('Failed to load trades:', err);
    showEmptyState('Error', 'Failed to load trade history.', 'Retry', '/trades');
  }

  // Filter / Sort
  document.getElementById('filter-select')?.addEventListener('change', applyFilterSort);
  document.getElementById('sort-select')?.addEventListener('change', applyFilterSort);

  function applyFilterSort() {
    if (!window.loadedTrades) return;
    let trades = [...window.loadedTrades];
    const filter = document.getElementById('filter-select')?.value || 'ALL';
    const sort   = document.getElementById('sort-select')?.value || 'DATE_DESC';

    if (filter === 'WIN')  trades = trades.filter(t => t.pnl > 0);
    if (filter === 'LOSS') trades = trades.filter(t => t.pnl < 0);
    if (filter === 'PARTIAL') trades = trades.filter(t => t.status === 'PARTIAL');

    if (sort === 'PROFIT_DESC') trades.sort((a,b) => b.pnl - a.pnl);
    else if (sort === 'LOSS_DESC') trades.sort((a,b) => a.pnl - b.pnl);
    else if (sort === 'DATE_ASC')  trades.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else trades.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    const t = document.getElementById('trades-table-body');
    if (t) { renderTrades(trades, t); updatePaginationInfo(trades.length); }
  }

  function renderTrades(trades, tbody) {
    tbody.innerHTML = trades.map((t, i) => {
      const isLong  = t.type === 'BUY';
      const pnlSign = t.pnl >= 0 ? '+' : '';
      const displaySym = t.symbol.replace('=X','').replace('-USD','').replace('=F','');
      const formattedEntry = t.entryPrice ? t.entryPrice.toFixed(5) : '0.00000';
      const formattedExit = t.currentPrice ? t.currentPrice.toFixed(5) : '-';
      
      let statusColor = '#f3f4f6';
      let statusText = '#4b5563';
      let statusLabel = 'CLOSED';
      if (t.status === 'OPEN') {
         statusColor = '#dbeafe'; statusText = '#2563eb'; statusLabel = 'OPEN';
      } else if (t.status === 'WIN' || t.pnl > 0) {
         statusColor = '#dcfce7'; statusText = '#16a34a'; statusLabel = 'WIN';
      } else if (t.status === 'LOSS' || t.pnl < 0) {
         statusColor = '#fee2e2'; statusText = '#dc2626'; statusLabel = 'LOSS';
      }

      return `
        <tr>
          <td style="font-weight:600;">${displaySym}</td>
          <td>
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
              background:${isLong ? '#dcfce7':'#fee2e2'};color:${isLong ? '#16a34a':'#dc2626'};">
              ${isLong ? 'BUY' : 'SELL'}
            </span>
          </td>
          <td style="font-size:12px;color:var(--text-gray);">${t.quantity} lot</td>
          <td style="font-weight:600;">${formattedEntry}</td>
          <td>${formattedExit}</td>
          <td style="font-weight:700;color:${t.pnl >= 0 ? '#16a34a' : '#dc2626'};">${pnlSign}${parseFloat(t.pnl).toFixed(4)}</td>
          <td>
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
              background:${statusColor}; color:${statusText};">
              ${statusLabel}
            </span>
          </td>
        </tr>`;
    }).join('');
  }

  function updatePaginationInfo(total) {
    const el = document.getElementById('pagination-info');
    if (el) el.textContent = `Showing 1 to ${total} of ${total} live trades`;
    const controls = document.getElementById('pagination-controls');
    if (controls) controls.innerHTML = '';
  }

  window.changePage = () => {};

  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", function () {
          sidebar.classList.toggle("show");
      });
  }
});
