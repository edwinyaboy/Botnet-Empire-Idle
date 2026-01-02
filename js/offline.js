const MAX_SAFE_INTEGER = 9007199254740991;
const MAX_OFFLINE_HOURS = 4;
const OFFLINE_EFFICIENCY = 0.5;
const MIN_OFFLINE_FOR_PROGRESS = 5 * 60 * 1000;
const OFFLINE_EVENT_MIN_HOURS = 2;
const OFFLINE_EVENT_MAX_HOURS = 4;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

class OfflineSystem {
    constructor() {
        this.lastOnlineTime = Date.now();
        this.offlineEvent = null;
        this.elements = {};
        this.hasShownPopup = false;
        this.offlineEvents = [
            {
                type: 'bot_gain',
                title: 'VIRUS PROPAGATION',
                message: 'Your botnet continued to spread while you were offline!',
                effect: (hours, game) => {
                    const totalBots = (game.bots?.t1 || 0) + (game.bots?.t2 || 0) + (game.bots?.t3 || 0) + (game.bots?.mobile || 0);
                    const gain = Math.floor(totalBots * 0.05 * hours);
                    return { bots: gain, cash: 0 };
                },
                color: '#2ea043'
            },
            {
                type: 'bot_loss',
                title: 'BOTNET DECAY',
                message: 'Some of your hacked computers were discovered and removed while you were offline.',
                effect: (hours, game) => {
                    const totalBots = (game.bots?.t1 || 0) + (game.bots?.t2 || 0) + (game.bots?.t3 || 0) + (game.bots?.mobile || 0);
                    const loss = Math.floor(totalBots * 0.02 * hours);
                    return { bots: -loss, cash: 0 };
                },
                color: '#f85149'
            },
            {
                type: 'cash_gain',
                title: 'MARKET OPPORTUNITY',
                message: 'You made profitable trades while offline!',
                effect: (hours, game) => {
                    const earnings = Math.floor(game.totalEarned * 0.01 * hours);
                    return { bots: 0, cash: earnings };
                },
                color: '#58a6ff'
            },
            {
                type: 'cash_loss',
                title: 'SECURITY BREACH',
                message: 'Some of your funds were seized by authorities while you were offline.',
                effect: (hours, game) => {
                    const loss = Math.floor(game.money * 0.05 * hours);
                    return { bots: 0, cash: -loss };
                },
                color: '#da3633'
            }
        ];
        
        this.loadState();
    }
    
    createPopup() {
        try {
            const existing = document.getElementById('offlinePopup');
            if (existing) existing.remove();
            
            this.elements.popup = document.createElement('div');
            this.elements.popup.id = 'offlinePopup';
            this.elements.popup.className = 'modal';
            this.elements.popup.style.cssText = `
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: #0d1117;
                border: 2px solid #30363d;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            `;
            
            const header = document.createElement('h2');
            header.textContent = '📊 Offline Progress';
            header.style.cssText = 'margin:0 0 16px 0; color:#58a6ff; font-size:20px; font-weight:600; text-align:center;';
            
            const summary = document.createElement('div');
            summary.id = 'offlineSummary';
            summary.style.cssText = 'font-size:14px; color:#c9d1d9; margin-bottom:16px; line-height:1.5;';
            
            const offlineTime = document.createElement('div');
            offlineTime.id = 'offlineTime';
            offlineTime.style.cssText = 'font-size:16px; font-weight:600; color:#8b949e; margin:12px 0; text-align:center;';
            
            const gains = document.createElement('div');
            gains.id = 'offlineGains';
            gains.style.cssText = 'font-size:14px; color:#c9d1d9; margin:16px 0; background:#161b22; padding:12px; border-radius:6px;';
            
            const eventPanel = document.createElement('div');
            eventPanel.id = 'offlineEventPanel';
            eventPanel.style.cssText = 'display:none; margin-top:16px; padding:12px; border-radius:6px; border:2px solid;';
            
            const closeButton = document.createElement('button');
            closeButton.textContent = 'OK';
            closeButton.style.cssText = `
                display: block;
                margin: 20px auto 0 auto;
                padding: 10px 30px;
                background: #238636;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            `;
            closeButton.onclick = () => this.hidePopup();
            closeButton.onmouseover = () => closeButton.style.background = '#2ea043';
            closeButton.onmouseout = () => closeButton.style.background = '#238636';
            
            modalContent.appendChild(header);
            modalContent.appendChild(summary);
            modalContent.appendChild(offlineTime);
            modalContent.appendChild(gains);
            modalContent.appendChild(eventPanel);
            modalContent.appendChild(closeButton);
            
            this.elements.popup.appendChild(modalContent);
            document.body.appendChild(this.elements.popup);
            
            this.elements.summary = summary;
            this.elements.offlineTime = offlineTime;
            this.elements.gains = gains;
            this.elements.eventPanel = eventPanel;
            
        } catch (e) {
            console.error("Error creating offline popup:", e);
        }
    }
    
