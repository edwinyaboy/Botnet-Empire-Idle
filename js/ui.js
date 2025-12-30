import { game, saveGame } from './state.js';
import { getTotalBots, getAchievementBonus } from './bots.js';
import { achievements } from './achievements.js';
import { upgrades } from './upgrades.js';
import { triggerEvent } from './events.js';
import { calculateBPS, calculateMPS, upgrade } from './gameLoop.js';
import { clickTool, tools } from './tools.js';

let lastPriceUpdate = 0;
let lastMoney = 0;
let lastMobileState = false;
let marketplaceDirty = true;
let upgradesDirty = true;
let lastToolsState = "";
let resizeTimeout;

export function safeInt(n){
  return Math.floor(n + 1e-9);
}

export function render() {
  const total = getTotalBots();
  document.getElementById("totalBots").textContent = Math.floor(total).toLocaleString();
  document.getElementById("money").textContent = Math.floor(game.money).toLocaleString();
  document.getElementById("prestige").textContent = game.prestige;

  const bps = calculateBPS();
  const mps = calculateMPS();
  
  document.getElementById("bps").textContent = safeInt(bps);
  document.getElementById("mps").textContent = safeInt(mps);
  
  document.getElementById("t1Count").textContent = Math.floor(game.bots.t1).toLocaleString();
  document.getElementById("t2Count").textContent = Math.floor(game.bots.t2).toLocaleString();
  document.getElementById("t3Count").textContent = Math.floor(game.bots.t3).toLocaleString();
  
  if (game.unlocks.mobile) {
    const mobileCountEl = document.getElementById("mobileCount");
    if (mobileCountEl) {
      mobileCountEl.innerHTML = `<div style="margin-bottom:6px;">Mobile Devices<span class="tier-mobile">MOBILE</span>: <span style="color:#58a6ff; font-weight:600;">${Math.floor(game.bots.mobile).toLocaleString()}</span></div>`;
    }
  } else {
    const mobileCountEl = document.getElementById("mobileCount");
    if (mobileCountEl) mobileCountEl.innerHTML = "";
  }
  
  const priceRollTime = 1800;
  const timeLeft = Math.max(0, priceRollTime - Math.floor((Date.now() - game.priceTime) / 1000));
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const priceTimerEl = document.getElementById("priceTimer");
  if (priceTimerEl) {
    let timerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (game.upgrades.marketScanner && game.priceDirection !== 0) {
      timerText += game.priceDirection > 0 ? ' (↑)' : ' (↓)';
    }
    priceTimerEl.textContent = timerText;
  }
  
  if (game.activeEvent && game.eventAcknowledged && Date.now() < game.eventEndTime) {
    const remaining = Math.ceil((game.eventEndTime - Date.now()) / 1000);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const eventTimer = document.getElementById("eventTimer");
    if (eventTimer) {
      eventTimer.innerHTML = `
        <div class="event-timer-label">${game.activeEvent.toUpperCase()} ACTIVE</div>
        <div>${game.eventEffect || ''} - ${m}:${s.toString().padStart(2, '0')} remaining</div>
      `;
      eventTimer.style.display = "block";
    }
  } else {
    const eventTimer = document.getElementById("eventTimer");
    if (eventTimer) eventTimer.style.display = "none";
  }
  
  if (game.priceTime !== lastPriceUpdate || game.unlocks.mobile !== lastMobileState) {
    renderSellInterface();
    lastPriceUpdate = game.priceTime;
    lastMobileState = game.unlocks.mobile;
  } else {
    updateSellButtonStates();
  }
  
  renderSkills();
  renderAchievements();
  
  if (game.money !== lastMoney) {
    marketplaceDirty = true;
    upgradesDirty = true;
    lastMoney = game.money;
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
    tools: Object.keys(game.tools).sort(),
    activeTab: game.activeToolTab,
    toolStates: Object.keys(game.tools).map(id => game.tools[id].active)
  });
  
  if (toolsStateKey !== lastToolsState) {
    renderToolsInterface();
    lastToolsState = toolsStateKey;
  } else {
    updateToolsInterfaceDynamic();
  }
  
  const progress = total > 0 ? Math.min(100, (total / 8.2e9) * 100) : 0;
  const progressEl = document.getElementById("prestigeProgress");
  const progressTextEl = document.getElementById("prestigeText");
  const prestigeBonusEl = document.getElementById("prestigeBonus");
  
  if(progressEl) progressEl.style.width = progress + "%";
  if(progressTextEl) progressTextEl.textContent = progress.toFixed(2) + "%";
  if(prestigeBonusEl) prestigeBonusEl.textContent = (getPrestigeBonus() * 10).toFixed(1);
}

