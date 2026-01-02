import { game, saveGame } from './state.js';
import { getTotalBots, getAchievementBonus } from './bots.js';
import { achievements } from './achievements.js';
import { upgrades } from './upgrades.js';
import { calculateBPS, calculateMPS, upgrade, getPrestigeBonus, PRICE_ROLL_TIME } from './gameLoop.js';
import { clickTool, tools } from './tools.js';
import { initCryptoMining } from './crypto.js';

const MAX_SAFE_INTEGER = 9007199254740991;
let lastPriceUpdate = 0;
let lastMoney = 0;
let lastMobileState = false;
let marketplaceDirty = true;
let upgradesDirty = true;
let skillsDirty = true;
let lastToolsState = "";
let resizeTimeout;
let renderInProgress = false;
let lastRenderTime = 0;
let cleanupCalled = false;
const MIN_RENDER_INTERVAL = 100;

const eventListeners = new Map();
let cachedElements = {};

function sanitizeNumber(n, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof n !== 'number') return defaultValue;
  if (isNaN(n) || !isFinite(n)) return defaultValue;
  return Math.max(min, Math.min(max, n));
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getElement(id) {
  if (!cachedElements[id]) {
    cachedElements[id] = document.getElementById(id);
  }
  return cachedElements[id];
}

function setTextContent(id, value) {
  const el = getElement(id);
  if (el && el.textContent !== String(value)) {
    el.textContent = String(value);
  }
}

export function safeInt(n) {
  return Math.floor(sanitizeNumber(n, 0, 0, MAX_SAFE_INTEGER));
}

function batchUpdateUI() {
  const now = Date.now();
  
  if (!getElement("totalBots")) return false;
  
  const total = getTotalBots();
  const bps = calculateBPS();
  const mps = calculateMPS();
  
  setTextContent("totalBots", Math.floor(total).toLocaleString());
  setTextContent("money", Math.floor(game.money).toLocaleString());
  setTextContent("prestige", game.prestige);
  setTextContent("bps", safeInt(bps));
  setTextContent("mps", safeInt(mps));
  
  if (window.slotsActive) return true;
  
  const timeLeft = Math.max(0, Math.floor((game.priceTime + PRICE_ROLL_TIME - Date.now()) / 1000));
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const priceTimerEl = getElement("priceTimer");
  if (priceTimerEl) {
    let timerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (game.upgrades && game.upgrades.marketScanner && game.priceDirection !== 0) {
      timerText += game.priceDirection > 0 ? ' (↑)' : ' (↓)';
    }
    if (priceTimerEl.textContent !== timerText) {
      priceTimerEl.textContent = timerText;
    }
  }
  
  if (game.activeEvent && game.eventAcknowledged && Date.now() < game.eventEndTime) {
    const remaining = Math.ceil((game.eventEndTime - Date.now()) / 1000);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const eventTimer = getElement("eventTimer");
    if (eventTimer) {
      const newContent = `${game.activeEvent.toUpperCase()} ACTIVE\n${game.eventEffect || ''} - ${m}:${s.toString().padStart(2, '0')} remaining`;
      if (eventTimer.textContent !== newContent) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'event-timer-label';
        labelDiv.textContent = `${game.activeEvent.toUpperCase()} ACTIVE`;
        
        const textDiv = document.createElement('div');
        textDiv.textContent = `${game.eventEffect || ''} - ${m}:${s.toString().padStart(2, '0')} remaining`;
        
        eventTimer.innerHTML = '';
        eventTimer.appendChild(labelDiv);
        eventTimer.appendChild(textDiv);
        eventTimer.style.display = "block";
      }
    }
  } else {
    const eventTimer = getElement("eventTimer");
    if (eventTimer && eventTimer.style.display !== "none") {
      eventTimer.style.display = "none";
    }
  }
  
  const progress = total > 0 ? Math.min(100, (total / 8.2e9) * 100) : 0;
  const progressEl = getElement("prestigeProgress");
  const progressTextEl = getElement("prestigeText");
  const prestigeBonusEl = getElement("prestigeBonus");
  
  if (progressEl && progressEl.style.width !== progress + "%") {
    progressEl.style.width = progress + "%";
  }
  if (progressTextEl && progressTextEl.textContent !== progress.toFixed(2) + "%") {
    progressTextEl.textContent = progress.toFixed(2) + "%";
  }
  if (prestigeBonusEl && prestigeBonusEl.textContent !== (getPrestigeBonus() * 10).toFixed(1)) {
    prestigeBonusEl.textContent = (getPrestigeBonus() * 10).toFixed(1);
  }
  
  return true;
}

