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
    localStorage.removeItem('dt_strategy_active');
    window.location.href = '/';
  });

  // Sync activation state with backend
  (async function syncState() {
    try {
      const token = sessionStorage.getItem('nextunToken');
      if (!token) return;
      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.running) {
          localStorage.setItem('dt_strategy_active', 'true');
          setActiveState(true);
          
          // Also set the execute button state correctly
          const execBtn = document.getElementById('dt-execute-btn');
          const panel = document.getElementById('bot-panel');
          if (execBtn) {
            execBtn.textContent = 'Stop Live Strategy';
            execBtn.classList.add('active-state');
          }
          if (panel) {
            panel.style.display = 'block';
          }
          // Resume polling if running
          const log = document.getElementById('bot-log');
          if (log) {
             startBotStatusPolling(token, log);
          }
        } else {
          localStorage.removeItem('dt_strategy_active');
          setActiveState(false);
        }
      }
    } catch (e) {}
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
  const current = localStorage.getItem('dt_strategy_active') === 'true';
  const next = !current;
  localStorage.setItem('dt_strategy_active', next ? 'true' : 'false');

  if (next) {
    // Save strategy info for Dashboard to read
    const symbol = document.getElementById('bt-symbol')?.value || 'EURUSD=X';
    const timeframe = document.getElementById('bt-timeframe')?.value || '1h';
    localStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
    localStorage.setItem('dt_strategy_symbol', symbol);
    localStorage.setItem('dt_strategy_timeframe', timeframe);
    localStorage.setItem('dt_strategy_rr', '1:2');
  } else {
    localStorage.removeItem('dt_strategy_name');
    localStorage.removeItem('dt_strategy_symbol');
    localStorage.removeItem('dt_strategy_timeframe');
    localStorage.removeItem('dt_strategy_winrate');
    // Clear backtest trades so Trades page goes back to empty state
    localStorage.removeItem('bt_trades');
    localStorage.removeItem('bt_summary');
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
        execBtn.textContent = 'Stop Live Strategy';
        execBtn.classList.add('active-state');
        panel.style.display = 'block';
        log.innerHTML = '';
        addLog('[SYSTEM] Bot activated! Live logs will appear below...');
        
        // Save to Dashboard
        localStorage.setItem('dt_strategy_active', 'true');
        localStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        localStorage.setItem('dt_strategy_symbol', symbol);
        localStorage.setItem('dt_strategy_timeframe', timeframe);
        localStorage.setItem('dt_strategy_rr', '1:2');

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
        localStorage.setItem('dt_strategy_active', 'false');
        localStorage.removeItem('dt_strategy_name');
        localStorage.removeItem('dt_strategy_symbol');
        localStorage.removeItem('dt_strategy_timeframe');
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
  const isStratActive = localStorage.getItem('dt_strategy_active') === 'true';
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
    localStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    localStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol,
      timeframe: d.timeframe,
      total_trades: d.total_trades,
      wins: d.wins,
      partials: d.partials || 0,
      losses: d.losses,
      total_pnl: d.total_pnl,
      strategy_name: 'Double Top / Double Bottom'
    }));
    localStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    localStorage.setItem('dt_strategy_symbol', d.symbol);
    localStorage.setItem('dt_strategy_timeframe', d.timeframe);

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
        localStorage.setItem('dt_strategy_active', 'true');
        localStorage.setItem('dt_strategy_name', 'Double Top / Double Bottom');
        localStorage.setItem('dt_strategy_symbol', symbol);
        localStorage.setItem('dt_strategy_timeframe', timeframe);
        localStorage.setItem('dt_strategy_rr', '1:2');

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
  if (localStorage.getItem('lt_strategy_active') === 'true') {
    ltSetActiveState(true);
  }
})();

function ltSetActiveState(isActive) {
  const badge = document.getElementById('lt-status-badge');
  const btn = document.getElementById('lt-activate-btn');
  if (badge) {
    badge.textContent = isActive ? '? Active' : 'Available';
    badge.className = 'strategy-badge ' + (isActive ? 'badge-active' : 'badge-available');
  }
  if (btn) {
    btn.textContent = isActive ? '? Deactivate Strategy' : '? Activate Strategy';
    btn.className = 'btn-activate ' + (isActive ? 'active-state' : '');
  }
}

