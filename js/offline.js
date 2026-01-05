const MAX_SAFE_INTEGER = 9007199254740991;
const MAX_OFFLINE_HOURS = 4;
const OFFLINE_EFFICIENCY = 0.5;
const MIN_OFFLINE_FOR_PROGRESS = 30 * 1000;
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
        this.popupActive = false;
        this.offlineProcessed = false;
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
                color: '#0366d6'
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
    
    isPopupActive() {
        return this.popupActive;
    }
    
    createPopup() {
        try {
            const existing = document.getElementById('offlinePopup');
            if (existing) existing.remove();
            
            this.elements.popup = document.createElement('div');
            this.elements.popup.id = 'offlinePopup';
            this.elements.popup.className = 'modal-overlay';
            this.elements.popup.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                z-index: 10001;
                display: flex;
                justify-content: center;
                align-items: center;
                pointer-events: all;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal';
            modalContent.onclick = (e) => e.stopPropagation();
            modalContent.style.cssText = `
                background: #0d1117;
                border: 2px solid #30363d;
                border-radius: 8px;
                padding: 20px;
                min-width: 300px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            `;
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'modal-title';
            titleDiv.textContent = 'OFFLINE PROGRESS';
            titleDiv.style.cssText = 'margin:0 0 16px 0; color:#58a6ff; font-size:18px; font-weight:600; text-align:center;';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'modal-content';
            contentDiv.style.cssText = 'font-size:14px; color:#c9d1d9; margin-bottom:16px; line-height:1.5;';
            
            this.elements.summary = document.createElement('div');
            this.elements.summary.id = 'offlineSummary';
            this.elements.summary.style.cssText = 'margin-bottom:12px;';
            
            this.elements.offlineTime = document.createElement('div');
            this.elements.offlineTime.id = 'offlineTime';
            this.elements.offlineTime.style.cssText = 'font-size:16px; font-weight:600; color:#8b949e; margin:12px 0; text-align:center; background:#161b22; padding:8px; border-radius:6px; border:1px solid #30363d;';
            
            this.elements.gains = document.createElement('div');
            this.elements.gains.id = 'offlineGains';
            this.elements.gains.style.cssText = 'font-size:14px; color:#c9d1d9; margin:16px 0; background:#161b22; padding:12px; border-radius:6px; border:1px solid #30363d;';
            
            this.elements.eventPanel = document.createElement('div');
            this.elements.eventPanel.id = 'offlineEventPanel';
            this.elements.eventPanel.style.cssText = 'display:none; margin-top:16px; padding:12px; border-radius:6px; border:2px solid;';
            
            contentDiv.appendChild(this.elements.summary);
            contentDiv.appendChild(this.elements.offlineTime);
            contentDiv.appendChild(this.elements.gains);
            contentDiv.appendChild(this.elements.eventPanel);
            
            const button = document.createElement('button');
            button.className = 'primary';
            button.textContent = 'OK';
            button.style.cssText = `
                display: block;
                margin: 20px auto 0 auto;
                padding: 10px 30px;
                background: #0366d6;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            `;
            button.onclick = () => this.hidePopup();
            button.onmouseover = () => button.style.background = '#0366d6';
            button.onmouseout = () => button.style.background = '#0366d6';
            
            modalContent.appendChild(titleDiv);
            modalContent.appendChild(contentDiv);
            modalContent.appendChild(button);
            
            this.elements.popup.appendChild(modalContent);
            document.body.appendChild(this.elements.popup);
            
            this.popupActive = true;
            
        } catch (e) {
            console.error("Error creating offline popup:", e);
            this.popupActive = false;
        }
    }
    
    updatePopup(offlineInfo, botGains, cashGains, eventInfo = null) {
        try {
            if (!this.elements.popup) return;
            
            const timeDisplay = formatTimeDisplay(offlineInfo.hours);
            const eligibleTimeDisplay = formatTimeDisplay(offlineInfo.eligibleHours);
            
            this.elements.offlineTime.innerHTML = `You earned <span style="color:#0366d6; font-weight:600">${eligibleTimeDisplay}</span><br>worth of progress while offline`;
                
                let gainsHTML = '';
                if (botGains > 0) {
                  gainsHTML += `<div style="color:#187ff2; margin:4px 0;">Gained ${botGains.toFixed(0)} hacked computers</div>`;
                }
                if (cashGains > 0) {
                  gainsHTML += `<div style="color:#58a6ff; margin:4px 0;">Gained $${cashGains.toFixed(2)}</div>`;
                }
                if (!gainsHTML) {
                    gainsHTML = '<div style="color:#8b949e;">Your hacked computers maintained operations while you were away.</div>';
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
            this.popupActive = false;
        } catch (e) {
            console.error("Error hiding offline popup:", e);
            this.popupActive = false;
        }
    }
    
    calculateOfflineTime() {
        try {
            const now = Date.now();
            const timeDiff = now - this.lastOnlineTime;
        
        console.log("Offline time calculation:", {
            now,
            lastOnlineTime: this.lastOnlineTime,
            timeDiff,
            timeDiffMinutes: timeDiff / 60000,
            minRequired: MIN_OFFLINE_FOR_PROGRESS
        });
        
        if (timeDiff < MIN_OFFLINE_FOR_PROGRESS) {
            console.log("Not enough offline time for progress");
            return { hours: 0, eligibleHours: 0, wasOffline: false };
        }
                
            const offlineSeconds = timeDiff / 1000;
            const maxOfflineSeconds = MAX_OFFLINE_HOURS * 3600;
            
            const eligibleSeconds = Math.min(offlineSeconds, maxOfflineSeconds);
            const eligibleHours = eligibleSeconds / 3600;
            
            const effectiveHours = eligibleHours * OFFLINE_EFFICIENCY;
            
            return {
                hours: effectiveHours,
                eligibleHours: eligibleHours,
                wasOffline: true
            };
            
        } catch (e) {
            console.error("Error calculating offline time:", e);
            return { hours: 0, eligibleHours: 0, wasOffline: false };
        }
    }
    
    processOfflineProgress(game, calculateBPS, calculateMPS) {
        try {
            if (this.offlineProcessed || (game && game.offlineProcessed)) {
                return;
            }
            
            this.offlineProcessed = true;
            if (game) {
                game.offlineProcessed = true;
            }
            
            const offlineInfo = this.calculateOfflineTime();
            
            if (!offlineInfo.wasOffline || offlineInfo.hours <= 0) {
                const now = Date.now();
                this.lastOnlineTime = now;
                this.saveState();
                return;
            }
            
            // DEBUG LOGGING
            console.log("DEBUG OFFLINE PROGRESS:");
            console.log("  - Offline hours:", offlineInfo.hours);
            console.log("  - Eligible hours:", offlineInfo.eligibleHours);
            console.log("  - Effective hours (with efficiency):", offlineInfo.hours);
            
            const bps = calculateBPS ? calculateBPS(OFFLINE_EFFICIENCY) : 0;
            const mps = calculateMPS ? calculateMPS(OFFLINE_EFFICIENCY) : 0;
            
            // DEBUG LOGGING
            console.log("  - BPS (Bots Per Second):", bps);
            console.log("  - MPS (Money Per Second):", mps);
            console.log("  - OFFLINE_EFFICIENCY:", OFFLINE_EFFICIENCY);

            let cryptoMultiplier = 1;
            if (typeof window.getCryptoMiningInstance === 'function') {
                const cryptoInstance = window.getCryptoMiningInstance();
                if (cryptoInstance && cryptoInstance.getBotGenerationMultiplier) {
                    cryptoMultiplier = cryptoInstance.getBotGenerationMultiplier();
                }
            }
            
            // DEBUG LOGGING
            console.log("  - Crypto multiplier:", cryptoMultiplier);

            const botGains = bps * offlineInfo.hours * 3600;
            const cashGains = mps * offlineInfo.hours * 3600;
            
            // DEBUG LOGGING
            console.log("  - Bot gains calculation:", bps, "*", offlineInfo.hours, "* 3600 =", botGains);
            console.log("  - Cash gains calculation:", mps, "*", offlineInfo.hours, "* 3600 =", cashGains);
            console.log("  - Final botGains:", botGains);
            console.log("  - Final cashGains:", cashGains);

            if (botGains > 0) {
                game.bots.t3 = sanitizeNumber(game.bots.t3 + botGains, 0, 0);
            }
            
            if (cashGains > 0) {
                game.money = sanitizeNumber(game.money + cashGains, 0, 0);
                game.totalEarned = sanitizeNumber(game.totalEarned + cashGains, 0, 0);
            }
            
            // DEBUG LOGGING
            console.log("  - Money before:", game.money - cashGains);
            console.log("  - Money after:", game.money);

            let eventInfo = null;
            if (offlineInfo.eligibleHours >= OFFLINE_EVENT_MIN_HOURS) {
                eventInfo = this.triggerOfflineEvent(offlineInfo.eligibleHours, game);
            }
            
            this.createPopup();
            this.updatePopup(offlineInfo, botGains, cashGains, eventInfo);
            
            const now = Date.now();
            this.lastOnlineTime = now;
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
                lastOnlineTime: this.lastOnlineTime,
                offlineProcessed: this.offlineProcessed
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
                this.offlineProcessed = Boolean(data.offlineProcessed);
            }
        } catch (e) {
            console.error("Error loading offline state:", e);
        }
    }
    
    updateLastOnlineTime() {
        this.lastOnlineTime = Date.now();
        this.offlineProcessed = false;
        this.saveState();
    }
}

function formatTimeDisplay(hours) {
    const totalSeconds = Math.round(hours * 3600);
    
    if (totalSeconds < 60) {
        return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
    }
    
    const totalMinutes = Math.round(totalSeconds / 60);
    
    if (totalMinutes < 60) {
        return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
    }
    
    const fullHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    if (remainingMinutes === 0) {
        return `${fullHours} hour${fullHours === 1 ? '' : 's'}`;
    } else if (fullHours === 0) {
        return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
    } else {
        return `${fullHours} hour${fullHours === 1 ? '' : ''} and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
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

function processOfflineProgress(game, calculateBPS, calculateMPS) {
    if (offlineSystemInstance) {
        offlineSystemInstance.processOfflineProgress(game, calculateBPS, calculateMPS);
    }
}

function updateLastOnlineTime() {
    if (offlineSystemInstance) {
        offlineSystemInstance.updateLastOnlineTime();
    }
}

function isOfflinePopupActive() {
    return offlineSystemInstance ? offlineSystemInstance.isPopupActive() : false;
}

export { OfflineSystem, initOfflineSystem, getOfflineSystemInstance, processOfflineProgress, updateLastOnlineTime, isOfflinePopupActive };