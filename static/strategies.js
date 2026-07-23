// ─── Strategies Page JS ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Datetime
  function updateDateTime() {
    const el = document.getElementById('current-datetime');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Theme Toggle
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

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('nextunToken');
    sessionStorage.removeItem('dt_strategy_active');
    window.location.href = '/';
  });

  // Sync activation state with backend — only ONE strategy can be active at a time
  (async function syncState() {
    try {
      const token = sessionStorage.getItem('nextunToken');
      if (!token) return;
      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) return;

      const isLT = data.strategy_name && data.strategy_name.includes('Liquidity');
      const isDT = data.strategy_name && data.strategy_name.includes('Double');

      if (data.running && isDT) {
        // Double Top bot is running → activate DT card, deactivate LT card
        localStorage.setItem('dt_strategy_active', 'true');
        localStorage.removeItem('lt_strategy_active');
        setActiveState(true);
        ltSetActiveState(false);
        const execBtn = document.getElementById('dt-execute-btn');
        const panel = document.getElementById('bot-panel');
        if (execBtn) { execBtn.textContent = 'Stop Live Strategy'; execBtn.classList.add('active-state'); }
        if (panel) { panel.style.display = 'block'; }
        const log = document.getElementById('bot-log');
        if (log) startBotStatusPolling(token, log);

      } else if (data.running && isLT) {
        // Liquidity Trap bot is running → activate LT card, deactivate DT card
        localStorage.removeItem('dt_strategy_active');
        localStorage.setItem('lt_strategy_active', 'true');
        setActiveState(false);
        ltSetActiveState(true);
        // Reset DT execute button to default
        const execBtn = document.getElementById('dt-execute-btn');
        const panel = document.getElementById('bot-panel');
        if (execBtn) { execBtn.textContent = 'Run Live Strategy'; execBtn.classList.remove('active-state'); }
        if (panel) { panel.style.display = 'none'; }
        // Resume LT bot log polling
        const ltLog = document.getElementById('lt-bot-log');
        const ltPanel = document.getElementById('lt-bot-panel');
        const ltLabel = document.getElementById('lt-bot-label-text');
        if (ltPanel) ltPanel.style.display = 'block';
        if (ltLabel) { ltLabel.textContent = 'Bot: ACTIVE 🟢'; ltLabel.style.color = '#16a34a'; }
        const ltToggle = document.getElementById('lt-bot-toggle');
        if (ltToggle) ltToggle.checked = true;
        if (ltLog) startBotStatusPolling(token, ltLog);

      } else {
        // Nothing running — reset both cards to inactive state
        localStorage.removeItem('dt_strategy_active');
        localStorage.removeItem('lt_strategy_active');
        setActiveState(false);
        ltSetActiveState(false);
        const execBtn = document.getElementById('dt-execute-btn');
        if (execBtn) { execBtn.textContent = 'Run Live Strategy'; execBtn.classList.remove('active-state'); }
        const panel = document.getElementById('bot-panel');
        if (panel) panel.style.display = 'none';
        const ltPanel = document.getElementById('lt-bot-panel');
        const ltLabel = document.getElementById('lt-bot-label-text');
        const ltToggle = document.getElementById('lt-bot-toggle');
        if (ltPanel) ltPanel.style.display = 'none';
        if (ltLabel) { ltLabel.textContent = 'Bot: OFF'; ltLabel.style.color = ''; }
        if (ltToggle) ltToggle.checked = false;
      }
    } catch (e) { }
  })();

  // Mobile Drawer
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("show");
    });
  }

});

// ─── Toggle Strategy Activation ────────────────────────────────
function setActiveState(isActive) {
  const badge = document.getElementById('dt-status-badge');
  const btn = document.getElementById('dt-activate-btn');
  if (badge) {
    badge.textContent = isActive ? '✓ Active' : 'Available';
    badge.className = 'strategy-badge ' + (isActive ? 'badge-active' : 'badge-available');
  }
  if (btn) {
    btn.textContent = isActive ? '⏹ Deactivate Strategy' : '⚡ Activate Strategy';
    btn.className = 'btn-activate ' + (isActive ? 'active-state' : '');
  }

  // Auto-update Bot switch UI based on Strategy Activation
  const botToggle = document.getElementById('bot-toggle');
  if (botToggle && botToggle.checked !== isActive) {
    botToggle.checked = isActive;
  }
}