    updatePopup(offlineInfo, botGains, cashGains, cryptoGains, eventInfo = null) {
        try {
            if (!this.elements.popup) return;
            
            const hours = offlineInfo.hours.toFixed(2);
            const eligibleHours = offlineInfo.eligibleHours.toFixed(2);
            
            this.elements.summary.innerHTML = `
                You were offline for <span style="color:#58a6ff; font-weight:600;">${eligibleHours} hours</span>.<br>
                <span style="color:#8b949e; font-size:12px;">(50% efficiency applied: ${hours} effective hours)</span>
            `;
            
            this.elements.offlineTime.textContent = `⏱️ ${eligibleHours} hours offline`;
            
            let gainsHTML = '';
            if (botGains > 0) {
                gainsHTML += `<div style="color:#2ea043; margin:4px 0;">🤖 +${botGains.toFixed(0)} T3 bots</div>`;
            }
            if (cashGains > 0) {
                gainsHTML += `<div style="color:#58a6ff; margin:4px 0;">💰 +$${cashGains.toFixed(2)}</div>`;
            }
            if (cryptoGains > 0) {
                gainsHTML += `<div style="color:#d29922; margin:4px 0;">⛏️ +$${cryptoGains.toFixed(2)} from crypto mining</div>`;
            }
            
            if (!gainsHTML) {
                gainsHTML = '<div style="color:#8b949e;">No significant gains during offline period.</div>';
            }
            
            this.elements.gains.innerHTML = gainsHTML;
            
            if (eventInfo) {
                this.elements.eventPanel.style.display = 'block';
                this.elements.eventPanel.style.borderColor = eventInfo.color;
                this.elements.eventPanel.style.background = `${eventInfo.color}20`;
                this.elements.eventPanel.innerHTML = `
                    <div style="color:${eventInfo.color}; font-weight:700; font-size:14px; margin-bottom:6px;">${eventInfo.title}</div>
                    <div style="color:#c9d1d9; font-size:12px; margin-bottom:8px;">${eventInfo.message}</div>
                    <div style="color:${eventInfo.color}; font-weight:600; font-size:13px;">${eventInfo.effectText}</div>
                `;
            } else {
                this.elements.eventPanel.style.display = 'none';
            }
            
        } catch (e) {
            console.error("Error updating offline popup:", e);
        }
    }
    
    hidePopup() {
        try {
            if (this.elements.popup) {
                this.elements.popup.remove();
                this.elements.popup = null;
            }
            this.hasShownPopup = true;
        } catch (e) {
            console.error("Error hiding offline popup:", e);
        }
    }
    
    calculateOfflineTime() {
        try {
            const now = Date.now();
            const timeDiff = now - this.lastOnlineTime;
            
            if (timeDiff < MIN_OFFLINE_FOR_PROGRESS) {
                return { hours: 0, eligibleHours: 0 };
            }
            
            const offlineSeconds = timeDiff / 1000;
            const maxOfflineSeconds = MAX_OFFLINE_HOURS * 3600;
            
            const eligibleSeconds = Math.min(offlineSeconds, maxOfflineSeconds);
            const eligibleHours = eligibleSeconds / 3600;
            
            const effectiveHours = eligibleHours * OFFLINE_EFFICIENCY;
            
            return {
                hours: effectiveHours,
                eligibleHours: eligibleHours,
                wasOffline: timeDiff > MIN_OFFLINE_FOR_PROGRESS
            };
            
        } catch (e) {
            console.error("Error calculating offline time:", e);
            return { hours: 0, eligibleHours: 0, wasOffline: false };
        }
    }
    
    processOfflineProgress(game, calculateBPS, calculateMPS, getCryptoMiningInstance) {
        try {
            const offlineInfo = this.calculateOfflineTime();
            
            if (!offlineInfo.wasOffline || offlineInfo.hours <= 0) {
                this.saveState();
                return;
            }
            
            const bps = calculateBPS ? calculateBPS(OFFLINE_EFFICIENCY) : 0;
            const mps = calculateMPS ? calculateMPS(OFFLINE_EFFICIENCY) : 0;

            let cryptoMultiplier = 1;
            if (getCryptoMiningInstance) {
                const cryptoInstance = getCryptoMiningInstance();
                if (cryptoInstance) {
                    cryptoMultiplier = cryptoInstance.getBotGenerationMultiplier ? cryptoInstance.getBotGenerationMultiplier() : 1;
                }
            }

            const botGains = bps * offlineInfo.hours * 3600 * cryptoMultiplier;

            const cashGains = mps * offlineInfo.hours * 3600;

            let cryptoGains = 0;
            const cryptoInstance = getCryptoMiningInstance ? getCryptoMiningInstance() : null;
            if (cryptoInstance && cryptoInstance.state && cryptoInstance.state.active) {
                const totalBots = (game.bots?.t1 || 0) + (game.bots?.t2 || 0) + (game.bots?.t3 || 0) + (game.bots?.mobile || 0);
                const cryptoRate = cryptoInstance.currentRate ? cryptoInstance.currentRate[cryptoInstance.state.mode] || 0 : 0;
                cryptoGains = totalBots * cryptoRate * offlineInfo.hours * 3600;
            }

            if (botGains > 0) {
                game.bots.t3 = sanitizeNumber(game.bots.t3 + botGains, 0, 0);
            }
            
            const totalCashGains = cashGains + cryptoGains;
            if (totalCashGains > 0) {
                game.money = sanitizeNumber(game.money + totalCashGains, 0, 0);
                game.totalEarned = sanitizeNumber(game.totalEarned + totalCashGains, 0, 0);
            }

            let eventInfo = null;
            if (offlineInfo.eligibleHours >= OFFLINE_EVENT_MIN_HOURS) {
                eventInfo = this.triggerOfflineEvent(offlineInfo.eligibleHours, game);
            }
            
            this.lastOnlineTime = Date.now();
            
            this.createPopup();
            this.updatePopup(offlineInfo, botGains, totalCashGains, cryptoGains, eventInfo);
            
            this.saveState();
            
        } catch (e) {
            console.error("Error processing offline progress:", e);
        }
    }
    
