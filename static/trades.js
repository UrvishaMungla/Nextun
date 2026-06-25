document.addEventListener('DOMContentLoaded', () => {
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

  // ─── Load Backtest Trades from localStorage ───────────────
  const isStrategyActive = localStorage.getItem('dt_strategy_active') === 'true';
  const btTradesRaw      = localStorage.getItem('bt_trades');
  const btSummaryRaw     = localStorage.getItem('bt_summary');
  const tbody = document.getElementById('trades-table-body');

  const tableWrapper  = document.getElementById('trades-table-wrapper');
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
        <svg viewBox="0 0 24 24" width="56" height="56" stroke="var(--text-gray)" stroke-width="1.2" fill="none" style="margin-bottom:18px; opacity:0.5;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <h3 style="color:var(--text-main); font-size:19px; font-weight:700; margin-bottom:8px;">${message}</h3>
        <p style="color:var(--text-gray); font-size:14px; margin-bottom:24px; max-width:360px; margin-left:auto; margin-right:auto;">${subtext}</p>
        <a href="${btnHref}" style="display:inline-block; padding:11px 28px; text-decoration:none;
          background:linear-gradient(135deg,#3b82f6,#6366f1); color:white;
          border-radius:8px; font-size:13px; font-weight:700; transition:opacity .2s;"
          onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          ${btnLabel}
        </a>`;
    }
  }

  // ── GATE 1: Strategy must be activated first ──
  if (!isStrategyActive) {
    showEmptyState(
      '⚡ No Active Strategy',
      'You need to activate a strategy first. Go to the Strategies page, click "⚡ Activate Strategy" and then run a backtest.',
      'Go to Strategies →',
      '/strategies'
    );
  }
  // ── GATE 2: Backtest must have been run ──
  else if (!btTradesRaw) {
    showEmptyState(
      '▶ No Backtest Run Yet',
      'Your strategy is active! Now go to the Strategies page and click "▶ Run Backtest" to generate trades.',
      'Run Backtest Now →',
      '/strategies'
    );
  }
  // ── SHOW TRADES ──
  else if (tbody) {
    const trades  = JSON.parse(btTradesRaw);
    const summary = btSummaryRaw ? JSON.parse(btSummaryRaw) : null;

    if (!trades || trades.length === 0) {
      showEmptyState(
        '📭 No Trades Generated',
        'The backtest ran successfully but found no Double Top / Double Bottom patterns in the selected timeframe. Try a different symbol or timeframe.',
        'Try Another Backtest →',
        '/strategies'
      );
    } else {
      // Update metric cards
      if (summary) {
        const totalEl = document.getElementById('metric-total-trades');
        const wrEl    = document.getElementById('metric-win-rate');
        const pnlEl   = document.getElementById('metric-total-pnl');
        if (totalEl) totalEl.textContent = summary.total_trades;
        if (wrEl)    wrEl.textContent    = summary.win_rate + '%';
        if (pnlEl) {
          pnlEl.textContent = (summary.total_pnl >= 0 ? '+' : '') + summary.total_pnl.toFixed(4);
          pnlEl.className = summary.total_pnl >= 0 ? 'tm-val text-green' : 'tm-val text-red';
        }

        // Show source banner
        const bannerEl = document.getElementById('trades-source-banner');
        if (bannerEl) {
          bannerEl.style.display = 'flex';
          bannerEl.innerHTML = `
            <span style="font-size:13px; color:#3b82f6; font-weight:600;">
              📊 Double Top/Bottom Backtest — ${summary.symbol} / ${summary.timeframe}
            </span>
            <span style="margin-left:auto; font-size:12px; color:var(--text-gray);">
              ${summary.wins} Full Wins | ${summary.partials || 0} Partial | ${summary.losses} Losses | PnL: ${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(4)}
            </span>
          `;
        }
      }

      renderTrades(trades, tbody);
      updatePaginationInfo(trades.length);
    }
  }

  // Filter / Sort
  document.getElementById('filter-select')?.addEventListener('change', applyFilterSort);
  document.getElementById('sort-select')?.addEventListener('change', applyFilterSort);

  function applyFilterSort() {
    const raw = localStorage.getItem('bt_trades');
    if (!raw) return;
    let trades = JSON.parse(raw);
    const filter = document.getElementById('filter-select')?.value || 'ALL';
    const sort   = document.getElementById('sort-select')?.value || 'DATE_DESC';

    if (filter === 'WIN')  trades = trades.filter(t => t.status === 'WIN');
    if (filter === 'LOSS') trades = trades.filter(t => t.status === 'LOSS');
    if (filter === 'PARTIAL') trades = trades.filter(t => t.status === 'PARTIAL');

    if (sort === 'PROFIT_DESC') trades.sort((a,b) => b.pnl - a.pnl);
    else if (sort === 'LOSS_DESC') trades.sort((a,b) => a.pnl - b.pnl);
    else if (sort === 'DATE_ASC')  trades.sort((a,b) => new Date(a.entry_time) - new Date(b.entry_time));
    else trades.sort((a,b) => new Date(b.entry_time) - new Date(a.entry_time));

    const t = document.getElementById('trades-table-body');
    if (t) { renderTrades(trades, t); updatePaginationInfo(trades.length); }
  }

  function renderTrades(trades, tbody) {
    tbody.innerHTML = trades.map((t, i) => {
      const isLong  = t.type === 'LONG';
      const pnlSign = t.pnl >= 0 ? '+' : '';
      // Use the symbol saved inside each trade, fallback to summary symbol
      const summary  = localStorage.getItem('bt_summary') ? JSON.parse(localStorage.getItem('bt_summary')) : {};
      const symbol   = t.symbol || summary.symbol || 'N/A';
      // Format symbol cleanly: remove =X, -USD suffixes for display
      const displaySym = symbol.replace('=X','').replace('-USD','').replace('=F','');
      return `
        <tr>
          <td style="color:var(--text-gray);font-size:12px;">${i+1}</td>
          <td style="font-weight:600;">${displaySym}</td>
          <td>
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
              background:${isLong ? '#dcfce7':'#fee2e2'};color:${isLong ? '#16a34a':'#dc2626'};">
              ${isLong ? '▲ BUY' : '▼ SELL'}
            </span>
          </td>
          <td style="font-size:12px;color:var(--text-gray);">1 lot</td>
          <td style="font-weight:600;">${t.entry_price}</td>
          <td>${t.exit_price}</td>
          <td style="font-weight:700;color:${t.pnl >= 0 ? '#16a34a' : '#dc2626'};">${pnlSign}${t.pnl.toFixed(4)}</td>
          <td>
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
              background:${t.status==='WIN' ? '#dcfce7' : t.status==='PARTIAL' ? '#fef08a' : '#fee2e2'};
              color:${t.status==='WIN' ? '#16a34a' : t.status==='PARTIAL' ? '#854d0e' : '#dc2626'};">
              ${t.status === 'WIN' ? '✓ WIN' : t.status === 'PARTIAL' ? '◐ PARTIAL' : '✗ LOSS'}
            </span>
          </td>
        </tr>`;
    }).join('');
  }

  function updatePaginationInfo(total) {
    const el = document.getElementById('pagination-info');
    if (el) el.textContent = `Showing 1 to ${total} of ${total} backtest trades`;
    const controls = document.getElementById('pagination-controls');
    if (controls) controls.innerHTML = '';
  }

  window.changePage = () => {};
});