function toggleActivate() {
  const current = sessionStorage.getItem('dt_strategy_active') === 'true';
  const next = !current;
  sessionStorage.setItem('dt_strategy_active', next ? 'true' : 'false');

  if (next) {
    // ── EXCLUSIVE: Kill Liquidity Trap UI completely ──
    localStorage.removeItem('lt_strategy_active');
    ltSetActiveState(false);
    const ltPanel = document.getElementById('lt-bot-panel');
    const ltLabel = document.getElementById('lt-bot-label-text');
    const ltToggle = document.getElementById('lt-bot-toggle');
    if (ltPanel) ltPanel.style.display = 'none';
    if (ltLabel) { ltLabel.textContent = 'Bot: OFF'; ltLabel.style.color = ''; }
    if (ltToggle) ltToggle.checked = false;
    if (typeof ltBotInterval !== 'undefined' && ltBotInterval) { clearInterval(ltBotInterval); ltBotInterval = null; }

    // Save strategy info for Dashboard to read
    const symbol = document.getElementById('bt-symbol')?.value || 'EURUSD=X';
    const timeframe = document.getElementById('bt-timeframe')?.value || '1h';
    sessionStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
    sessionStorage.setItem('dt_strategy_symbol', symbol);
    sessionStorage.setItem('dt_strategy_timeframe', timeframe);
    sessionStorage.setItem('dt_strategy_rr', '1:2');
  } else {
    sessionStorage.removeItem('dt_strategy_name');
    sessionStorage.removeItem('dt_strategy_symbol');
    sessionStorage.removeItem('dt_strategy_timeframe');
    sessionStorage.removeItem('dt_strategy_winrate');
    // Clear backtest trades so Trades page goes back to empty state
    sessionStorage.removeItem('bt_trades');
    sessionStorage.removeItem('bt_summary');
  }

  setActiveState(next);

  if (next) {
    // Auto-run the backtest when activating
    runBacktest();
  }
}


let botStatusInterval = null;

async function executeLiveStrategy() {
  const token = sessionStorage.getItem('nextunToken');
  if (!token) {
    alert("Please log in first to run the live strategy.");
    return;
  }

  const symbol = document.getElementById('bt-symbol').value;
  const timeframe = document.getElementById('bt-timeframe').value;
  const execBtn = document.getElementById('dt-execute-btn');
  const panel = document.getElementById('bot-panel');
  const log = document.getElementById('bot-log');

  const originalText = execBtn.textContent;
  execBtn.disabled = true;
  execBtn.textContent = 'Wait...';

  try {
    const stratRes = await fetch('/api/strategies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stratData = await stratRes.json();
    let strategyId = 1;
    if (stratData.success && stratData.data && stratData.data.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Double Top"));
      if (strat) strategyId = strat.id;
    }

    const res = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });

    const data = await res.json();

    if (data.success) {
      // Use exact match — "Strategy activated" vs "Strategy stopped"
      if (data.message === 'Strategy activated') {
        // Started
        // Stop LT if it was running
        localStorage.removeItem('lt_strategy_active');
        ltSetActiveState(false);
        const ltExecBtn = document.getElementById('lt-execute-btn');
        const ltPanel = document.getElementById('lt-bot-panel');
        if (ltExecBtn) { ltExecBtn.textContent = 'Run Live Strategy'; ltExecBtn.classList.remove('active-state'); }
        if (ltPanel) { ltPanel.style.display = 'none'; }
        if (typeof ltBotStatusInterval !== 'undefined' && ltBotStatusInterval) { clearInterval(ltBotStatusInterval); ltBotStatusInterval = null; }

        execBtn.textContent = 'Stop Live Strategy';
        execBtn.classList.add('active-state');
        panel.style.display = 'block';
        log.innerHTML = '';
        addLog('[SYSTEM] Bot activated! Live logs will appear below...');

        // Save to Dashboard
        sessionStorage.setItem('dt_strategy_active', 'true');
        sessionStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        sessionStorage.setItem('dt_strategy_symbol', symbol);
        sessionStorage.setItem('dt_strategy_timeframe', timeframe);
        sessionStorage.setItem('dt_strategy_rr', '1:2');

        // Start polling bot status every 5 seconds
        startBotStatusPolling(token, log);

      } else {
        // Stopped
        execBtn.textContent = 'Run Live Strategy';
        execBtn.classList.remove('active-state');
        addLog('[SYSTEM] Bot stopped.');

        // Stop polling
        if (botStatusInterval) {
          clearInterval(botStatusInterval);
          botStatusInterval = null;
        }

        // Hide panel after a short delay
        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        // Remove from Dashboard
        sessionStorage.setItem('dt_strategy_active', 'false');
        sessionStorage.removeItem('dt_strategy_name');
        sessionStorage.removeItem('dt_strategy_symbol');
        sessionStorage.removeItem('dt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      execBtn.textContent = originalText;
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    execBtn.textContent = originalText;
  } finally {
    execBtn.disabled = false;
  }
}

function startBotStatusPolling(token, logEl) {
  // Clear any existing interval
  if (botStatusInterval) clearInterval(botStatusInterval);

  let lastLogCount = 0;

  botStatusInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.logs && data.logs.length > lastLogCount) {
        // Only add NEW logs
        const newLogs = data.logs.slice(lastLogCount);
        newLogs.forEach(msg => addLog(msg));
        lastLogCount = data.logs.length;
      }

      // If bot stopped on its own, update the button
      if (data.success && !data.running) {
        const btn = document.getElementById('dt-execute-btn');
        if (btn && btn.textContent.includes('Stop')) {
          btn.textContent = '⚡ Run Live Strategy';
          btn.classList.remove('active-state');
          clearInterval(botStatusInterval);
          botStatusInterval = null;
        }
      }
    } catch (e) {
      // Silently ignore polling errors
    }
  }, 2000);
}