function ltToggleActivate() {
  const current = localStorage.getItem('lt_strategy_active') === 'true';
  const next = !current;
  localStorage.setItem('lt_strategy_active', next ? 'true' : 'false');

  if (next) {
    const symbol = document.getElementById('lt-symbol')?.value || 'EURUSD=X';
    const timeframe = document.getElementById('lt-timeframe')?.value || '5m';
    localStorage.setItem('dt_strategy_name', 'Liquidity Trap');
    localStorage.setItem('dt_strategy_symbol', symbol);
    localStorage.setItem('dt_strategy_timeframe', timeframe);
    localStorage.setItem('dt_strategy_rr', '1:2');
    if (localStorage.getItem('dt_strategy_active') === 'true') {
      localStorage.setItem('dt_strategy_active', 'false');
      setActiveState(false);
    }
    ltSetActiveState(true);
    ltRunBacktest();
  } else {
    localStorage.removeItem('dt_strategy_name');
    localStorage.removeItem('dt_strategy_symbol');
    localStorage.removeItem('dt_strategy_timeframe');
    localStorage.removeItem('dt_strategy_winrate');
    localStorage.removeItem('bt_trades');
    localStorage.removeItem('bt_summary');
    ltSetActiveState(false);
  }
}

async function ltRunBacktest() {
  const isStratActive = localStorage.getItem('lt_strategy_active') === 'true';
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
    localStorage.setItem('bt_trades', JSON.stringify(tradesWithSymbol));
    localStorage.setItem('bt_summary', JSON.stringify({
      symbol: d.symbol, timeframe: d.timeframe, total_trades: d.total_trades,
      wins: d.wins, partials: d.partials || 0, losses: d.losses,
      win_rate: d.win_rate, total_pnl: d.total_pnl, strategy_name: 'Liquidity Trap'
    }));
    localStorage.setItem('dt_strategy_winrate', d.win_rate + '%');
    localStorage.setItem('dt_strategy_symbol', d.symbol);
    localStorage.setItem('dt_strategy_timeframe', d.timeframe);

    if (tradeSection) {
      tradeSection.style.display = 'block';
      tradeSection.innerHTML = `
        <div style="text-align:center;padding:20px;background:var(--bg-color);border-radius:12px;border:1px solid var(--border-color);">
          <div style="font-size:28px;margin-bottom:8px;">?</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-dark);margin-bottom:6px;">${d.total_trades} trades saved for ${d.symbol} (Liquidity Trap)</div>
          <div style="font-size:13px;color:var(--text-gray);margin-bottom:14px;">
            ${d.wins} Full Wins � ${d.partials || 0} Partial Wins � ${d.losses} Losses � Win Rate: ${d.win_rate}% � Net P&L: ${d.total_pnl >= 0 ? '+' : ''}${d.total_pnl.toFixed(4)}
          </div>
          <a href="/trades" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">?? View All Trades in Trades Page ?</a>
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

function ltToggleBot(checkbox) {
  const panel = document.getElementById('lt-bot-panel');
  const label = document.getElementById('lt-bot-label-text');
  const log = document.getElementById('lt-bot-log');
  if (checkbox.checked) {
    panel.style.display = 'block';
    label.textContent = 'Bot: ACTIVE ??';
    label.style.color = '#16a34a';
    log.innerHTML = '';
    const sym = document.getElementById('lt-symbol').value;
    const tf = document.getElementById('lt-timeframe').value;
    ltAddLog(`[SYSTEM] Liquidity Trap Bot started. Monitoring ${sym} on ${tf}...`);
    ltBotInterval = setInterval(() => {
      const rand = Math.random();
      const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
      const price = (Math.random() * 0.5 + 1.05).toFixed(5);
      const sl = (parseFloat(price) - 0.0015).toFixed(5);
      const tp = (parseFloat(price) + 0.0030).toFixed(5);
      const pool = (parseFloat(price) - 0.0020).toFixed(5);
      if (rand < 0.10) {
        ltAddLog(`[${now}] ?? SWEEP below pool ${pool} | LONG ENTRY @ ${price} | SL: ${sl} | TP: ${tp}`);
      } else if (rand < 0.20) {
        const ep = (Math.random() * 0.5 + 1.05).toFixed(5);
        const s = (parseFloat(ep) + 0.0015).toFixed(5);
        const t = (parseFloat(ep) - 0.0030).toFixed(5);
        ltAddLog(`[${now}] ?? SWEEP above pool | SHORT ENTRY @ ${ep} | SL: ${s} | TP: ${t}`);
      } else {
        ltAddLog(`[${now}] ?? Monitoring ${sym} (${tf})... Waiting for sweep signal.`);
      }
    }, 3500);
  } else {
    clearInterval(ltBotInterval);
    ltBotInterval = null;
    panel.style.display = 'none';
    label.textContent = 'Bot: OFF';
    label.style.color = '';
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