    triggerOfflineEvent(hoursOffline, game) {
        try {
            if (hoursOffline < OFFLINE_EVENT_MIN_HOURS) return null;

            if (Math.random() > 0.3) return null;
            
            const event = this.offlineEvents[Math.floor(Math.random() * this.offlineEvents.length)];
            const effect = event.effect(hoursOffline, game);

            if (effect.bots !== 0) {
                const totalBots = (game.bots?.t1 || 0) + (game.bots?.t2 || 0) + (game.bots?.t3 || 0) + (game.bots?.mobile || 0);
                if (effect.bots > 0) {
                    const gainPerTier = effect.bots / 4;
                    game.bots.t1 = sanitizeNumber(game.bots.t1 + gainPerTier, 0, 0);
                    game.bots.t2 = sanitizeNumber(game.bots.t2 + gainPerTier, 0, 0);
                    game.bots.t3 = sanitizeNumber(game.bots.t3 + gainPerTier, 0, 0);
                    game.bots.mobile = sanitizeNumber(game.bots.mobile + gainPerTier, 0, 0);
                } else if (effect.bots < 0 && totalBots > 0) {
                    const loss = Math.min(Math.abs(effect.bots), totalBots);
                    const proportion = loss / totalBots;
                    
                    game.bots.t1 = Math.floor(game.bots.t1 * (1 - proportion));
                    game.bots.t2 = Math.floor(game.bots.t2 * (1 - proportion));
                    game.bots.t3 = Math.floor(game.bots.t3 * (1 - proportion));
                    game.bots.mobile = Math.floor(game.bots.mobile * (1 - proportion));
                }
            }
            
            if (effect.cash !== 0) {
                if (effect.cash > 0) {
                    game.money = sanitizeNumber(game.money + effect.cash, 0, 0);
                    game.totalEarned = sanitizeNumber(game.totalEarned + effect.cash, 0, 0);
                } else if (effect.cash < 0 && game.money > 0) {
                    const loss = Math.min(Math.abs(effect.cash), game.money);
                    game.money = sanitizeNumber(game.money - loss, 0, 0);
                }
            }
            
            return {
                ...event,
                effectText: effect.bots !== 0 ? 
                    `${effect.bots > 0 ? '+' : ''}${Math.floor(effect.bots).toLocaleString()} bots` :
                    `${effect.cash > 0 ? '+' : ''}$${Math.floor(effect.cash).toLocaleString()}`
            };
            
        } catch (e) {
            console.error("Error triggering offline event:", e);
            return null;
        }
    }
    
    saveState() {
        try {
            localStorage.setItem('offline_system', JSON.stringify({
                lastOnlineTime: this.lastOnlineTime
            }));
        } catch (e) {
            console.error("Error saving offline state:", e);
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('offline_system');
            if (saved) {
                const data = JSON.parse(saved);
                this.lastOnlineTime = sanitizeNumber(data.lastOnlineTime, Date.now(), 0, Date.now() + 86400000);
            }
        } catch (e) {
            console.error("Error loading offline state:", e);
        }
    }
    
    updateLastOnlineTime() {
        this.lastOnlineTime = Date.now();
        this.saveState();
    }
}

let offlineSystemInstance = null;

function initOfflineSystem() {
    try {
        if (!offlineSystemInstance) {
            offlineSystemInstance = new OfflineSystem();
        }
        return offlineSystemInstance;
    } catch (e) {
        console.error("Error initializing offline system:", e);
        return null;
    }
}

function getOfflineSystemInstance() {
    return offlineSystemInstance;
}

function processOfflineProgress(game, calculateBPS, calculateMPS, getCryptoMiningInstance) {
    if (offlineSystemInstance) {
        offlineSystemInstance.processOfflineProgress(game, calculateBPS, calculateMPS, getCryptoMiningInstance);
    }
}

function updateLastOnlineTime() {
    if (offlineSystemInstance) {
        offlineSystemInstance.updateLastOnlineTime();
    }
}

export { OfflineSystem, initOfflineSystem, getOfflineSystemInstance, processOfflineProgress, updateLastOnlineTime };