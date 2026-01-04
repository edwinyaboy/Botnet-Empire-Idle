const MAX_SAFE_INTEGER = 9007199254740991;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

class CryptoMining {
    constructor() {
        this.isActive = false;
        this.miningActive = false;
        this.updateInterval = null;
        this.keyHandlerBound = false;
        
        this.state = {
            active: false,
            mode: 'low',
            lastUpdate: Date.now(),
            totalMined: 0
        };
        
        this.elements = {};
        this.rates = {
            low: {
                botPenalty: 0.7,
                baseRate: 0.0001,
                volatility: 0.2,
                riskColor: '#58a6ff'
            },
            high: {
                botPenalty: 0.5,
                baseRate: 0.0005,
                volatility: 0.5,
                riskColor: '#f85149'
            }
        };
        
        this.currentRate = { low: 0.0001, high: 0.0005 };
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.createUI();
    }
    
    initAfterGameLoad() {
        this.loadState();
        this.updateRates();
        this.updateUI();
        this.show();
    }
    
    createUI() {
        try {
            this.elements.container = document.createElement('div');
            this.elements.container.id = 'cryptoMiningPanel';
            this.elements.container.className = 'panel';
            this.elements.container.style.display = 'none';
            
            const header = document.createElement('h3');
            header.textContent = 'Cryptocurrency Mining';
            header.style.cssText = 'margin:0 0 16px 0; color:#58a6ff; font-size:clamp(12px, 2.5vw, 14px); font-weight:600; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:12px; border-bottom:1px solid #21262d;';
            
            const modeSelector = document.createElement('div');
            modeSelector.className = 'crypto-mode-selector';
            modeSelector.style.cssText = 'display:flex; gap:12px; margin-bottom:20px;';
            
            this.elements.lowRiskBtn = this.createModeButton('Low Risk', 'low');
            this.elements.highRiskBtn = this.createModeButton('High Risk', 'high');
            
            modeSelector.appendChild(this.elements.lowRiskBtn);
            modeSelector.appendChild(this.elements.highRiskBtn);
            
            const statsContainer = document.createElement('div');
            statsContainer.className = 'crypto-stats-container';
            statsContainer.style.cssText = 'background:#0d1117; border:1px solid #30363d; border-radius:6px; padding:16px; margin-bottom:20px;';
            
            this.elements.statsGrid = document.createElement('div');
            this.elements.statsGrid.className = 'crypto-stats-grid';
            this.elements.statsGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;';
            
            this.elements.currentMode = this.createStatCard('CURRENT MODE', '--', '#8b949e');
            this.elements.currentRate = this.createStatCard('MINING RATE PER COMPUTER', '--', '#58a6ff');
            this.elements.botPenalty = this.createStatCard('POOR COMPUTERS HACKED PER SECOND PENALTY', '--', '#f85149');
            this.elements.totalMined = this.createStatCard('TOTAL CASH MINED', '--', '#ffc107');
            
            this.elements.statsGrid.appendChild(this.elements.currentMode);
            this.elements.statsGrid.appendChild(this.elements.currentRate);
            this.elements.statsGrid.appendChild(this.elements.botPenalty);
            this.elements.statsGrid.appendChild(this.elements.totalMined);
            
            statsContainer.appendChild(this.elements.statsGrid);
            
            const controlContainer = document.createElement('div');
            controlContainer.className = 'crypto-controls';
            controlContainer.style.cssText = 'display:flex; gap:12px; flex-wrap:wrap; justify-content:center;';
            
            this.elements.toggleBtn = document.createElement('button');
            this.elements.toggleBtn.className = 'primary';
            this.elements.toggleBtn.textContent = 'Start Mining';
            this.elements.toggleBtn.style.cssText = 'flex: none; width: auto; min-width: 150px; max-width: 200px; padding: 12px 24px; margin: 0 auto;';
            
            controlContainer.appendChild(this.elements.toggleBtn);
            
            const infoPanel = document.createElement('div');
            infoPanel.className = 'crypto-info';
            infoPanel.style.cssText = 'margin-top:20px; padding:12px; background:#0d1117; border:1px solid #30363d; border-radius:6px; font-size:clamp(10px, 2vw, 11px); color:#8b949e;';
            
            const infoTitle = document.createElement('div');
            infoTitle.textContent = 'How Mining Works:';
            infoTitle.style.cssText = 'font-weight:600; color:#58a6ff; margin-bottom:8px;';
            
            const infoList = document.createElement('ul');
            infoList.style.cssText = 'margin:0; padding-left:20px;';
            
            const points = [
                'Use your total hacked computers to mine cryptocurrency, which gains cash',
                'Low Risk: -30% hacked computer generation',
                'High Risk: -50% hacked computer generation',
                'Prices fluctuate randomly',
                'Mining continues up to 4 hours after the game is closed'
            ];
            
            points.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                li.style.marginBottom = '4px';
                infoList.appendChild(li);
            });
            