// ─── Run Backtest ──────────────────────────────────────────────
async function runBacktest() {
  const isStratActive = sessionStorage.getItem('dt_strategy_active') === 'true';
  if (!isStratActive) {
    alert("Please click '⚡ Activate Strategy' first to enable the engine and generate trades.");
    return;
  }

  const symbol = document.getElementById('bt-symbol').value;
  const timeframe = document.getElementById('bt-timeframe').value;
  const useMarketHours = document.getElementById('dt-market-hours')?.checked || false;

  const loading = document.getElementById('bt-loading');
  const statsEl = document.getElementById('bt-stats');
  const tradeSection = document.getElementById('bt-trade-section');
  const runBtn = document.getElementById('dt-run-btn');

  // Reset UI
  loading.style.display = 'block';
  statsEl.style.display = 'none';
  tradeSection.style.display = 'none';
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';

  try {
    const res = await fetch('/api/strategy/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe, strategy_name: 'Double Top / Double Bottom', use_market_hours: useMarketHours })
    });

    const data = await res.json();

    if (!data.success) {
      alert('Backtest error: ' + (data.message || data.detail || 'Unknown error'));
      return;
    }

    const d = data.data;

    // Update stats
    document.getElementById('rc-total').textContent = d.total_trades;
    document.getElementById('rc-winrate').textContent = d.win_rate + '%';
    document.getElementById('rc-wl').textContent = d.wins + ' / ' + d.losses;
    document.getElementById('dt-win-rate').textContent = d.win_rate + '%';

    const pnlEl = document.getElementById('rc-pnl');
    pnlEl.textContent = (d.total_pnl >= 0 ? '+' : '') + d.total_pnl.toFixed(4);
    pnlEl.style.color = d.total_pnl >= 0 ? '#16a34a' : '#dc2626';

    statsEl.style.display = 'grid';

    // ── Save symbol into each trade & save to localStorage ──
    const tradesWithSymbol = (d.trades || []).map(t => ({ ...t, symbol: d.symbol }));
    sessionStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    sessionStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol,
      timeframe: d.timeframe,
      total_trades: d.total_trades,
      wins: d.wins,
      partials: d.partials || 0,
      losses: d.losses,
      total_pnl: d.total_pnl,
      strategy_name: 'Double Top / Double Bottom'
    }));
    sessionStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    sessionStorage.setItem('dt_strategy_symbol', d.symbol);
    sessionStorage.setItem('dt_strategy_timeframe', d.timeframe);

    // ── Show success banner with link to Trades page (no table here) ──
    const tradeSection = document.getElementById('bt-trade-section');
    if (tradeSection) {
      tradeSection.style.display = 'block';
      tradeSection.innerHTML = `
        <div style="text-align:center; padding:20px; background:var(--bg-color); border-radius:12px; border:1px solid var(--border-color);">
          <div style="font-size:28px; margin-bottom:8px;">✅</div>
          <div style="font-size:15px; font-weight:700; color:var(--text-dark); margin-bottom:6px;">
            ${d.total_trades} trades saved for ${d.symbol}
          </div>
          <div style="font-size:13px; color:var(--text-gray); margin-bottom:14px;">
            ${d.wins} Full Wins · ${d.partials || 0} Partial Wins · ${d.losses} Losses · Win Rate: ${d.win_rate}% · Net P&L: ${d.total_pnl >= 0 ? '+' : ''}${d.total_pnl.toFixed(4)}
          </div>
          <a href="/trades" style="display:inline-block; padding:10px 24px;
            background:linear-gradient(135deg,#3b82f6,#6366f1); color:white;
            border-radius:8px; font-size:13px; font-weight:600; text-decoration:none;">
            📋 View All Trades in Trades Page →
          </a>
        </div>
      `;
    }

  } catch (err) {
    console.error('Backtest failed:', err);
    alert('Network error. Make sure the Django server is running on port 8000.');
  } finally {
    loading.style.display = 'none';
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}

