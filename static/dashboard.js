document.addEventListener('DOMContentLoaded', function() {

  // --- DateTime ---
  function updateDateTime() {
    var el = document.getElementById('current-datetime');
    if (el) {
      var now = new Date();
      el.textContent = now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).replace(',', '');
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // --- Logout ---
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('nextunToken');
      window.location.href = '/';
    });
  }

  // --- Theme Toggle ---
  var themeBtns = document.querySelectorAll('.theme-btn');
  if (themeBtns.length >= 2) {
    var lightBtn = themeBtns[0];
    var darkBtn  = themeBtns[1];
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
    }
    lightBtn.addEventListener('click', function() {
      document.body.classList.remove('dark-theme');
      lightBtn.classList.add('active');
      darkBtn.classList.remove('active');
      localStorage.setItem('theme', 'light');
    });
    darkBtn.addEventListener('click', function() {
      document.body.classList.add('dark-theme');
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
      localStorage.setItem('theme', 'dark');
    });
  }

  // --- Helper: safely parse a date string to a JS Date ---
  // Handles: "2024-01-15 10:00:00+00:00", "2024-01-15T10:00:00Z", etc.
  function parseDateStr(str) {
    if (!str) return null;
    var iso = str.replace(' ', 'T').replace(/\+00:00$/, 'Z');
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // --- Dashboard Init ---
  function initDashboard() {
    function fmt(val) { return (val >= 0 ? '+' : '') + parseFloat(val).toFixed(4); }

    // -- 1. Strategy Status Card --
    // FIX: Strategy is ONLY shown as Active when BOTH:
    //   (a) dt_strategy_active === 'true'  (user clicked Activate)
    //   (b) bt_trades has actual trade data (backtest was run, not just activated)
    var isStratActive = localStorage.getItem('dt_strategy_active') === 'true';
    var btTradesRaw   = localStorage.getItem('bt_trades');
    var hasBacktestData = false;
    if (btTradesRaw) {
      try { hasBacktestData = JSON.parse(btTradesRaw).length > 0; } catch(e) {}
    }
    // Only truly active if activated AND backtest was run
    var isReallyActive = isStratActive && hasBacktestData;

    var stratName    = localStorage.getItem('dt_strategy_name')      || 'No Active Strategy';
    var stratSymbol  = localStorage.getItem('dt_strategy_symbol')    || '';
    var stratTf      = localStorage.getItem('dt_strategy_timeframe') || '';
    var stratWinRate = localStorage.getItem('dt_strategy_winrate')   || '--';
    var stratRR      = localStorage.getItem('dt_strategy_rr')        || '1:2';

    var nameEl = document.getElementById('dash-strategy-name');
    var descEl = document.getElementById('dash-strategy-desc');
    var swEl   = document.getElementById('dash-strategy-switch');
    var smEl   = document.getElementById('dash-strategy-metrics');
    var wrEl   = document.getElementById('dash-strategy-winrate');
    var rrEl   = document.getElementById('dash-strategy-rr');

    if (isReallyActive && stratName !== 'No Active Strategy') {
      if (nameEl) nameEl.textContent = stratName;
      if (descEl) descEl.textContent = stratSymbol + ' | ' + stratTf + ' | Auto-Running';
      if (wrEl)   wrEl.textContent   = stratWinRate;
      if (rrEl)   rrEl.textContent   = stratRR;
      if (swEl)   swEl.style.display = 'block';
      if (smEl)   smEl.style.display = 'flex';
    } else {
      if (nameEl) nameEl.textContent = 'No Active Strategy';
      if (descEl) descEl.textContent = 'Navigate to the Strategies page to enable one.';
      if (swEl)   swEl.style.display = 'none';
      if (smEl)   smEl.style.display = 'none';
    }

    // -- 2. P&L Cards --
    var btSummaryRaw = localStorage.getItem('bt_summary');
    if (btSummaryRaw) {
      var summary  = JSON.parse(btSummaryRaw);
      var totalPnl = summary.total_pnl || 0;
      var totalEl  = document.getElementById('metric-total-pnl');
      if (totalEl) {
        totalEl.textContent = fmt(totalPnl);
        totalEl.className   = totalPnl >= 0 ? 'text-green' : 'text-red';
      }
      var totalSubEl = document.getElementById('metric-total-pnl-sub');
      if (totalSubEl) totalSubEl.textContent = 'Last 6 months - ' + (summary.total_trades || 0) + ' trades';
    }

    // FIX: Monthly/Yearly P&L uses the backtest data date range, NOT today's real date.
    // "Today" = the date of the most recent (last) trade in backtest data
    // "Monthly" = that calendar month, "Yearly" = that calendar year
    if (btTradesRaw && hasBacktestData) {
      var trades = JSON.parse(btTradesRaw);

      var lastTrade = trades[trades.length - 1];
      var refDate   = parseDateStr(lastTrade.exit_time);
      if (!refDate) refDate = new Date();

      var refYear  = refDate.getFullYear();
      var refMonth = refDate.getMonth();
      var refDay   = refDate.getDate();

      var refDateStr  = refYear + '-' + pad2(refMonth + 1) + '-' + pad2(refDay);
      var refMonthStr = refYear + '-' + pad2(refMonth + 1);
      var refYearStr  = String(refYear);

      var todayPnl = 0, monthPnl = 0, yearPnl = 0;

      trades.forEach(function(t) {
        if (!t.exit_time) return;
        var pnl = t.pnl || 0;
        var d   = parseDateStr(t.exit_time);
        if (!d) return;
        var dStr = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
        var mStr = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
        var yStr = String(d.getFullYear());
        if (dStr === refDateStr)  todayPnl += pnl;
        if (mStr === refMonthStr) monthPnl += pnl;
        if (yStr === refYearStr)  yearPnl  += pnl;
      });

      function updateCard(id, val) {
        var el = document.getElementById(id);
        if (el) {
          el.textContent = fmt(val);
          el.className = val >= 0 ? 'text-green' : 'text-red';
        }
      }

      var todaySub = document.getElementById('metric-todays-pnl-sub');
      var monthSub = document.getElementById('metric-monthly-pnl-sub');
      var yearSub  = document.getElementById('metric-yearly-pnl-sub');
      if (todaySub) todaySub.textContent = 'from closed trades today (' + refDateStr + ')';
      if (monthSub) monthSub.textContent = 'current calendar month (' + refMonthStr + ')';
      if (yearSub)  yearSub.textContent  = 'current calendar year (' + refYearStr + ')';

      updateCard('metric-todays-pnl', todayPnl);
      updateCard('metric-monthly-pnl', monthPnl);
      updateCard('metric-yearly-pnl', yearPnl);
    }
  }

  // --- Calendar ---

  // Build dateMap: { "YYYY-MM-DD": totalPnl }
  function buildDateMap(trades) {
    var dateMap = {};
    trades.forEach(function(t) {
      if (!t.exit_time) return;
      var d = parseDateStr(t.exit_time);
      if (!d) return;
      var key = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      dateMap[key] = (dateMap[key] || 0) + (t.pnl || 0);
    });
    return dateMap;
  }

  function fetchCalendarData() {
    var raw = localStorage.getItem('bt_trades');
    if (!raw) { renderCalendar([], {}); return; }
    try {
      var trades = JSON.parse(raw);
      if (!trades || trades.length === 0) { renderCalendar([], {}); return; }

      var dateMap = buildDateMap(trades);

      // FIX: On first load, jump to the LAST trade's month/year
      // Store calYear and calMonth as plain integers, NOT inside a Date object.
      // Using Date.setMonth() on a shared Date object causes overflow (e.g. Dec+1 = 2367 bug).
      if (!window.calendarInitialized) {
        var lastTrade = trades[trades.length - 1];
        var lastDate  = parseDateStr(lastTrade.exit_time);
        if (lastDate) {
          window.calYear  = lastDate.getFullYear();
          window.calMonth = lastDate.getMonth();  // 0=Jan ... 11=Dec
        } else {
          var now = new Date();
          window.calYear  = now.getFullYear();
          window.calMonth = now.getMonth();
        }
        window.calendarInitialized = true;
      }

      var records = Object.keys(dateMap).map(function(d) { return { date: d, pnl: dateMap[d] }; });
      renderCalendar(records, dateMap);
      setupCalendarNav();
    } catch (err) {
      console.error('Calendar parse error:', err);
      renderCalendar([], {});
    }
  }

  function setupCalendarNav() {
    if (window.calNavSetup) return;
    var btns = document.querySelectorAll('.cal-nav');
    if (btns.length >= 2) {
      btns[0].addEventListener('click', function() {
        // Previous month: decrement integers, handle year rollback
        window.calMonth--;
        if (window.calMonth < 0) { window.calMonth = 11; window.calYear--; }
        reloadCalendar();
      });
      btns[1].addEventListener('click', function() {
        // Next month: increment integers, handle year rollover
        window.calMonth++;
        if (window.calMonth > 11) { window.calMonth = 0; window.calYear++; }
        reloadCalendar();
      });
      window.calNavSetup = true;
    }
  }

  function reloadCalendar() {
    var raw = localStorage.getItem('bt_trades');
    if (!raw) { renderCalendar([], {}); return; }
    try {
      var allTrades = JSON.parse(raw);
      var dateMap   = buildDateMap(allTrades);
      var records   = Object.keys(dateMap).map(function(d) { return { date: d, pnl: dateMap[d] }; });
      renderCalendar(records, dateMap);
    } catch(e) {}
  }

  function renderCalendar(records, dateMap) {
    var grid = document.getElementById('calendar-grid');
    if (!grid) return;

    // FIX: Read calYear/calMonth as plain integers to avoid Date mutation overflow
    var year  = (window.calYear  !== undefined) ? window.calYear  : new Date().getFullYear();
    var month = (window.calMonth !== undefined) ? window.calMonth : new Date().getMonth();

    var monthStr = year + '-' + pad2(month + 1);

    // Trading summary for the selected month only
    var netPnl = 0, profitDays = 0, lossDays = 0;
    records.forEach(function(r) {
      if (r.date.startsWith(monthStr)) {
        netPnl += r.pnl;
        if (r.pnl >= 0) profitDays++; else lossDays++;
      }
    });

    function fmt4(v) { return (v >= 0 ? '+' : '') + v.toFixed(4); }
    var netEl = document.getElementById('summary-net-pnl');
    if (netEl) {
      netEl.textContent = fmt4(netPnl);
      netEl.className   = netPnl >= 0 ? 'val text-green' : 'val text-red';
    }
    var pdEl = document.getElementById('summary-profit-days');
    var ldEl = document.getElementById('summary-loss-days');
    var wrEl = document.getElementById('summary-win-rate');
    if (pdEl) pdEl.textContent = profitDays;
    if (ldEl) ldEl.textContent = lossDays;
    var total = profitDays + lossDays;
    if (wrEl) wrEl.textContent = (total > 0 ? Math.round(profitDays / total * 100) : 0) + '%';

    // Month/Year label
    var monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
    var hdr = document.getElementById('calendar-month-year');
    if (hdr) hdr.textContent = monthNames[month] + ' ' + year;

    var daysInMonth = new Date(year, month + 1, 0).getDate();
    // Compute first-column offset (Mon=0 grid)
    var firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;  // Sun(0)->6, Mon(1)->0, Tue(2)->1 ...

    var html = '<div class="cal-header">MON</div><div class="cal-header">TUE</div>' +
               '<div class="cal-header">WED</div><div class="cal-header">THU</div>' +
               '<div class="cal-header">FRI</div><div class="cal-header">SAT</div>' +
               '<div class="cal-header">SUN</div>';

    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell" style="background:transparent;border:none;"></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var ds  = year + '-' + pad2(month + 1) + '-' + pad2(day);
      var pnl = (dateMap && dateMap[ds] !== undefined) ? dateMap[ds] : undefined;
      if (pnl !== undefined) {
        var bgClass = pnl >= 0 ? 'bg-green' : 'bg-red';
        var sign    = pnl >= 0 ? '+' : '';
        html += '<div class="cal-cell ' + bgClass + '"><span class="day">' + day + '</span><span class="pl">' + sign + pnl.toFixed(4) + '</span></div>';
      } else {
        html += '<div class="cal-cell" style="background:transparent;"><span class="day" style="color:var(--text-gray);">' + day + '</span></div>';
      }
    }

    grid.innerHTML = html;
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  initDashboard();
  fetchCalendarData();

});