            infoPanel.appendChild(infoTitle);
            infoPanel.appendChild(infoList);
            
            this.elements.container.appendChild(header);
            this.elements.container.appendChild(modeSelector);
            this.elements.container.appendChild(statsContainer);
            this.elements.container.appendChild(controlContainer);
            this.elements.container.appendChild(infoPanel);
            
            const skillsPanel = document.getElementById('skillsPanel');
            if (skillsPanel && skillsPanel.parentNode) {
                skillsPanel.parentNode.insertBefore(this.elements.container, skillsPanel.nextSibling);
            }
            
            this.bindEvents();
            
        } catch (e) {
            console.error("Error creating crypto UI:", e);
        }
    }
    
    createModeButton(label, mode) {
        const btn = document.createElement('button');
        btn.className = 'crypto-mode-btn';
        btn.setAttribute('data-mode', mode);
        btn.textContent = label;
        btn.style.cssText = `
            flex: 1;
            padding: 10px 16px;
            background: #21262d;
            border: 2px solid #30363d;
            color: #c9d1d9;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            font-size: clamp(11px, 2.5vw, 13px);
            transition: all 0.2s;
            min-width: 100px;
        `;
        
        btn.onmouseover = () => {
            if (!btn.disabled && !btn.classList.contains('active')) {
                btn.style.background = '#30363d';
                btn.style.borderColor = this.rates[mode].riskColor;
            }
        };
        
        btn.onmouseout = () => {
            if (!btn.classList.contains('active')) {
                btn.style.background = '#21262d';
                btn.style.borderColor = '#30363d';
            }
        };
        
        return btn;
    }
    
    createStatCard(label, value, color = '#58a6ff') {
        const card = document.createElement('div');
        card.className = 'crypto-stat-card';
        card.style.cssText = 'background:#161b22; padding:12px; border-radius:6px; border:1px solid #30363d;';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'crypto-stat-label';
        labelDiv.textContent = label;
        labelDiv.style.cssText = 'font-size:clamp(10px, 2vw, 11px); color:#8b949e; margin-bottom:8px;';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'crypto-stat-value';
        valueDiv.textContent = value;
        valueDiv.style.cssText = `font-size:clamp(14px, 3vw, 18px); color:${color}; font-weight:600;`;
        
        card.appendChild(labelDiv);
        card.appendChild(valueDiv);
        return card;
    }
    
    handleKeyDown(e) {
        if (!this.isActive) return;
        
        switch (e.code) {
            case 'Escape':
                this.exit();
                break;
        }
    }
    
    bindEvents() {
        try {
            this.elements.lowRiskBtn.onclick = () => this.setMode('low');
            this.elements.highRiskBtn.onclick = () => this.setMode('high');
            this.elements.toggleBtn.onclick = () => this.toggleMining();
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.saveState();
                }
            });
            
        } catch (e) {
            console.error("Error binding crypto events:", e);
        }
    }
    
    setMode(mode) {
        try {
            if (this.state.mode === mode) return;
            
            this.state.mode = mode;
            this.updateRates();
            this.updateUI();
            this.saveState();
            
        } catch (e) {
            console.error("Error setting crypto mode:", e);
        }
    }
    
    updateRates() {
        try {
            const mode = this.state.mode;
            const rateConfig = this.rates[mode];
            
            const fluctuation = (Math.random() * 2 - 1) * rateConfig.volatility;
            this.currentRate[mode] = Math.max(0.0001, rateConfig.baseRate * (1 + fluctuation));
            
            setTimeout(() => this.updateRates(), 30000 + Math.random() * 60000);
            
        } catch (e) {
            console.error("Error updating crypto rates:", e);
        }
    }
    
    toggleMining() {
        try {
            this.state.active = !this.state.active;
            this.state.lastUpdate = Date.now();
            
            if (this.state.active) {
                this.startMining();
            } else {
                this.stopMining();
            }
            
            this.updateUI();
            this.saveState();
            
        } catch (e) {
            console.error("Error toggling mining:", e);
        }
    }
    
    startMining() {
        try {
            this.miningActive = true;
            this.startUpdateInterval();
            this.elements.toggleBtn.textContent = 'Stop Mining';
            this.elements.toggleBtn.className = 'danger';
        } catch (e) {
            console.error("Error starting mining:", e);
        }
    }
    
    stopMining() {
        try {
            this.miningActive = false;
            this.stopUpdateInterval();
            this.elements.toggleBtn.textContent = 'Start Mining';
            this.elements.toggleBtn.className = 'primary';
        } catch (e) {
            console.error("Error stopping mining:", e);
        }
    }
    
    startUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateMining();
        }, 1000);
    }
    
    stopUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateMining() {
        try {
            const now = Date.now();
            const delta = (now - this.state.lastUpdate) / 1000;
            this.state.lastUpdate = now;
            
            if (typeof window.game === 'undefined' || !window.game.bots) return;
            
            const totalBots = sanitizeNumber(
                (window.game.bots.t1 || 0) + 
                (window.game.bots.t2 || 0) + 
                (window.game.bots.t3 || 0) + 
                (window.game.bots.mobile || 0)
            );
            
            if (totalBots <= 0) return;
            
            const mode = this.state.mode;
            const rate = this.currentRate[mode];
            const mined = totalBots * rate * delta;
            
            if (mined > 0) {
                window.game.money = sanitizeNumber(window.game.money + mined, 0, 0);
                window.game.totalEarned = sanitizeNumber(window.game.totalEarned + mined, 0, 0);
                this.state.totalMined = sanitizeNumber(this.state.totalMined + mined, 0, 0);
                
                if (typeof window.saveGame === 'function') {
                    window.saveGame();
                }
            }
            
            this.updateUI();
            
        } catch (e) {
            console.error("Error updating mining:", e);
        }
    }
    
    updateUI() {
        try {
            if (!this.isActive) return;
            
            const mode = this.state.mode;
            const rate = this.currentRate[mode];
            const penalty = this.rates[mode].botPenalty;
            
            this.elements.lowRiskBtn.classList.toggle('active', mode === 'low');
            this.elements.highRiskBtn.classList.toggle('active', mode === 'high');
            
            if (mode === 'low') {
                this.elements.lowRiskBtn.style.background = '#1f6feb';
                this.elements.lowRiskBtn.style.borderColor = '#58a6ff';
                this.elements.lowRiskBtn.style.color = '#fff';
                this.elements.highRiskBtn.style.background = '#21262d';
                this.elements.highRiskBtn.style.borderColor = '#30363d';
                this.elements.highRiskBtn.style.color = '#c9d1d9';
            } else {
                this.elements.highRiskBtn.style.background = '#da3633';
                this.elements.highRiskBtn.style.borderColor = '#f85149';
                this.elements.highRiskBtn.style.color = '#fff';
                this.elements.lowRiskBtn.style.background = '#21262d';
                this.elements.lowRiskBtn.style.borderColor = '#30363d';
                this.elements.lowRiskBtn.style.color = '#c9d1d9';
            }
            
            this.elements.currentMode.querySelector('.crypto-stat-value').textContent = 
                mode === 'low' ? 'Low Risk' : 'High Risk';
            this.elements.currentMode.querySelector('.crypto-stat-value').style.color = 
                this.rates[mode].riskColor;
            
            this.elements.currentRate.querySelector('.crypto-stat-value').textContent = 
                `$${rate.toFixed(5)}/s`;
            
            this.elements.botPenalty.querySelector('.crypto-stat-value').textContent = 
                `-${((1 - penalty) * 100).toFixed(0)}%`;
            
            this.elements.totalMined.querySelector('.crypto-stat-value').textContent = 
                `$${Math.floor(this.state.totalMined).toLocaleString()}`;
            
            if (this.state.active) {
                if (this.elements.toggleBtn.textContent !== 'Stop Mining') {
                    this.elements.toggleBtn.textContent = 'Stop Mining';
                    this.elements.toggleBtn.className = 'danger';
                }
            } else {
                if (this.elements.toggleBtn.textContent !== 'Start Mining') {
                    this.elements.toggleBtn.textContent = 'Start Mining';
                    this.elements.toggleBtn.className = 'primary';
                }
            }
            
            if (typeof window.game !== 'undefined') {
                const totalBots = sanitizeNumber(
                    (window.game.bots.t1 || 0) + 
                    (window.game.bots.t2 || 0) + 
                    (window.game.bots.t3 || 0) + 
                    (window.game.bots.mobile || 0)
                );
                
                const estPerSecond = totalBots * rate;
                const estPerMinute = estPerSecond * 60;
                const estPerHour = estPerMinute * 60;
                
                const estContainer = this.elements.container.querySelector('.crypto-estimates');
                if (!estContainer) {
                    const newEstContainer = document.createElement('div');
                    newEstContainer.className = 'crypto-estimates';
                    newEstContainer.style.cssText = 'margin-top:12px; padding:12px; background:#161b22; border:1px solid #30363d; border-radius:6px; font-size:clamp(10px, 2vw, 11px); color:#8b949e;';
                    
                    const estTitle = document.createElement('div');
                    estTitle.textContent = 'Estimated Earnings:';
                    estTitle.style.cssText = 'font-weight:600; color:#58a6ff; margin-bottom:4px;';
                    
                    const estText = document.createElement('div');
                    estText.id = 'cryptoEstimates';
                    
                    newEstContainer.appendChild(estTitle);
                    newEstContainer.appendChild(estText);
                    
                    const infoPanel = this.elements.container.querySelector('.crypto-info');
					  if (infoPanel && infoPanel.parentNode) {
						infoPanel.parentNode.insertBefore(newEstContainer, infoPanel);
					}
                }
                
                const estText = this.elements.container.querySelector('#cryptoEstimates');
                if (estText) {
                    estText.innerHTML = `
                        $${estPerSecond.toFixed(2)}/sec • 
                        $${estPerMinute.toFixed(0)}/min • 
                        $${estPerHour.toFixed(0)}/hour
                    `;
                }
            }
            
        } catch (e) {
            console.error("Error updating crypto UI:", e);
        }
    }
    
    getBotGenerationMultiplier() {
        try {
            if (!this.state.active) return 1;
            
            const mode = this.state.mode;
            return this.rates[mode].botPenalty;
            
        } catch (e) {
            console.error("Error getting bot generation multiplier:", e);
            return 1;
        }
    }
    
    show() {
        try {
            this.isActive = true;
            this.elements.container.style.display = 'block';
            
            if (!this.keyHandlerBound) {
                document.addEventListener('keydown', this.handleKeyDown);
                this.keyHandlerBound = true;
            }
            
            this.updateUI();
        } catch (e) {
            console.error("Error showing crypto panel:", e);
        }
    }
    
    hide() {
        try {
            this.isActive = false;
            this.elements.container.style.display = 'none';
            
            if (this.keyHandlerBound) {
                document.removeEventListener('keydown', this.handleKeyDown);
                this.keyHandlerBound = false;
            }
        } catch (e) {
            console.error("Error hiding crypto panel:", e);
        }
    }
    
    exit() {
        this.hide();
    }
    
    saveState() {
        try {
            this.state.lastUpdate = Date.now();

            if (typeof window.game !== 'undefined') {
                window.game.cryptoMiningState = {
                    active: this.state.active,
                    mode: this.state.mode,
                    totalMined: this.state.totalMined,
                    lastUpdate: this.state.lastUpdate
                };

                localStorage.setItem('crypto_mining_v3', JSON.stringify(this.state));
                
                if (typeof window.saveGame === 'function') {
                    window.saveGame();
                }
            } else {
                localStorage.setItem('crypto_mining_v3', JSON.stringify(this.state));
            }
            
        } catch (e) {
            console.error("Error saving crypto state:", e);
        }
    }
    
    loadState() {
        try {
            let data = null;
            
            if (typeof window.game !== 'undefined' && window.game.cryptoMiningState) {
                data = window.game.cryptoMiningState;
            } else {
                const saved = localStorage.getItem('crypto_mining_v3');
                if (saved) {
                    data = JSON.parse(saved);
                }
            }
            
            if (data) {
  this.state.active = Boolean(data.active);
  this.state.mode = (data.mode === 'high') ? 'high' : 'low';
  this.state.totalMined = sanitizeNumber(data.totalMined, 0, 0);
  this.state.lastUpdate = data.lastUpdate || Date.now();
  
  if (this.state.active) {
    this.miningActive = true;
    
    if (this.elements.toggleBtn) {
      this.elements.toggleBtn.textContent = 'Stop Mining';
      this.elements.toggleBtn.className = 'danger';
    }
    
    this.startUpdateInterval();
	  } else {
		if (this.elements.toggleBtn) {
		  this.elements.toggleBtn.textContent = 'Start Mining';
		  this.elements.toggleBtn.className = 'primary';
		  }
	  }
  
	this.state.lastUpdate = Date.now();
	  }
        } catch (e) {
            console.error("Error loading crypto state:", e);
        }
    }
}