// ─── Bot Signal Generator ──────────────────────────────────────
let botInterval = null;

async function toggleBot(checkbox) {
  const panel = document.getElementById('bot-panel');
  const label = document.getElementById('bot-label-text');
  const log = document.getElementById('bot-log');

  const token = sessionStorage.getItem('nextunToken');
  if (!token) {
    alert("Please log in first to run the live strategy.");
    checkbox.checked = false;
    return;
  }

  const symbol = document.getElementById('bt-symbol').value;
  const timeframe = document.getElementById('bt-timeframe').value;

  checkbox.disabled = true;

  try {
    const stratRes = await fetch('/api/strategies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stratData = await stratRes.json();
    let strategyId = 1;
    if (stratData.success && stratData.data && stratData.data.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Double Top"));
      if (strat) strategyId = strat.id;
    }

    const res = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });

    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        panel.style.display = 'block';
        label.textContent = 'Bot: ACTIVE';
        label.style.color = '#16a34a';
        log.innerHTML = '';
        addLog('[SYSTEM] Real Backend Bot activated! Live logs will appear below...');

        // Sync Dashboard variables
        sessionStorage.setItem('dt_strategy_active', 'true');
        sessionStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        sessionStorage.setItem('dt_strategy_symbol', symbol);
        sessionStorage.setItem('dt_strategy_timeframe', timeframe);
        sessionStorage.setItem('dt_strategy_rr', '1:2');

        startBotStatusPolling(token, log);
      } else {
        label.textContent = 'Bot: OFF';
        label.style.color = '';
        addLog('[SYSTEM] Bot stopped.');

        if (botStatusInterval) {
          clearInterval(botStatusInterval);
          botStatusInterval = null;
        }

        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        // Remove Dashboard variables
        sessionStorage.setItem('dt_strategy_active', 'false');
        sessionStorage.removeItem('dt_strategy_name');
        sessionStorage.removeItem('dt_strategy_symbol');
        sessionStorage.removeItem('dt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      checkbox.checked = !checkbox.checked; // Revert
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    checkbox.checked = !checkbox.checked; // Revert
  } finally {
    checkbox.disabled = false;
  }
}

function addLog(msg) {
  const log = document.getElementById('bot-log');
  if (!log) return;
  const line = document.createElement('div');
  line.textContent = msg;
  if (msg.includes('LONG')) line.style.color = '#4ade80';
  else if (msg.includes('SHORT')) line.style.color = '#f87171';
  else if (msg.includes('SYSTEM')) line.style.color = '#60a5fa';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}




// --- Liquidity Trap Strategy -------------------------------------

