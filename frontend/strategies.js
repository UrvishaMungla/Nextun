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

  // Handle Strategies Reactivity
  const token = localStorage.getItem('nextunToken');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  async function fetchStrategies() {
    try {
      const res = await fetch('http://localhost:5000/api/strategies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        renderStrategies(data.data.strategies, data.data.activeStrategy);
      }
    } catch (err) {
      console.error('Error fetching strategies:', err);
    }
  }

  function renderStrategies(strategies, activeStrategyId) {
    const container = document.getElementById('strategies-container');
    if (!container) return;

    const activeStrategies = strategies.filter(s => s._id === activeStrategyId);
    const availableStrategies = strategies.filter(s => s._id !== activeStrategyId);

    let html = '';

    // Active Section
    if (activeStrategies.length > 0) {
      html += `
        <div class="strategies-section">
          <div class="section-header">
            <h2>Active Strategies</h2>
            <div class="active-badge">1 Active</div>
          </div>
      `;
      activeStrategies.forEach(s => {
        html += buildStrategyCard(s, true);
      });
      html += `</div>`;
    }

    // Available Section
    if (availableStrategies.length > 0) {
      html += `
        <div class="strategies-section">
          <div class="section-header">
            <h2>Available Strategies</h2>
          </div>
      `;
      availableStrategies.forEach(s => {
        html += buildStrategyCard(s, false);
      });
      html += `</div>`;
    }

    container.innerHTML = html;

    // Attach event listeners to toggles
    document.querySelectorAll('.strategy-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const strategyId = e.target.dataset.id;
        await toggleStrategy(strategyId);
      });
    });
  }

  function buildStrategyCard(strategy, isActive) {
    return `
      <div class="strategy-list-card ${isActive ? 'is-active' : ''}">
        <div class="strategy-top-row">
          <h3>${strategy.name}</h3>
          <label class="switch">
            <input type="checkbox" class="strategy-toggle" data-id="${strategy._id}" ${isActive ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
        <p class="strategy-desc">${strategy.description}</p>
        <div class="strategy-stats-row">
          <div class="stat-item">
            <span class="stat-lbl">Minimum Capital</span>
            <span class="stat-val">${strategy.minCapital}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Success Rate</span>
            <span class="stat-val">${strategy.successRate}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Risk to Reward</span>
            <span class="stat-val">${strategy.riskReward}</span>
          </div>
        </div>
      </div>
    `;
  }

  async function toggleStrategy(strategyId) {
    try {
      const res = await fetch('http://localhost:5000/api/strategies/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ strategyId })
      });
      const data = await res.json();
      if (data.success) {
        // Refetch to re-render the sections properly
        fetchStrategies();
      }
    } catch (err) {
      console.error('Error toggling strategy:', err);
    }
  }

  fetchStrategies();
});