let cryptoMiningInstance = null;

function initCryptoMining() {
    try {
        if (!cryptoMiningInstance) {
            cryptoMiningInstance = new CryptoMining();
        }
        return cryptoMiningInstance;
    } catch (e) {
        console.error("Error initializing crypto mining:", e);
        return null;
    }
}

function getCryptoMiningInstance() {
    return cryptoMiningInstance;
}

function initCryptoAfterGameLoad() {
    try {
        if (!cryptoMiningInstance) {
            cryptoMiningInstance = new CryptoMining();
        }

        cryptoMiningInstance.loadState();
        cryptoMiningInstance.updateRates();
        cryptoMiningInstance.updateUI();
        
    } catch (e) {
        console.error("Error initializing crypto after game load:", e);
    }
}

function getBotGenerationMultiplier() {
    if (cryptoMiningInstance) {
        return cryptoMiningInstance.getBotGenerationMultiplier();
    }
    return 1;
}

function resetCryptoMining() {
  try {
    if (cryptoMiningInstance) {
      cryptoMiningInstance.state = {
        active: false,
        mode: 'low',
        lastUpdate: Date.now(),
        totalMined: 0
      };
      
      cryptoMiningInstance.stopMining();
      cryptoMiningInstance.updateUI();
      
      localStorage.removeItem('crypto_mining_v3');
      
      if (typeof window.game !== 'undefined') {
        window.game.cryptoMiningState = cryptoMiningInstance.state;
        if (typeof window.saveGame === 'function') {
          window.saveGame();
        }
      }
    }
  } catch (e) {
    console.error("Error resetting crypto mining:", e);
  }
}

export { CryptoMining, initCryptoMining, getCryptoMiningInstance, getBotGenerationMultiplier, initCryptoAfterGameLoad, resetCryptoMining };