// Restore LT state on page load
(function () {
  if (sessionStorage.getItem('lt_strategy_active') === 'true') {
    ltSetActiveState(true);
  }
})();

function ltSetActiveState(isActive) {
  const badge = document.getElementById('lt-status-badge');
  const btn = document.getElementById('lt-execute-btn');
  if (badge) {
    badge.textContent = isActive ? '✓ Active' : 'Available';
    badge.className = 'strategy-badge ' + (isActive ? 'badge-active' : 'badge-available');
  }
  if (btn) {
    btn.textContent = isActive ? 'Stop Live Strategy' : 'Run Live Strategy';
    btn.className = 'btn-activate ' + (isActive ? 'active-state' : '');
  }
}


// ================= LOG UI =================
function ltAddLog(msg) {
  const log = document.getElementById('lt-bot-log');
  if (!log) return;

  const line = document.createElement('div');
  line.textContent = msg;

  if (msg.includes('LONG') || msg.includes('BUY')) line.style.color = '#4ade80';
  else if (msg.includes('SHORT') || msg.includes('SELL')) line.style.color = '#f87171';
  else if (msg.includes('SYSTEM')) line.style.color = '#60a5fa';

  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ================= BOT POLLING =================
let ltBotStatusInterval = null;

function startLtBotStatusPolling(token) {
  if (ltBotStatusInterval) clearInterval(ltBotStatusInterval);

  let lastLogCount = 0;

  ltBotStatusInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success && data.logs && data.logs.length > lastLogCount) {
        const newLogs = data.logs.slice(lastLogCount);
        newLogs.forEach(msg => ltAddLog(msg));
        lastLogCount = data.logs.length;
      }

      // Bot stopped externally
      if (data.success && data.activeStrategy === null) {
        const execBtn = document.getElementById('lt-execute-btn');

        if (execBtn && execBtn.classList.contains('active-state')) {
          execBtn.textContent = 'Run Live Strategy';
          execBtn.classList.remove('active-state');
          ltAddLog('[SYSTEM] Bot stopped from another session.');
        }
      }

    } catch (e) {
      console.error(e);
    }
  }, 5000);
}

// ================= LIVE STRATEGY =================
async function ltExecuteLiveStrategy() {
  const token = localStorage.getItem('nextunToken');

  if (!token) {
    alert("Please log in first.");
    return;
  }

  const symbol = document.getElementById('lt-symbol').value;
  const timeframe = document.getElementById('lt-timeframe').value;

  const execBtn = document.getElementById('lt-execute-btn');
  const panel = document.getElementById('lt-bot-panel');
  const log = document.getElementById('lt-bot-log');

  const originalText = execBtn.textContent;
  execBtn.disabled = true;
  execBtn.textContent = 'Wait...';

  try {
    // Get strategy ID
    const stratRes = await fetch('/api/strategies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const stratData = await stratRes.json();

    let strategyId = 2;

    if (stratData.success && stratData.data?.strategies) {
      const strat = stratData.data.strategies.find(s =>
        s.name.includes("Liquidity")
      );
      if (strat) strategyId = strat.id;
    }

    // Toggle API
    const res = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });

    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {

        // Stop DT live if running
        localStorage.removeItem('dt_strategy_active');
        setActiveState(false);

        ltSetActiveState(true);

        panel.style.display = 'block';
        log.innerHTML = '';

        ltAddLog('[SYSTEM] Liquidity Trap Bot activated');

        localStorage.setItem('lt_strategy_active', 'true');
        localStorage.setItem('lt_strategy_name', 'Liquidity Trap & Inducement');
        localStorage.setItem('lt_strategy_symbol', symbol);
        localStorage.setItem('lt_strategy_timeframe', timeframe);
        localStorage.setItem('lt_strategy_rr', '1:2');

        startLtBotStatusPolling(token);

      } else {
        // STOP
        ltSetActiveState(false);
        ltAddLog('[SYSTEM] Bot stopped');

        if (ltBotStatusInterval) {
          clearInterval(ltBotStatusInterval);
          ltBotStatusInterval = null;
        }

        setTimeout(() => {
          panel.style.display = 'none';
        }, 2000);

        localStorage.removeItem('lt_strategy_active');
        localStorage.removeItem('lt_strategy_name');
        localStorage.removeItem('lt_strategy_symbol');
        localStorage.removeItem('lt_strategy_timeframe');
        localStorage.removeItem('lt_strategy_rr');
      }

    } else {
      alert(data.message || 'Error');
    }

  } catch (err) {
    console.error(err);
    alert('Network error');

  } finally {
    execBtn.disabled = false;
    execBtn.textContent = originalText;
  }
}