export function update() {
  const now = Date.now();
  const delta = Math.min((now - game.lastTick) / 1000, 1);
  game.lastTick = now;
  let eventBotMult = 1;
  let eventMoneyMult = 1;
  
  if (game.activeEvent === "raid" && game.eventAcknowledged) {
    eventBotMult = 0.7;
  } else if (game.activeEvent === "outage" && game.eventAcknowledged) {
    eventMoneyMult = 0.5;
  } else if (game.activeEvent === "boom" && game.eventAcknowledged) {
    eventBotMult = 2.0; 
  }
  const bps = calculateBPS();
  const mps = calculateMPS();
  game.bots.t3 += bps * delta * eventBotMult;
  const earned = mps * delta * eventMoneyMult;
  game.money += earned;
  game.totalEarned += earned;
  for(const id in game.clickCooldowns){
    if(game.clickCooldowns[id] > 0){
      game.clickCooldowns[id] -= delta;
      if(game.clickCooldowns[id] < 0) game.clickCooldowns[id] = 0;
    }
  }
  if(now - game.lastGraphSample >= 10000){
    game.moneyGraph.push(game.totalEarned);
    if(game.moneyGraph.length > 6048) game.moneyGraph.shift();
    game.lastGraphSample = now;
  }
  let priceRollTime = 1800000;
  if(Date.now() - game.priceTime > priceRollTime) {
    rollPrices();
  }
  if(!game.lastSaveTime || now - game.lastSaveTime > 5000) {
    saveGame();
    game.lastSaveTime = now;
  }
  triggerEvent();
  drawCharts();
  render();
}

function rollPrices(){
  const oldPrices = game.prices;
  game.prices = {
    t1:(Math.random()*0.45+0.8),
    t2:(Math.random()*0.5+0.3),
    t3:(Math.random()*0.22+0.08),
    mobile:(Math.random()*0.8+1.2)
  };
  
  if(oldPrices && game.upgrades.marketScanner){
    game.priceDirection = game.prices.t3 > oldPrices.t3 ? 1 : (game.prices.t3 < oldPrices.t3 ? -1 : 0);
  }
  
  game.priceTime = Date.now();
}

function updateSellButtonStates(){
  const tiers = ['t1', 't2', 't3'];
  if(game.unlocks.mobile) tiers.push('mobile');
  
  tiers.forEach(tier => {
    const buttons = document.querySelectorAll(`.sell-btn-${tier}`);
    buttons.forEach(btn => {
      const amount = parseInt(btn.getAttribute('data-amount'));
      btn.disabled = game.bots[tier] < amount;
    });
    
    const input = document.getElementById(`sell_custom_${tier}`);
    if(input){
      input.max = Math.floor(game.bots[tier]);
    }
  });
}

