/**
 * Exness Service Module - Local Python Bridge
 * Handles the logic for connecting to the local Exness MT5 Terminal via Python.
 */

const { exec } = require('child_process');
const path = require('path');

class ExnessService {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'mt5_bridge.py');
  }

  // Helper to execute the python script
  _runPythonBridge(action, accountId, password, server) {
    return new Promise((resolve, reject) => {
      // Use python to execute the script with arguments
      const command = `python "${this.pythonScript}" "${action}" "${accountId}" "${password}" "${server}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[ExnessService] Exec error: ${error}`);
          return reject(new Error('Failed to execute Python bridge'));
        }
        
        try {
          const result = JSON.parse(stdout.trim());
          if (!result.success) {
            return reject(new Error(result.message || 'Python bridge returned false'));
          }
          resolve(result);
        } catch (e) {
          console.error(`[ExnessService] Parse error on stdout:`, stdout);
          reject(new Error('Invalid response from MT5 Python bridge'));
        }
      });
    });
  }

  async connectMetaApi(accountId, password, server) {
    console.log(`[ExnessService] Initializing Local MT5 connection for ${accountId}...`);
    try {
      const result = await this._runPythonBridge('connect', accountId, password, server);
      
      // Store credentials in memory for dashboard calls (in a real app, you'd fetch them from the DB based on req.user)
      // Since fetchAccountDetails only receives accountId, we'll cache the password/server locally to make it easy.
      this._cache = this._cache || {};
      this._cache[accountId] = { password, server };

      return {
        success: true,
        message: result.message || 'Connected to local Exness MT5 terminal successfully!',
      };
    } catch (err) {
      console.error('[ExnessService] MT5 Connection failed:', err);
      throw new Error('Failed to connect to MT5 Terminal: ' + err.message);
    }
  }

  async fetchAccountDetails(accountId) {
    console.log(`[ExnessService] Fetching live balances via Local MT5 for ${accountId}...`);
    try {
      const cached = (this._cache && this._cache[accountId]) || {};
      const password = cached.password || process.env.TEMP_EXNESS_PWD || 'NextunAlgo@2026';
      const server = cached.server || process.env.TEMP_EXNESS_SERVER || 'Exness-MT5Trial15';

      const result = await this._runPythonBridge('dashboard', accountId, password, server);
      
      return result.data;
    } catch (err) {
      console.error('[ExnessService] Failed to fetch details:', err);
      throw new Error('Failed to fetch live data from MT5 Terminal: ' + err.message);
    }
  }

  async syncHistory(accountId) {
    console.log(`[ExnessService] Syncing trade history for ${accountId}...`);
    try {
      const cached = (this._cache && this._cache[accountId]) || {};
      const password = cached.password || process.env.TEMP_EXNESS_PWD || 'NextunAlgo@2026';
      const server = cached.server || process.env.TEMP_EXNESS_SERVER || 'Exness-MT5Trial15';

      const result = await this._runPythonBridge('sync_history', accountId, password, server);
      return result.data;
    } catch (err) {
      console.error('[ExnessService] Failed to sync history:', err);
      throw new Error('Failed to sync history from MT5 Terminal: ' + err.message);
    }
  }

  async executeAlgorithmicOrders(accountId) {
    console.log(`[ExnessService] Executing algorithmic strategy orders for ${accountId}...`);
    try {
      const cached = (this._cache && this._cache[accountId]) || {};
      const password = cached.password || process.env.TEMP_EXNESS_PWD || 'NextunAlgo@2026';
      const server = cached.server || process.env.TEMP_EXNESS_SERVER || 'Exness-MT5Trial15';

      const result = await this._runPythonBridge('execute_dummy', accountId, password, server);
      return result;
    } catch (err) {
      console.error('[ExnessService] Failed to execute algorithmic orders:', err);
      throw new Error('Failed to execute algorithmic orders from MT5 Terminal: ' + err.message);
    }
  }

  async executeTrade(accountId, symbol, action, quantity) {
    return { success: true, message: 'Live trading logic not yet implemented.' };
  }
}

module.exports = new ExnessService();