// ================= BACKTEST =================
function ltToggleActivate() {
  const current = sessionStorage.getItem('lt_strategy_active') === 'true';
  const next = !current;

  sessionStorage.setItem('lt_strategy_active', next ? 'true' : 'false');

  if (next) {
    const symbol = document.getElementById('lt-symbol')?.value || 'EURUSD=X';
    const timeframe = document.getElementById('lt-timeframe')?.value || '5m';

    sessionStorage.setItem('dt_strategy_name', 'Liquidity Trap');
    sessionStorage.setItem('dt_strategy_symbol', symbol);
    sessionStorage.setItem('dt_strategy_timeframe', timeframe);
    sessionStorage.setItem('dt_strategy_rr', '1:2');

    // Stop DT backtest if running
    if (sessionStorage.getItem('dt_strategy_active') === 'true') {
      sessionStorage.setItem('dt_strategy_active', 'false');
      setActiveState(false);
    }

    ltSetActiveState(true);
    ltRunBacktest();

  } else {
    sessionStorage.removeItem('dt_strategy_name');
    sessionStorage.removeItem('dt_strategy_symbol');
    sessionStorage.removeItem('dt_strategy_timeframe');
    sessionStorage.removeItem('dt_strategy_winrate');
    sessionStorage.removeItem('bt_trades');
    sessionStorage.removeItem('bt_summary');

    ltSetActiveState(false);
  }
}

async function ltRunBacktest() {
  const isStratActive = sessionStorage.getItem('lt_strategy_active') === 'true';
  if (!isStratActive) {
    alert("Please click '? Activate Strategy' on Liquidity Trap first.");
    return;
  }

  const symbol = document.getElementById('lt-symbol').value;
  const timeframe = document.getElementById('lt-timeframe').value;
  const useMarketHours = document.getElementById('lt-market-hours')?.checked || false;

  const loading = document.getElementById('lt-loading');
  const statsEl = document.getElementById('lt-stats');
  const tradeSection = document.getElementById('lt-trade-section');
  const runBtn = document.getElementById('lt-run-btn');

  loading.style.display = 'block';
  statsEl.style.display = 'none';
  tradeSection.style.display = 'none';
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';

  try {
    const res = await fetch('/api/strategy/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe, strategy_name: 'Liquidity Trap', use_market_hours: useMarketHours })
    });

    const data = await res.json();
    if (!data.success) { alert('Backtest error: ' + (data.message || 'Unknown error')); return; }

    const d = data.data;
    document.getElementById('lt-rc-total').textContent = d.total_trades;
    document.getElementById('lt-rc-winrate').textContent = d.win_rate + '%';
    document.getElementById('lt-rc-wl').textContent = d.wins + ' / ' + d.losses;
    document.getElementById('lt-win-rate').textContent = d.win_rate + '%';

    const pnlEl = document.getElementById('lt-rc-pnl');
    pnlEl.textContent = (d.total_pnl >= 0 ? '+' : '') + d.total_pnl.toFixed(4);
    pnlEl.style.color = d.total_pnl >= 0 ? '#16a34a' : '#dc2626';
    statsEl.style.display = 'grid';

    const tradesWithSymbol = (d.trades || []).map(t => ({ ...t, symbol: d.symbol }));
    sessionStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    sessionStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol, timeframe: d.timeframe, total_trades: d.total_trades,
      wins: d.wins, partials: d.partials || 0, losses: d.losses,
      win_rate: d.win_rate, total_pnl: d.total_pnl, strategy_name: 'Liquidity Trap'
    }));
    sessionStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    sessionStorage.setItem('dt_strategy_symbol', d.symbol);
    sessionStorage.setItem('dt_strategy_timeframe', d.timeframe);

    if (tradeSection) {
      tradeSection.style.display = 'block';
      tradeSection.innerHTML = `
        <div style="text-align:center;padding:20px;background:var(--bg-color);border-radius:12px;border:1px solid var(--border-color);">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-dark);margin-bottom:6px;">${d.total_trades} trades saved for ${d.symbol} (Liquidity Trap)</div>
          <div style="font-size:13px;color:var(--text-gray);margin-bottom:14px;">
            ${d.wins} Full Wins · ${d.partials || 0} Partial Wins · ${d.losses} Losses · Win Rate: ${d.win_rate}% · Net P&L: ${d.total_pnl >= 0 ? '+' : ''}${d.total_pnl.toFixed(4)}
          </div>
          <a href="/trades" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">📋 View All Trades in Trades Page →</a>
        </div>`;
    }
  } catch (err) {
    console.error('Liquidity Trap Backtest failed:', err);
    alert('Network error. Make sure the Django server is running on port 8000.');
  } finally {
    loading.style.display = 'none';
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}