function renderSellInterface(){
  const sellUI = document.getElementById("sellInterface");
  sellUI.innerHTML = "";
  
  if(!game.prices){
    game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    game.priceTime = Date.now();
  }
  
  const tiers = [
    {key:"t1", label:"T1 Premium", price:game.prices.t1},
    {key:"t2", label:"T2 Standard", price:game.prices.t2},
    {key:"t3", label:"T3 Basic", price:game.prices.t3}
  ];
  
  if(game.unlocks.mobile) tiers.push({key:"mobile", label:"Mobile", price:game.prices.mobile});
  
  tiers.forEach(t => {
    const amounts = [100, 250, 500, 1000, 10000, 25000, 50000, 100000, 250000, 1000000, 5000000, 250000000, 500000000];
    
    const tierDiv = document.createElement('div');
    tierDiv.className = 'sell-tier';
    tierDiv.innerHTML = `
      <div class="sell-tier-header">
        <div class="sell-tier-name">${t.label}</div>
        <div class="sell-tier-price">$${t.price.toFixed(3)}/bot</div>
      </div>
      <div class="sell-buttons-row">
        <div class="sell-scroll-container">
          <div class="sell-scroll-buttons">
            ${amounts.map(amt => `
              <button class="small sell-btn-${t.key}" data-amount="${amt}" onclick="sell('${t.key}', ${amt}); event.stopPropagation();" ${game.bots[t.key]<amt?'disabled':''}>
                ${amt >= 1000000 ? (amt/1000000)+'M' : amt >= 1000 ? (amt/1000)+'k' : amt}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="custom-sell-container">
        <input type="number" id="sell_custom_${t.key}" placeholder="Custom amount" min="1" max="${Math.floor(game.bots[t.key])}">
        <button class="small" onclick="sellCustom('${t.key}'); event.stopPropagation();">Sell Custom</button>
      </div>
    `;
    
    sellUI.appendChild(tierDiv);
    
    const input = document.getElementById(`sell_custom_${t.key}`);
    if(input){
      ['click', 'focus', 'mousedown', 'touchstart'].forEach(evt => {
        input.addEventListener(evt, (e) => e.stopPropagation(), {passive: true});
      });
    }
  });
}

function renderUpgrades(){
  const upgradesUI = document.getElementById("upgrades");
  if(!upgradesUI) return;
  
  upgradesUI.innerHTML = "";
  const sortedUpgrades = Object.keys(upgrades).sort((a, b) => upgrades[a].cost - upgrades[b].cost);
  
  for(const id of sortedUpgrades){
    const u = upgrades[id];
    const owned = game.upgrades[id];
    const affordable = game.money >= u.cost;
    
    let html = `<div class="tool-card">
      <div class="tool-header">
        <div class="tool-name">${u.name}</div>
        ${owned?`<div class="tool-status active">PURCHASED</div>`:''}
      </div>
      <div class="tool-desc">${u.desc}`;
    
    if(u.effect === "base_bots") html += ` - ${u.value} T3 bots/sec`;
    if(u.effect === "sell_price") html += ` - +${(u.value*100).toFixed(0)}% sell price`;
    if(u.effect === "market_info") html += ` - Shows T3 price trends`;
    
    html += `</div>`;
    
    if(!owned){
      html += `<button onclick="buyUpgrade('${id}')" ${!affordable?'disabled':''}>
        Purchase - $${u.cost.toLocaleString()}
      </button>`;
    }
    
    html += `</div>`;
    upgradesUI.innerHTML += html;
  }
}

function renderMarketplace(){
  const market = document.getElementById("market");
  if(!market) return;

  market.innerHTML = "";
  const sortedTools = Object.keys(tools).sort((a, b) => tools[a].cost - tools[b].cost);

  for(const id of sortedTools){
    const t = tools[id];
    const owned = game.tools[id];
    const affordable = game.money >= t.cost;

    let html = `<div class="tool-card">
      <div class="tool-header">
        <div class="tool-name">${t.name}</div>
        ${owned ? `<div class="tool-status active">PURCHASED</div>` : ''}
      </div>
      <div class="tool-desc">${t.desc}`;

    if(t.type === "bots") html += ` - ${t.base} T3 bots/sec`;
    if(t.type === "money") html += ` - $${t.base}/sec`;
    if(t.clickable) html += ` - Clickable`;
    if(t.unlocks === "mobile") html += ` - Unlocks Mobile Infrastructure`;

    html += `</div>`;
    if(!owned){
      html += `<button onclick="buyTool('${id}')" ${!affordable?'disabled':''}>
        Purchase - $${t.cost.toLocaleString()}
      </button>`;
    }

    html += `</div>`;
    market.innerHTML += html;
  }
}

function renderSkills(){
  const skillsUI = document.getElementById("skills");
  if(!skillsUI) return;

  const skillDefs = [
    {key:"tiers", label:"Bot Tier Distribution", desc:"+5% better tier chances"},
    {key:"prices", label:"Market Efficiency", desc:"+10% sell prices"},
    {key:"generation", label:"Bot Generation Rate", desc:"+10% passive generation"},
    {key:"automation", label:"Automation Efficiency", desc:"+5% tool effectiveness"}
  ];

  const baseCosts = {
    tiers: 5e5,
    prices: 1e6,
    generation: 2e6,
    automation: 5e6
  };

  skillsUI.innerHTML = "";

  skillDefs.forEach(s => {
    const level = game.skills[s.key] || 0;
    const cost = baseCosts[s.key] * Math.pow(1.6, level);
    const canBuy = game.money >= cost;

    skillsUI.innerHTML += `
      <button
        onclick="upgrade('${s.key}')"
        ${!canBuy ? "disabled" : ""}
      >
        ${s.label}<br>
        <span style="font-size:clamp(10px, 2vw, 11px); color:#8b949e;">
          Level ${level} – $${cost.toLocaleString()}
        </span>
      </button>
    `;
  });
}

function renderAchievements(){
  const ach = document.getElementById("achievements");
  ach.innerHTML = "";
  
  achievements.forEach(a => {
    const done = game.achievements[a.id] || a.check();
    if(done && !game.achievements[a.id]) game.achievements[a.id] = true;
    
    let rewardText = "";
    if(a.reward === "income") rewardText = `+${(a.bonus*100).toFixed(0)}% Income`;
    else if(a.reward === "generation") rewardText = `+${(a.bonus*100).toFixed(0)}% Generation`;
    else if(a.reward === "prestige") rewardText = `+${a.bonus} Effective Prestige`;
    else if(a.reward === "click") rewardText = `+${(a.bonus*100).toFixed(0)}% Click Power`;
    else if(a.reward === "cooldown") rewardText = `−${(a.bonus*100).toFixed(0)}% Cooldowns`;
    else if(a.reward === "automation") rewardText = `+${(a.bonus*100).toFixed(0)}% Automation`;
    else if(a.reward === "special") rewardText = `Special Effect`;
    
    ach.innerHTML += `<div class="achievement ${done?'done':''}">
      <div class="achievement-text">${a.text}</div>
      <div class="achievement-reward">${rewardText}</div>
    </div>`;
  });
}

function renderToolsInterface(){
  const toolsUI = document.getElementById("toolsInterface");
  const ownedClickableTools = Object.keys(game.tools).filter(id => {
    const tool = game.tools[id];
    const toolDef = tools[id];
    return tool !== undefined && 
           toolDef && 
           toolDef.clickable;
  });


if(tools.unlocks && game.achievements[tools.unlocks] && !tool.notified){
  notify("You already unlocked this tool via achievements. Purchase was unnecessary.");
  tool.notified = true;
}
  
  if(ownedClickableTools.length === 0){
    toolsUI.innerHTML = `<div style="font-size:clamp(10px, 2vw, 11px); color:#8b949e; padding:10px; text-align:center;">
      No clickable tools purchased yet. Purchase clickable tools from marketplace to use them here.
    </div>`;
    return;
  }

  if(!game.activeToolTab || !game.tools[game.activeToolTab] || !tools[game.activeToolTab]?.clickable){
    game.activeToolTab = ownedClickableTools[0];
  }

  let html = '<div class="tool-tabs">';
  ownedClickableTools.forEach(id => {
    html += `<div class="tool-tab ${game.activeToolTab===id?'active':''}" 
                    data-tool-id="${id}">
      ${tools[id].name.split(' ')[0]}
    </div>`;
  });
  html += '</div>';

  ownedClickableTools.forEach(id => {
    const t = tools[id];
    const owned = game.tools[id];
    const cd = game.clickCooldowns[id] || 0;
    const clicks = owned.clicks || 0;
    const cooldownReduction = getCooldownReduction();
    
    html += `<div class="tool-panel ${game.activeToolTab===id?'active':''}" data-tool-id="${id}">
      <div style="margin-bottom:12px;">
        <div style="font-size:clamp(11px, 2.5vw, 13px); font-weight:600; color:#58a6ff; margin-bottom:4px;">
          ${t.name}
        </div>
        <div style="font-size:clamp(10px, 2vw, 11px); color:#8b949e; margin-bottom:8px;">
          ${t.desc}
        </div>
      </div>`;

    const isOnCooldown = cd > 0;
    const cooldownWidth = isOnCooldown ? 
      (1 - cd / (t.clickCooldown * cooldownReduction)) * 100 : 0;
    
    html += `
		<button data-tool-click="${id}" 
          data-click-btn="${id}" 
          ${isOnCooldown ? 'disabled' : ''}
          style="margin-bottom:8px;">
        <span data-click-text="${id}">
          Execute Bonus (${clicks}/50)${isOnCooldown ? ' - ' + Math.ceil(cd) + 's' : ''}
        </span>
      </button>
      <div class="cooldown-bar" data-cooldown-bar="${id}" style="${isOnCooldown ? '' : 'display:none'}">
        <div class="cooldown-fill" 
             data-cooldown-fill="${id}" 
             style="width:${cooldownWidth}%"></div>
      </div>
      
      <div style="margin-top:12px; font-size:clamp(10px, 1.8vw, 10px); color:#8b949e;">
        <div><strong>Click Bonus:</strong> ${t.type === "bots" ? t.clickBonus.toLocaleString() + " bots" : "$" + t.clickBonus.toLocaleString()}</div>
        <div><strong>Cooldown:</strong> ${t.clickCooldown} seconds</div>
        ${cooldownReduction < 1 ? `<div><strong>Cooldown Reduction:</strong> ${Math.round((1 - cooldownReduction) * 100)}%</div>` : ''}
      </div>
    </div>`;
  });
  
  toolsUI.innerHTML = html;
}

export function setupEventListeners() {
  document.addEventListener('click', function(e) {
    const toolTab = e.target.closest('.tool-tab');
    if (toolTab) {
      const toolId = toolTab.getAttribute('data-tool-id');
      if (toolId) {
        game.activeToolTab = toolId;
        render();
      }
    }
    
    const toolBtn = e.target.closest('[data-tool-click]');
    if (toolBtn) {
      const toolId = toolBtn.getAttribute('data-tool-click');
      clickTool(toolId);
    }
  });
}

function updateToolsInterfaceDynamic(){
  const ownedClickableTools = Object.keys(game.tools).filter(id => {
    const toolDef = tools[id];
    return toolDef && toolDef.clickable;
  });
  
  ownedClickableTools.forEach(id => {
    const t = tools[id];
    const owned = game.tools[id];
    const cd = game.clickCooldowns[id] || 0;
    const clicks = owned.clicks || 0;
    const isOnCooldown = cd > 0;
    const cooldownReduction = getCooldownReduction();
    const cooldownWidth = isOnCooldown ? 
      (1 - cd / (t.clickCooldown * cooldownReduction)) * 100 : 0;

    const clickBtn = document.querySelector(`[data-click-btn="${id}"]`);
    if(clickBtn){
      clickBtn.disabled = isOnCooldown;
      const clickText = document.querySelector(`[data-click-text="${id}"]`);
      if(clickText){
        clickText.textContent = `Execute Bonus (${clicks}/50)${isOnCooldown ? ' - ' + Math.ceil(cd) + 's' : ''}`;
      }
    }

    const cooldownBar = document.querySelector(`[data-cooldown-bar="${id}"]`);
    const cooldownFill = document.querySelector(`[data-cooldown-fill="${id}"]`);
    if(cooldownBar && cooldownFill){
      if(isOnCooldown){
        cooldownBar.style.display = '';
        cooldownFill.style.width = cooldownWidth + '%';
      } else {
        cooldownBar.style.display = 'none';
      }
    }
  });
}

function getPrestigeBonus(){
  let extraPrestige = 0;
  for(const a of achievements){
    if(game.achievements[a.id] && a.reward === "prestige"){
      extraPrestige += a.bonus;
    }
  }
  return game.prestige + extraPrestige;
}

function getCooldownReduction(){
  let reduction = 1;
  for(const a of achievements){
    if(game.achievements[a.id] && a.reward === "cooldown"){
      reduction -= a.bonus;
    }
  }
  return Math.max(0.1, reduction);
}

export function drawCharts(){
  drawPieChart();
  drawMoneyGraph();
}

function drawPieChart(){
  const canvas = document.getElementById("pieChart");
  if(!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  
  if(rect.width === 0 || rect.height === 0) return;
  
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
  if(total === 0){
    ctx.fillStyle = "#8b949e";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No bots acquired", centerX, centerY);
    return;
  }

  const data = [
    {label:"T1", value:game.bots.t1, color:"#6e7681", fullLabel:"T1 Premium"},
    {label:"T2", value:game.bots.t2, color:"#58a6ff", fullLabel:"T2 Standard"},
    {label:"T3", value:game.bots.t3, color:"#f85149", fullLabel:"T3 Basic"}
  ];
  if(game.unlocks.mobile && game.bots.mobile > 0) {
    data.push({label:"Mobile", value:game.bots.mobile, color:"#ffc107", fullLabel:"Mobile"});
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

    if(sliceAngle > 0.15){
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
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const dx = x / dpr - centerX;
    const dy = y / dpr - centerY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if(distance <= radius){
      let angle = Math.atan2(dy, dx);
      angle = angle - (-Math.PI/2);
      if(angle < 0) angle += 2*Math.PI;

      for(const segment of data){
        let segmentStart = segment.startAngle - (-Math.PI/2);
        let segmentEnd = segment.endAngle - (-Math.PI/2);
        if(segmentStart < 0) segmentStart += 2*Math.PI;
        if(segmentEnd < 0) segmentEnd += 2*Math.PI;
        
        if(segmentEnd < segmentStart){
          if(angle >= segmentStart || angle <= segmentEnd){
            const evt = {clientX, clientY};
            showPieTooltip(evt, segment, total);
            return;
          }
        } else {
          if(angle >= segmentStart && angle <= segmentEnd){
            const evt = {clientX, clientY};
            showPieTooltip(evt, segment, total);
            return;
          }
        }
      }
    }
    document.getElementById("pieTooltip").style.display = "none";
  };

  canvas.onmouseleave = canvas.ontouchend = () => {
    document.getElementById("pieTooltip").style.display = "none";
  };
}

function showPieTooltip(e, segment, total){
  const tooltip = document.getElementById("pieTooltip");
  const canvas = document.getElementById("pieChart");
  const rect = canvas.getBoundingClientRect();

  tooltip.style.display = "block";
  tooltip.style.left = (e.clientX - rect.left + 12) + "px";
  tooltip.style.top = (e.clientY - rect.top + 12) + "px";

  tooltip.innerHTML = `
    <div class="tooltip-label">${segment.fullLabel}</div>
    <div class="tooltip-value">${Math.floor(segment.value).toLocaleString()} bots</div>
    <div class="tooltip-label">${((segment.value/total)*100).toFixed(1)}%</div>
  `;
}

function drawMoneyGraph(){
  const canvas = document.getElementById("moneyGraph");
  const ctx = canvas.getContext("2d");
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
  for(let i=0; i<=5; i++){
    const y = (displayHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(displayWidth, y);
    ctx.stroke();
  }

  if(game.moneyGraph.length < 2) return;

  const maxVal = Math.max(...game.moneyGraph, 1);

  ctx.beginPath();
  ctx.strokeStyle = "#58a6ff";
  ctx.lineWidth = 2;

  for(let i=0; i<game.moneyGraph.length; i++){
    const x = (i / (game.moneyGraph.length-1)) * displayWidth;
    const y = displayHeight - (game.moneyGraph[i]/maxVal*displayHeight*0.9);
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(88, 166, 255, 0.2)";
  ctx.lineTo(displayWidth, displayHeight);
  ctx.lineTo(0, displayHeight);
  ctx.closePath();
  ctx.fill();
  
  canvas.onmousemove = canvas.ontouchmove = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const index = Math.floor((canvasX / canvas.width) * game.moneyGraph.length);

    if(index >= 0 && index < game.moneyGraph.length){
      const tooltip = document.getElementById("moneyTooltip");
      tooltip.style.display = "block";
      tooltip.style.left = (clientX - rect.left + 12) + "px";
      tooltip.style.top = (clientY - rect.top + 12) + "px";

      const pointsFromEnd = game.moneyGraph.length - 1 - index;
      const secondsAgo = pointsFromEnd * 10;
      const hours = Math.floor(secondsAgo / 3600);
      const mins = Math.floor((secondsAgo % 3600) / 60);
      let timeText = "";
      if(hours > 0) timeText = `${hours}h ${mins}m ago`;
      else if(mins > 0) timeText = `${mins}m ago`;
      else timeText = `${secondsAgo}s ago`;
      
      tooltip.innerHTML = `
        <div class="tooltip-label">${timeText}</div>
        <div class="tooltip-value">$${Math.floor(game.moneyGraph[index]).toLocaleString()}</div>
      `;
    }
  };

  canvas.onmouseleave = canvas.ontouchend = () => {
    document.getElementById("moneyTooltip").style.display = "none";
  };
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    drawCharts();
  }, 250);
});