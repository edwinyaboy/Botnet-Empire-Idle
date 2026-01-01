import { game, saveGame, GRAPH_SAMPLE_INTERVAL, GRAPH_MAX_POINTS } from './state.js';
import { getTotalBots, getAchievementBonus } from './bots.js';
import { achievements } from './achievements.js';
import { upgrades } from './upgrades.js';
import { tools } from './tools.js';

export const PRICE_ROLL_TIME = 1800000;

export function update() {
  const now = Date.now();
  const delta = Math.min((now - game.lastTick) / 1000, 1);
  game.lastTick = now;
  let eventBotMult = 1;
  let eventMoneyMult = 1;

  if(game.activeEvent && !game.eventAcknowledged) {
    return;
  }
  
  if (game.activeEvent === "raid") {
    eventBotMult = 0.7;
  } else if (game.activeEvent === "outage") {
    eventMoneyMult = 0.5;
  } else if (game.activeEvent === "boom") {
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
  
  if(now - game.lastGraphSample >= GRAPH_SAMPLE_INTERVAL){
    game.moneyGraph.push(game.totalEarned);
    if(game.moneyGraph.length > GRAPH_MAX_POINTS) game.moneyGraph.shift();
    game.lastGraphSample = now;
  }
  
  if(!game.priceTime || now - game.priceTime > PRICE_ROLL_TIME) {
    rollPrices();
  }
  
  if(!game.lastSaveTime || now - game.lastSaveTime > 5000) {
    saveGame();
    game.lastSaveTime = now;
  }
}

export function calculateBPS() {
  const prestigeBonus = getPrestigeBonus();
  const generationSkillBonus = game.skills.generation * 0.10;
  const automationSkillBonus = game.skills.automation * 0.05;
  const achievementGenerationBonus = getAchievementBonus("generation");
  const totalMultiplier = (1 + generationSkillBonus + automationSkillBonus + prestigeBonus * 0.10) * 
                         achievementGenerationBonus;
  
  let bps = 0;

  for (const id in game.upgrades) {
    if (game.upgrades[id] && upgrades[id] && upgrades[id].effect === "base_bots") {
      bps += upgrades[id].value * totalMultiplier;
    }
  }

  for (const id in game.tools) {
    const tool = tools[id];
    if (!tool || tool.type !== "bots") continue;
    const active = game.tools[id].active ? 1 : 0;
    if (active > 0) {
      bps += tool.base * active * totalMultiplier;
    }
  }
  return bps;
}

export function calculateMPS() {
  const prestigeBonus = getPrestigeBonus();
  const achievementIncomeBonus = getAchievementBonus("income");
  const totalMultiplier = (1 + prestigeBonus * 0.10) * achievementIncomeBonus;
  let mps = 0;

  for (const id in game.upgrades) {
    if (game.upgrades[id] && upgrades[id] && upgrades[id].type === "money") {
      mps += upgrades[id].base * totalMultiplier;
    }
  }

  for (const id in game.tools) {
    const tool = tools[id];
    if (!tool || tool.type !== "money") continue;
    const active = game.tools[id].active ? 1 : 0;
    if (active > 0) {
      mps += tool.base * active * totalMultiplier;
    }
  }
  return mps;
}

export function getPrestigeBonus(){
  let extraPrestige = 0;
  for(const a of achievements){
    if(game.achievements[a.id] && a.reward === "prestige"){
      extraPrestige += a.bonus;
    }
  }
  return game.prestige + extraPrestige;
}

export function rollPrices(){
  const oldPrices = game.prices;
  game.prices = {
    t1:(Math.random()*0.45+0.8),
    t2:(Math.random()*0.5+0.3),
    t3:(Math.random()*0.22+0.08),
    mobile:(Math.random()*0.8+1.2)
  };

  if(oldPrices && Object.keys(oldPrices).length > 0 && game.upgrades.marketScanner){
    game.priceDirection = game.prices.t3 > oldPrices.t3 ? 1 : (game.prices.t3 < oldPrices.t3 ? -1 : 0);
  } else {
    game.priceDirection = 0;
  }
  
  game.priceTime = Date.now();
}

export function exportSave(){
  const data = btoa(JSON.stringify(game));
  const el = document.createElement("textarea");
  el.value = data;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  alert("Save data exported to clipboard");
}

export function importSave(){
  const data = prompt("Paste save data:");
  if(data){
    try {
      const imported = JSON.parse(atob(data));
      if(imported && 
         typeof imported === 'object' &&
         imported.bots && 
         typeof imported.bots.t3 !== 'undefined' &&
         typeof imported.money === 'number' &&
         imported.skills &&
         imported.upgrades &&
         imported.tools){
        
        Object.assign(game, imported);
        localStorage.setItem("botnet_empire_v1", JSON.stringify(game));
        alert("Save data imported successfully");
        location.reload();
      } else {
        alert("Invalid save data format");
      }
    } catch(e) {
      console.error("Import error:", e);
      alert("Invalid save data format");
    }
  }
}

export function resetGame(){
  localStorage.clear();
  sessionStorage.clear();

  Object.assign(game, {
    version: '1.1.3',
    bots: { t1:0, t2:0, t3:0, mobile:0 },
    money:0,
    prestige:0,
    skills:{ tiers:0, prices:0, generation:0, automation:0 },
    tools:{},
    upgrades:{},
    prices:{ t1:1, t2:0.5, t3:0.15, mobile:1.5 },
    priceTime:Date.now(),
    lastSaveTime: 0,
    achievements:{},
    moneyGraph:[],
    unlocks:{ mobile:false },
    clickCooldowns:{},
    lastTick:Date.now(),
    lastGraphSample:Date.now(),
    activeEvent:null,
    eventEndTime:0,
    eventEffect:null,
    eventDuration:null,
    nextEventTime:Date.now() + (300000 + Math.random() * 300000),
    totalEarned:0,
    totalClicks:0,
    totalBotsSold:0,
    activeToolTab:null,
    tutorialComplete:false,
    priceDirection:0,
    eventAcknowledged:false
  });
  
  localStorage.setItem("botnet_empire_version", "1.1.3");
  location.reload();
}

export function upgrade(skill){
  const baseCosts = {
    tiers: 5e5,
    prices: 1e6,
    generation: 2e6,
    automation: 5e6
  };
  const baseCost = baseCosts[skill];
  const cost = baseCost * Math.pow(1.6, game.skills[skill]);
  
  if(game.money >= cost){
    game.money -= cost;
    game.skills[skill]++;
    saveGame();
    
    if (typeof window.markSkillsDirty === 'function') {
      window.markSkillsDirty();
    }
  }
}