let ltBotInterval = null;

async function ltToggleBot(checkbox) {
  const panel = document.getElementById('lt-bot-panel');
  const label = document.getElementById('lt-bot-label-text');
  const log = document.getElementById('lt-bot-log');

  const token = localStorage.getItem('nextunToken');
  if (!token) {
    alert("Please log in first to run the live strategy.");
    checkbox.checked = false;
    return;
  }

  const symbol = document.getElementById('lt-symbol').value;
  const timeframe = document.getElementById('lt-timeframe').value;

  checkbox.disabled = true;

  try {
    const stratRes = await fetch('/api/strategies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stratData = await stratRes.json();
    let strategyId = 2; // Default to 2 for Liquidity Trap
    if (stratData.success && stratData.data && stratData.data.strategies) {
      const strat = stratData.data.strategies.find(s => s.name.includes("Liquidity"));
      if (strat) strategyId = strat.id;
    }

    const res = await fetch('/api/strategies/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ strategyId, symbol, timeframe })
    });

    const data = await res.json();

    if (data.success) {
      if (data.message === 'Strategy activated') {
        panel.style.display = 'block';
        label.textContent = 'Bot: ACTIVE 🟢';
        label.style.color = '#16a34a';
        log.innerHTML = '';
        ltAddLog(`[SYSTEM] Real Liquidity Trap Bot activated on ${symbol} (${timeframe}). Live logs will appear below...`);

        // Sync Dashboard variables
        localStorage.setItem('dt_strategy_active', 'true');
        localStorage.setItem('dt_strategy_name', 'Liquidity Trap & Inducement');
        localStorage.setItem('dt_strategy_symbol', symbol);
        localStorage.setItem('dt_strategy_timeframe', timeframe);
        localStorage.setItem('dt_strategy_rr', '1:2');

        startBotStatusPolling(token, log); // Uses the same polling logic as Double Top
      } else {
        label.textContent = 'Bot: OFF';
        label.style.color = '';
        ltAddLog('[SYSTEM] Bot stopped.');

        if (botStatusInterval) {
          clearInterval(botStatusInterval);
          botStatusInterval = null;
        }

        setTimeout(() => { panel.style.display = 'none'; }, 2000);

        // Remove Dashboard variables
        localStorage.setItem('dt_strategy_active', 'false');
        localStorage.removeItem('dt_strategy_name');
        localStorage.removeItem('dt_strategy_symbol');
        localStorage.removeItem('dt_strategy_timeframe');
      }
    } else {
      alert("Error: " + (data.message || 'Unknown error'));
      checkbox.checked = !checkbox.checked; // Revert
    }
  } catch (err) {
    console.error('Toggle failed:', err);
    alert('Network error while toggling strategy.');
    checkbox.checked = !checkbox.checked; // Revert
  } finally {
    checkbox.disabled = false;
  }
}

function ltAddLog(msg) {
  const log = document.getElementById('lt-bot-log');
  if (!log) return;
  const line = document.createElement('div');
  line.textContent = msg;
  if (msg.includes('LONG') || msg.includes('??')) line.style.color = '#4ade80';
  else if (msg.includes('SHORT') || msg.includes('??')) line.style.color = '#f87171';
  else if (msg.includes('SYSTEM')) line.style.color = '#60a5fa';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