function updateDynamicUI() {
  if (window.slotsActive) return;
  
  if (game.priceTime !== lastPriceUpdate || game.unlocks.mobile !== lastMobileState) {
    renderSellInterface();
    lastPriceUpdate = game.priceTime;
    lastMobileState = game.unlocks.mobile;
  } else {
    updateSellButtonStates();
  }
  
  if (game.money !== lastMoney) {
    updatePurchaseButtonStates();
    lastMoney = game.money;
  }
  
  if (skillsDirty) {
    renderSkills();
    skillsDirty = false;
  }
  
  if (upgradesDirty) {
    renderUpgrades();
    upgradesDirty = false;
  }

  if (marketplaceDirty) {
    renderMarketplace();
    marketplaceDirty = false;
  }
  
  const toolsStateKey = JSON.stringify({
    tools: Object.keys(game.tools || {}).sort(),
    activeTab: game.activeToolTab,
    toolStates: Object.keys(game.tools || {}).map(id => game.tools[id]?.active)
  });
  
  if (toolsStateKey !== lastToolsState) {
    renderToolsInterface();
    lastToolsState = toolsStateKey;
  } else {
    updateToolsInterfaceDynamic();
  }
  
  if (game.priceTime !== lastPriceUpdate || game.unlocks.mobile !== lastMobileState) {
    renderSellInterface();
    lastPriceUpdate = game.priceTime;
    lastMobileState = game.unlocks.mobile;
  } else {
    updateBotCounts();
    updateSellButtonStates();
  }
  
  renderAchievements();
  drawCharts();
}

export function render() {
  const now = Date.now();
  if (now - lastRenderTime < MIN_RENDER_INTERVAL) {
    return;
  }
  if (renderInProgress) {
    return;
  }

  try {
    renderInProgress = true;
    lastRenderTime = now;
    
    requestAnimationFrame(() => {
      try {
        if (!batchUpdateUI()) {
          renderInProgress = false;
          return;
        }
        
        updateDynamicUI();
      } catch (e) {
        console.error("Error in render RAF:", e);
      } finally {
        renderInProgress = false;
      }
    });
    
  } catch (e) {
    console.error("Error in render():", e);
    renderInProgress = false;
  }
}

function initCryptoMiningIfNeeded() {
  try {
    const cryptoInstance = initCryptoMining();
    if (cryptoInstance && !getElement("cryptoMiningPanel")) {
      cryptoInstance.show();
    } else if (cryptoInstance) {
      cryptoInstance.show();
    }
  } catch (e) {
    console.error("Error initializing crypto mining:", e);
  }
}

function updatePurchaseButtonStates() {
  try {
    for (const id in tools) {
      if (game.tools && game.tools[id]) continue;
      
      const btn = document.querySelector(`[data-tool-btn="${id}"]`);
      if (btn) {
        const affordable = game.money >= tools[id].cost;
        if (btn.disabled !== !affordable) {
          btn.disabled = !affordable;
        }
      }
    }
    
    for (const id in upgrades) {
      if (game.upgrades && game.upgrades[id]) continue;
      
      const btn = document.querySelector(`[data-upgrade-btn="${id}"]`);
      if (btn) {
        const affordable = game.money >= upgrades[id].cost;
        if (btn.disabled !== !affordable) {
          btn.disabled = !affordable;
        }
      }
    }
    
    const skillDefs = ['tiers', 'prices', 'generation', 'automation'];
    const baseCosts = {
      tiers: 5e5,
      prices: 1e6,
      generation: 2e6,
      automation: 5e6
    };
    
    for (const skill of skillDefs) {
      const level = game.skills?.[skill] || 0;
      const cost = baseCosts[skill] * Math.pow(1.6, level);
      const btn = document.querySelector(`[data-skill-btn="${skill}"]`);
      if (btn) {
        const affordable = game.money >= cost;
        if (btn.disabled !== !affordable) {
          btn.disabled = !affordable;
        }
      }
    }
  } catch (e) {
    console.error("Error updating purchase states:", e);
  }
}

function renderAchievements() {
  try {
    const ach = getElement("achievements");
    if (!ach) return;
    
    let anyNewAchievement = false;
    let needsUpdate = false;
    
    if (!Array.isArray(achievements)) return;
    
    const achievementElements = ach.children;
    const newAchievements = [];
    
    achievements.forEach((a, index) => {
      let done = false;
      try {
        if (typeof a.check === 'function') {
          done = a.check();
        }
      } catch (e) {
        console.error("Error checking achievement", a.id, e);
        done = false;
      }
      
      const alreadyHas = game.achievements && game.achievements[a.id];
      
      if (done && !alreadyHas) {
        if (!game.achievements) {
          game.achievements = {};
        }
        game.achievements[a.id] = true;
        anyNewAchievement = true;
      }
      
      const isDone = alreadyHas || done;
      if (a.hidden && !isDone) return;
      
      const existingEl = achievementElements[index];
      const isDoneClass = isDone ? 'done' : '';
      
      if (!existingEl || !existingEl.classList.contains(isDoneClass)) {
        needsUpdate = true;
      }
      
      newAchievements.push({ a, isDone });
    });
    
    if (needsUpdate || achievementElements.length !== newAchievements.length) {
      ach.innerHTML = "";
      
      newAchievements.forEach(({ a, isDone }) => {
        let rewardText = "";
        if (a.reward === "income") rewardText = `+${(a.bonus * 100).toFixed(0)}% Income`;
        else if (a.reward === "generation") rewardText = `+${(a.bonus * 100).toFixed(0)}% Generation`;
        else if (a.reward === "prestige") rewardText = `+${a.bonus} Effective Prestige`;
        else if (a.reward === "click") rewardText = `+${(a.bonus * 100).toFixed(0)}% Click Power`;
        else if (a.reward === "special") rewardText = `Special Effect`;
        
        const div = document.createElement('div');
        div.className = `achievement ${isDone ? 'done' : ''}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'achievement-text';
        textDiv.textContent = a.text;
        
        div.appendChild(textDiv);
        
        if (rewardText) {
          const rewardDiv = document.createElement('div');
          rewardDiv.className = 'achievement-reward';
          rewardDiv.textContent = rewardText;
          div.appendChild(rewardDiv);
        }
        
        ach.appendChild(div);
      });
    }
    
    if (anyNewAchievement) {
      saveGame();
    }
  } catch (e) {
    console.error("Error in renderAchievements():", e);
  }
}

function renderSellInterface() {
  try {
    const sellUI = getElement("sellInterface");
    if (!sellUI) return;

    if (!game.prices || typeof game.prices !== 'object') {
      game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
      game.priceTime = Date.now();
    }

    const tiers = [
      { key:"t1", label:"PREMIUM", price:game.prices.t1, count:game.bots.t1 || 0 },
      { key:"t2", label:"STANDARD", price:game.prices.t2, count:game.bots.t2 || 0 },
      { key:"t3", label:"POOR", price:game.prices.t3, count:game.bots.t3 || 0 }
    ];

    if (game.unlocks && game.unlocks.mobile) {
      tiers.push({ key:"mobile", label:"Mobile", price:game.prices.mobile, count:game.bots.mobile || 0 });
    }

    sellUI.innerHTML = "";

    tiers.forEach(t => {
      const amounts = [1, 5, 10, 50, 100, 250, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000, 100000000, 250000000, 500000000, 1000000000];
      
      const tierDiv = document.createElement('div');
      tierDiv.className = 'sell-tier';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'sell-tier-header';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'sell-tier-name';
      nameDiv.textContent = `${t.label} - `;
      
      const countSpan = document.createElement('span');
      countSpan.id = `bot-count-${t.key}`;
      countSpan.className = 'bot-count-display';
      countSpan.textContent = Math.floor(t.count).toLocaleString();
      nameDiv.appendChild(countSpan);
      
      const priceDiv = document.createElement('div');
      priceDiv.className = 'sell-tier-price';
      priceDiv.textContent = `$${t.price.toFixed(3)} EACH`;
      
      headerDiv.appendChild(nameDiv);
      headerDiv.appendChild(priceDiv);
      
      const buttonsRow = document.createElement('div');
      buttonsRow.className = 'sell-buttons-row';
      
      const scrollContainer = document.createElement('div');
      scrollContainer.className = 'sell-scroll-container';
      
      const scrollButtons = document.createElement('div');
      scrollButtons.className = 'sell-scroll-buttons';
      
      amounts.forEach(amt => {
        const btn = document.createElement('button');
        btn.className = `small sell-btn-${t.key}`;
        btn.setAttribute('data-amount', amt);
        btn.textContent = amt >= 1000000 ? (amt / 1000000) + 'M' : amt >= 1000 ? (amt / 1000) + 'k' : amt;
        btn.disabled = t.count < amt;
        btn.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.sell === 'function') {
            window.sell(t.key, amt);
          }
        };
        scrollButtons.appendChild(btn);
      });
      
      scrollContainer.appendChild(scrollButtons);
      buttonsRow.appendChild(scrollContainer);
      
      const customContainer = document.createElement('div');
      customContainer.className = 'custom-sell-container';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.id = `sell_custom_${t.key}`;
      input.placeholder = 'Custom amount';
      input.min = '1';
      input.max = Math.floor(t.count).toString();
      
      ['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
        input.addEventListener(evt, e => e.stopPropagation(), { passive: true });
      });
      
      const customBtn = document.createElement('button');
      customBtn.className = 'small';
      customBtn.textContent = 'Sell Custom';
      customBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.sellCustom === 'function') {
          window.sellCustom(t.key);
        }
      };
      
      customContainer.appendChild(input);
      customContainer.appendChild(customBtn);
      
      tierDiv.appendChild(headerDiv);
      tierDiv.appendChild(buttonsRow);
      tierDiv.appendChild(customContainer);
      
      sellUI.appendChild(tierDiv);
    });
  } catch (e) {
    console.error("Error in renderSellInterface():", e);
  }
}

function updateBotCounts() {
  try {
    const tiers = ['t1', 't2', 't3'];
    if (game.unlocks && game.unlocks.mobile) tiers.push('mobile');
    
    tiers.forEach(tier => {
      const countElement = getElement(`bot-count-${tier}`);
      if (countElement) {
        const currentCount = Math.floor(game.bots?.[tier] || 0);
        const newText = currentCount.toLocaleString();
        if (countElement.textContent !== newText) {
          countElement.textContent = newText;
        }
      }
    });
  } catch (e) {
    console.error("Error updating bot counts:", e);
  }
}

function updateSellButtonStates() {
  try {
    const tiers = ['t1', 't2', 't3'];
    if (game.unlocks && game.unlocks.mobile) tiers.push('mobile');
    
    tiers.forEach(tier => {
      const buttons = document.querySelectorAll(`.sell-btn-${tier}`);
      buttons.forEach(btn => {
        const amount = parseInt(btn.getAttribute('data-amount'), 10);
        if (!isNaN(amount)) {
          const isDisabled = (game.bots?.[tier] || 0) < amount;
          if (btn.disabled !== isDisabled) {
            btn.disabled = isDisabled;
          }
        }
      });
      
      const input = getElement(`sell_custom_${tier}`);
      if (input) {
        const newMax = Math.floor(game.bots?.[tier] || 0).toString();
        if (input.max !== newMax) {
          input.max = newMax;
        }
      }
    });
  } catch (e) {
    console.error("Error updating sell button states:", e);
  }
}

function renderUpgrades() {
  try {
    const upgradesUI = getElement("upgrades");
    if (!upgradesUI) return;
    
    const sortedUpgrades = Object.keys(upgrades).sort((a, b) => upgrades[a].cost - upgrades[b].cost);
    let html = '';
    
    for (const id of sortedUpgrades) {
      const u = upgrades[id];
      const owned = game.upgrades && game.upgrades[id];
      const affordable = game.money >= u.cost;
      
      html += `<div class="tool-card">`;
      html += `<div class="tool-header">`;
      html += `<div class="tool-name">${u.name}</div>`;
      if (owned) {
        html += `<div class="tool-status active">PURCHASED</div>`;
      }
      html += `</div>`;
      
      let descText = u.desc;
      if (u.effect === "base_bots") descText += ` - Gains an additional ${u.value} Poor quality hacked computers per second`;
      if (u.effect === "click_multiplier") descText += ` - Additional ${(u.value * 100).toFixed(0)}% Hacked Computers gained per click`;
      if (u.effect === "sell_price") descText += ` - +${(u.value * 100).toFixed(0)}% sell price`;
      if (u.effect === "market_info") descText += ` - Shows price trends (↑) or (↓) for Poor quality hacked computers`;
      
      html += `<div class="tool-desc">${descText}</div>`;
      
      if (!owned) {
        html += `<button data-upgrade-btn="${id}" ${affordable ? '' : 'disabled'}>`;
        html += `Purchase - $${u.cost.toLocaleString()}`;
        html += `</button>`;
      }
      
      html += `</div>`;
    }
    
    upgradesUI.innerHTML = html;
    
    sortedUpgrades.forEach(id => {
      const btn = upgradesUI.querySelector(`[data-upgrade-btn="${id}"]`);
      if (btn) {
        btn.onclick = () => {
          if (typeof window.buyUpgrade === 'function') {
            window.buyUpgrade(id);
          }
        };
      }
    });
  } catch (e) {
    console.error("Error in renderUpgrades():", e);
  }
}

function renderMarketplace() {
  try {
    const market = getElement("market");
    if (!market) return;

    const sortedTools = Object.keys(tools).sort((a, b) => tools[a].cost - tools[b].cost);
    let html = '';

    for (const id of sortedTools) {
      const t = tools[id];
      const owned = game.tools && game.tools[id];
      const affordable = game.money >= t.cost;

      html += `<div class="tool-card">`;
      html += `<div class="tool-header">`;
      html += `<div class="tool-name">${t.name}</div>`;
      if (owned) {
        html += `<div class="tool-status active">PURCHASED</div>`;
      }
      html += `</div>`;
      
      let descText = t.desc;
      if (t.type === "bots") descText += ` - Gains an additional ${t.base} Poor quality hacked computers per second`;
      if (t.type === "money") descText += ` - Earns $${t.base} per second`;
      if (t.clickable) descText += ` - Clickable`;
      if (t.unlocks === "mobile") descText += ` - Unlocks Mobile Infrastructure`;

      html += `<div class="tool-desc">${descText}</div>`;
      
      if (!owned) {
        html += `<button data-tool-btn="${id}" ${affordable ? '' : 'disabled'}>`;
        html += `Purchase - $${t.cost.toLocaleString()}`;
        html += `</button>`;
      }

      html += `</div>`;
    }

    market.innerHTML = html;
    
    sortedTools.forEach(id => {
      const btn = market.querySelector(`[data-tool-btn="${id}"]`);
      if (btn) {
        btn.onclick = () => {
          if (typeof window.buyTool === 'function') {
            window.buyTool(id);
          }
        };
      }
    });
  } catch (e) {
    console.error("Error in renderMarketplace():", e);
  }
}

function renderSkills() {
  try {
    const skillsUI = getElement("skills");
    if (!skillsUI) return;

    const skillDefs = [
      { key:"tiers", label:"Hacked Computer Tier Distribution", desc:"+5% Better Quality Chance" },
      { key:"prices", label:"Market Efficiency", desc:"+10% Sell Prices" },
      { key:"generation", label:"Hacked Computers Generation Rate", desc:"+10% Automatically Hacked Computers" },
      { key:"automation", label:"Automation Efficiency", desc:"+5% Dark Web Tool Effectiveness" }
    ];

    const baseCosts = {
      tiers: 5e5,
      prices: 1e6,
      generation: 2e6,
      automation: 5e6
    };

    skillsUI.innerHTML = "";

    skillDefs.forEach(s => {
      const level = game.skills?.[s.key] || 0;
      const cost = baseCosts[s.key] * Math.pow(1.6, level);
      const canBuy = game.money >= cost;

      const btn = document.createElement('button');
      btn.setAttribute('data-skill-btn', s.key);
      btn.title = s.desc;
      btn.disabled = !canBuy;
      btn.onclick = () => {
        if (typeof window.upgrade === 'function') {
          window.upgrade(s.key);
        }
      };
      
      btn.textContent = s.label;
      
      const descSpan = document.createElement('div');
      descSpan.style.cssText = 'font-size:clamp(10px, 2vw, 11px); color:#8b949e; margin-top:2px;';
      descSpan.textContent = s.desc;
      btn.appendChild(document.createElement('br'));
      btn.appendChild(descSpan);
      
      const costSpan = document.createElement('span');
      costSpan.style.cssText = 'font-size:clamp(10px, 2vw, 11px); color:#8b949e;';
      costSpan.textContent = `Level ${level} — $${cost.toLocaleString()}`;
      btn.appendChild(document.createElement('br'));
      btn.appendChild(costSpan);
      
      skillsUI.appendChild(btn);
    });
  } catch (e) {
    console.error("Error in renderSkills():", e);
  }
}

function renderToolsInterface() {
  try {
    const toolsUI = getElement("toolsInterface");
    if (!toolsUI) return;

    const ownedClickableTools = Object.keys(game.tools || {}).filter(id => {
      const tool = game.tools[id];
      const toolDef = tools[id];
      return tool !== undefined && toolDef && toolDef.clickable;
    });

    if (ownedClickableTools.length === 0) {
      toolsUI.innerHTML = '<div style="font-size:clamp(10px,2vw,11px); color:#8b949e;">You don\'t have any active tools yet. Buy tools from the dark web marketplace below to use them here.</div>';
      return;
    }

    if (!game.activeToolTab || !game.tools[game.activeToolTab] || !tools[game.activeToolTab]?.clickable) {
      game.activeToolTab = ownedClickableTools[0];
    }

    let html = '<div class="tool-tabs">';
    
    ownedClickableTools.forEach(id => {
      const activeClass = game.activeToolTab === id ? 'active' : '';
      html += `<div class="tool-tab ${activeClass}" data-tool-id="${id}">${tools[id].name.split(' ')[0]}</div>`;
    });
    
    html += '</div>';

    ownedClickableTools.forEach(id => {
      const t = tools[id];
      const owned = game.tools[id];
      const cd = game.clickCooldowns?.[id] || 0;
      const clicks = owned?.clicks || 0;
      const cooldownReduction = getCooldownReduction();
      const activeClass = game.activeToolTab === id ? 'active' : '';
      const isOnCooldown = cd > 0;
      const cooldownWidth = isOnCooldown ? (1 - cd / (t.clickCooldown * cooldownReduction)) * 100 : 0;

      html += `<div class="tool-panel ${activeClass}" data-tool-id="${id}">`;
      html += `<div style="margin-bottom:12px;">`;
      html += `<div style="font-size:clamp(11px,2.5vw,13px); font-weight:600; color:#58a6ff; margin-bottom:4px;">${t.name}</div>`;
      html += `<div style="font-size:clamp(10px,2vw,11px); color:#8b949e; margin-bottom:8px;">${t.desc}</div>`;
      html += `</div>`;
      
      html += `<button data-tool-click="${id}" data-click-btn="${id}" ${isOnCooldown ? 'disabled' : ''} style="margin-bottom:8px;">`;
      html += `<span data-click-text="${id}">Execute Bonus (${clicks}/50)${isOnCooldown ? ' - ' + Math.ceil(cd) + 's' : ''}</span>`;
      html += `</button>`;
      
      html += `<div class="cooldown-bar" data-cooldown-bar="${id}" style="display:${isOnCooldown ? '' : 'none'};">`;
      html += `<div class="cooldown-fill" data-cooldown-fill="${id}" style="width:${cooldownWidth}%;"></div>`;
      html += `</div>`;
      
      html += `<div style="margin-top:12px; font-size:clamp(10px,1.8vw,10px); color:#8b949e;">`;
      html += `<div><strong>Click Bonus:</strong> ${t.type === "bots" ? t.clickBonus.toLocaleString() + " bots" : "$" + t.clickBonus.toLocaleString()}</div>`;
      html += `<div><strong>Cooldown:</strong> ${t.clickCooldown} seconds</div>`;
      if (cooldownReduction < 1) {
        html += `<div><strong>Cooldown Reduction:</strong> ${Math.round((1 - cooldownReduction) * 100)}%</div>`;
      }
      html += `</div>`;
      html += `</div>`;
    });

    toolsUI.innerHTML = html;
    
    ownedClickableTools.forEach(id => {
      const tab = toolsUI.querySelector(`.tool-tab[data-tool-id="${id}"]`);
      if (tab) {
        tab.onclick = () => {
          game.activeToolTab = id;
          render();
        };
      }
      
      const btn = toolsUI.querySelector(`[data-tool-click="${id}"]`);
      if (btn) {
        btn.onclick = () => {
          if (typeof clickTool === 'function') {
            clickTool(id);
          }
        };
      }
    });
  } catch (e) {
    console.error("Error in renderToolsInterface():", e);
  }
}

export function setupEventListeners() {
  try {
    const clickHandler = (e) => {
      const toolBtn = e.target.closest('[data-tool-click]');
      if (toolBtn) {
        const toolId = toolBtn.getAttribute('data-tool-click');
        if (typeof clickTool === 'function') {
          clickTool(toolId);
        }
      }
    };
    
    if (!eventListeners.has('documentClick')) {
      document.addEventListener('click', clickHandler);
      eventListeners.set('documentClick', clickHandler);
    }
  } catch (e) {
    console.error("Error setting up event listeners:", e);
  }
}

function cleanupEventListeners() {
  if (cleanupCalled) return;
  cleanupCalled = true;
  
  eventListeners.forEach((handler, eventName) => {
    try {
      document.removeEventListener('click', handler);
    } catch (e) {
      console.error("Error removing event listener:", e);
    }
  });
  eventListeners.clear();
}

function updateToolsInterfaceDynamic() {
  try {
    const ownedClickableTools = Object.keys(game.tools || {}).filter(id => {
      const toolDef = tools[id];
      return toolDef && toolDef.clickable;
    });
    
    ownedClickableTools.forEach(id => {
      const t = tools[id];
      const owned = game.tools[id];
      const cd = game.clickCooldowns?.[id] || 0;
      const clicks = owned?.clicks || 0;
      const isOnCooldown = cd > 0;
      const cooldownReduction = getCooldownReduction();
      const cooldownWidth = isOnCooldown ? 
        (1 - cd / (t.clickCooldown * cooldownReduction)) * 100 : 0;

      const clickBtn = document.querySelector(`[data-click-btn="${id}"]`);
      if (clickBtn) {
        const shouldBeDisabled = isOnCooldown;
        if (clickBtn.disabled !== shouldBeDisabled) {
          clickBtn.disabled = shouldBeDisabled;
        }
        const clickText = document.querySelector(`[data-click-text="${id}"]`);
        if (clickText) {
          const newText = `Execute Bonus (${clicks}/50)${isOnCooldown ? ' - ' + Math.ceil(cd) + 's' : ''}`;
          if (clickText.textContent !== newText) {
            clickText.textContent = newText;
          }
        }
      }

      const cooldownBar = document.querySelector(`[data-cooldown-bar="${id}"]`);
      const cooldownFill = document.querySelector(`[data-cooldown-fill="${id}"]`);
      if (cooldownBar && cooldownFill) {
        if (isOnCooldown) {
          if (cooldownBar.style.display === 'none') {
            cooldownBar.style.display = '';
          }
          const newWidth = cooldownWidth + '%';
          if (cooldownFill.style.width !== newWidth) {
            cooldownFill.style.width = newWidth;
          }
        } else {
          if (cooldownBar.style.display !== 'none') {
            cooldownBar.style.display = 'none';
          }
        }
      }
    });
  } catch (e) {
    console.error("Error in updateToolsInterfaceDynamic():", e);
  }
}

function getCooldownReduction() {
  try {
    let reduction = 1;
    if (Array.isArray(achievements)) {
      for (const a of achievements) {
        if (game.achievements && game.achievements[a.id] && a.reward === "cooldown") {
          reduction -= sanitizeNumber(a.bonus, 0, 0, 1);
        }
      }
    }
    return Math.max(0.1, reduction);
  } catch (e) {
    console.error("Error in getCooldownReduction():", e);
    return 1;
  }
}

function drawPieChart() {
  try {
    const canvas = getElement("pieChart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) return;
    
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const radius = Math.min(displayWidth, displayHeight) * 0.35;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const total = getTotalBots();
    if (total === 0) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No hacked computers acquired", centerX, centerY);
      return;
    }

    const data = [
      { label:"T1", value:game.bots?.t1 || 0, color:"#6e7681", fullLabel:"Premium Quality" },
      { label:"T2", value:game.bots?.t2 || 0, color:"#58a6ff", fullLabel:"Standard Quality" },
      { label:"T3", value:game.bots?.t3 || 0, color:"#f85149", fullLabel:"Poor Quality" }
    ];
    
    if (game.unlocks && game.unlocks.mobile && game.bots && game.bots.mobile > 0) {
      data.push({ label:"Mobile", value:game.bots.mobile || 0, color:"#ffc107", fullLabel:"Mobile" });
    }

    let currentAngle = -Math.PI / 2;

    data.forEach(segment => {
      const sliceAngle = (segment.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 2;
      ctx.stroke();

      segment.startAngle = currentAngle;
      segment.endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      if (sliceAngle > 0.15) {
        const labelAngle = (segment.startAngle + segment.endAngle) / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.65);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.65);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(segment.label, labelX, labelY);
      }
    });

    canvas.onmousemove = canvas.ontouchmove = (e) => {
      try {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        const dx = x / dpr - centerX;
        const dy = y / dpr - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          let angle = Math.atan2(dy, dx);
          angle = angle - (-Math.PI / 2);
          if (angle < 0) angle += 2 * Math.PI;

          for (const segment of data) {
            let segmentStart = segment.startAngle - (-Math.PI / 2);
            let segmentEnd = segment.endAngle - (-Math.PI / 2);
            if (segmentStart < 0) segmentStart += 2 * Math.PI;
            if (segmentEnd < 0) segmentEnd += 2 * Math.PI;
            
            if (segmentEnd < segmentStart) {
              if (angle >= segmentStart || angle <= segmentEnd) {
                const evt = { clientX, clientY };
                showPieTooltip(evt, segment, total);
                return;
              }
            } else {
              if (angle >= segmentStart && angle <= segmentEnd) {
                const evt = { clientX, clientY };
                showPieTooltip(evt, segment, total);
                return;
              }
            }
          }
        }
        const tooltip = getElement("pieTooltip");
        if (tooltip) tooltip.style.display = "none";
      } catch (e) {
        console.error("Error in pie chart mousemove:", e);
      }
    };

    canvas.onmouseleave = canvas.ontouchend = () => {
      const tooltip = getElement("pieTooltip");
      if (tooltip) tooltip.style.display = "none";
    };
  } catch (e) {
    console.error("Error in drawPieChart():", e);
  }
}

function showPieTooltip(e, segment, total) {
  try {
    const tooltip = getElement("pieTooltip");
    if (!tooltip) return;
    
    const canvas = getElement("pieChart");
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();

    tooltip.style.display = "block";
    tooltip.style.left = (e.clientX - rect.left + 12) + "px";
    tooltip.style.top = (e.clientY - rect.top + 12) + "px";

    const labelDiv = document.createElement('div');
    labelDiv.className = 'tooltip-label';
    labelDiv.textContent = segment.fullLabel;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'tooltip-value';
    valueDiv.textContent = `${Math.floor(segment.value).toLocaleString()} Hacked Computers`;
    
    const percentDiv = document.createElement('div');
    percentDiv.className = 'tooltip-label';
    percentDiv.textContent = `${((segment.value / total) * 100).toFixed(1)}%`;
    
    tooltip.innerHTML = '';
    tooltip.appendChild(labelDiv);
    tooltip.appendChild(valueDiv);
    tooltip.appendChild(percentDiv);
  } catch (e) {
    console.error("Error in showPieTooltip():", e);
  }
}

function drawMoneyGraph() {
  try {
    const canvas = getElement("moneyGraph");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (displayHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }

    if (!Array.isArray(game.moneyGraph) || game.moneyGraph.length < 2) return;

    const maxVal = Math.max(...game.moneyGraph, 1);

    ctx.beginPath();
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 2;

    for (let i = 0; i < game.moneyGraph.length; i++) {
      const x = (i / (game.moneyGraph.length - 1)) * displayWidth;
      const y = displayHeight - (game.moneyGraph[i] / maxVal * displayHeight * 0.9);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(88, 166, 255, 0.2)";
    ctx.lineTo(displayWidth, displayHeight);
    ctx.lineTo(0, displayHeight);
    ctx.closePath();
    ctx.fill();
    
    canvas.onmousemove = canvas.ontouchmove = (e) => {
      try {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
        const index = Math.floor((canvasX / canvas.width) * game.moneyGraph.length);

        if (index >= 0 && index < game.moneyGraph.length) {
          const tooltip = getElement("moneyTooltip");
          if (!tooltip) return;
          
          tooltip.style.display = "block";
          tooltip.style.left = (clientX - rect.left + 12) + "px";
          tooltip.style.top = (clientY - rect.top + 12) + "px";

          const pointsFromEnd = game.moneyGraph.length - 1 - index;
          const secondsAgo = pointsFromEnd * 10;
          const hours = Math.floor(secondsAgo / 3600);
          const mins = Math.floor((secondsAgo % 3600) / 60);
          let timeText = "";
          if (hours > 0) timeText = `${hours}h ${mins}m ago`;
          else if (mins > 0) timeText = `${mins}m ago`;
          else timeText = `${secondsAgo}s ago`;
          
          const labelDiv = document.createElement('div');
          labelDiv.className = 'tooltip-label';
          labelDiv.textContent = timeText;
          
          const valueDiv = document.createElement('div');
          valueDiv.className = 'tooltip-value';
          valueDiv.textContent = `$${Math.floor(game.moneyGraph[index]).toLocaleString()}`;
          
          tooltip.innerHTML = '';
          tooltip.appendChild(labelDiv);
          tooltip.appendChild(valueDiv);
        }
      } catch (e) {
        console.error("Error in money graph mousemove:", e);
      }
    };

    canvas.onmouseleave = canvas.ontouchend = () => {
      const tooltip = getElement("moneyTooltip");
      if (tooltip) tooltip.style.display = "none";
    };
  } catch (e) {
    console.error("Error in drawMoneyGraph():", e);
  }
}

function drawCharts() {
  try {
    if (window.slotsActive) return;
    drawPieChart();
    drawMoneyGraph();
  } catch (e) {
    console.error("Error in drawCharts():", e);
  }
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    drawCharts();
  }, 250);
});

export function markSkillsDirty() {
  skillsDirty = true;
}

export function markMarketplaceDirty() {
  marketplaceDirty = true;
}

export function markUpgradesDirty() {
  upgradesDirty = true;
}

export function initUICosts() {
  marketplaceDirty = true;
  upgradesDirty = true;
  skillsDirty = true;
  initCryptoMiningIfNeeded();
}

window.markSkillsDirty = () => { skillsDirty = true; };
window.markMarketplaceDirty = () => { marketplaceDirty = true; };
window.markUpgradesDirty = () => { upgradesDirty = true; };