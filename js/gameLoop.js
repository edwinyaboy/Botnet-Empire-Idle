import { game, saveGame, GRAPH_SAMPLE_INTERVAL, GRAPH_MAX_POINTS } from './state.js';
import { getTotalBots, getAchievementBonus } from './bots.js';
import { achievements } from './achievements.js';
import { upgrades } from './upgrades.js';
import { tools } from './tools.js';
import { getBotGenerationMultiplier, getCryptoMiningInstance } from './crypto.js';

export const PRICE_ROLL_TIME = 1800000;
export const BACKUP_INTERVAL = 300000;
export const MAX_DELTA = 5;
export const MIN_DELTA = 0;
export const MAX_SAFE_INTEGER = 9007199254740991;

let lastBackupTime = 0;
let lastUpdateTime = Date.now();
let isOfflineCalculation = false;

function sanitizeNumber(value, defaultValue = 0, min = -MAX_SAFE_INTEGER, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

export function update() {
  try {
    const now = Date.now();
    const rawDelta = (now - game.lastTick) / 1000;
    const delta = Math.max(MIN_DELTA, Math.min(MAX_DELTA, rawDelta));
    
    if (now - lastUpdateTime < 50) {
      return;
    }
    lastUpdateTime = now;

    game.lastTick = now;

    let eventBotMult = 1;
    let eventMoneyMult = 1;

    if (game.activeEvent && !game.eventAcknowledged) {
      return;
    }
    
    if (game.activeEvent === "raid") {
      eventBotMult = 0.7;
    } else if (game.activeEvent === "outage") {
      eventMoneyMult = 0.5;
    } else if (game.activeEvent === "boom") {
      eventBotMult = 2.0;
	} else if (game.activeEvent === "crypto") {
      eventBotMult = 0.5;
    }
    
    const bps = calculateBPS();
    const mps = calculateMPS();

    const botsGained = sanitizeNumber(bps * delta * eventBotMult, 0, 0, MAX_SAFE_INTEGER);
    const moneyEarned = sanitizeNumber(mps * delta * eventMoneyMult, 0, 0, MAX_SAFE_INTEGER);

    if (isFinite(botsGained) && botsGained >= 0) {
      game.bots.t3 = sanitizeNumber(game.bots.t3 + botsGained, 0, 0, MAX_SAFE_INTEGER);
    }

    if (isFinite(moneyEarned) && moneyEarned >= 0) {
      game.money = sanitizeNumber(game.money + moneyEarned, 0, 0, MAX_SAFE_INTEGER);
      game.totalEarned = sanitizeNumber(game.totalEarned + moneyEarned, 0, 0, MAX_SAFE_INTEGER);
    }
    
    if (game.clickCooldowns && typeof game.clickCooldowns === 'object') {
      for (const id in game.clickCooldowns) {
        if (typeof game.clickCooldowns[id] === 'number' && game.clickCooldowns[id] > 0) {
          game.clickCooldowns[id] = Math.max(0, game.clickCooldowns[id] - delta);
        }
      }
    }
    
    if (now - game.lastGraphSample >= GRAPH_SAMPLE_INTERVAL) {
      if (!Array.isArray(game.moneyGraph)) {
        game.moneyGraph = [];
      }

      const sanitizedEarned = sanitizeNumber(game.totalEarned, 0, 0, MAX_SAFE_INTEGER);
      game.moneyGraph.push(sanitizedEarned);

      if (game.moneyGraph.length > GRAPH_MAX_POINTS) {
        game.moneyGraph = game.moneyGraph.slice(-GRAPH_MAX_POINTS);
      }

      game.lastGraphSample = now;
    }
    
    if (!game.priceTime || now - game.priceTime > PRICE_ROLL_TIME) {
      rollPrices();
    }
    
    if (!game.lastSaveTime || now - game.lastSaveTime > 5000) {
      saveGame();
      game.lastSaveTime = now;
    }
    
    createBackup();
  } catch (e) {
    console.error("Critical error in update():", e);
  }
}

export function createBackup() {
  const now = Date.now();
  if (now - lastBackupTime > BACKUP_INTERVAL) {
    try {
      const backupData = JSON.stringify(game);
      
      if (backupData.length > 5000000) {
        console.warn("Backup too large, skipping");
        return;
      }

      const backupKey = `botnet_backup_${Date.now()}`;
      localStorage.setItem(backupKey, backupData);
      lastBackupTime = now;
      
      const backupKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('botnet_backup_')) {
          backupKeys.push(key);
        }
      }
      
      backupKeys.sort();
      while (backupKeys.length > 5) {
        const keyToRemove = backupKeys.shift();
        if (keyToRemove) {
          localStorage.removeItem(keyToRemove);
        }
      }
    } catch (e) {
      console.warn("Failed to create backup:", e);
    }
  }
}

export function calculateBPS(offlineEfficiency = 1) {
  try {
    const prestigeBonus = sanitizeNumber(getPrestigeBonus(), 0, 0, 10000);
    const generationSkill = sanitizeNumber(game.skills?.generation, 0, 0, 10000);
    const automationSkill = sanitizeNumber(game.skills?.automation, 0, 0, 10000);
    const achievementBonus = sanitizeNumber(getAchievementBonus("generation"), 1, 1, 1000);
    const cryptoMultiplier = getBotGenerationMultiplier();

    const generationSkillBonus = generationSkill * 0.10;
    const automationSkillBonus = automationSkill * 0.05;
    
    const totalMultiplier = (1 + generationSkillBonus + automationSkillBonus + prestigeBonus * 0.10) * achievementBonus * cryptoMultiplier * offlineEfficiency;
    
    if (!isFinite(totalMultiplier) || totalMultiplier < 0) {
      console.error("Invalid totalMultiplier in calculateBPS");
      return 0;
    }
    
    let bps = 0;

    if (game.upgrades && typeof game.upgrades === 'object') {
      for (const id in game.upgrades) {
        if (game.upgrades[id] && upgrades[id] && upgrades[id].effect === "base_bots") {
          const value = sanitizeNumber(upgrades[id].value, 0, 0, MAX_SAFE_INTEGER);
          bps += value * totalMultiplier;
        }
      }
    }

    if (game.tools && typeof game.tools === 'object') {
      for (const id in game.tools) {
        const tool = tools[id];
        if (!tool || tool.type !== "bots") continue;
        const active = game.tools[id]?.active ? 1 : 0;
        if (active > 0) {
          const base = sanitizeNumber(tool.base, 0, 0, MAX_SAFE_INTEGER);
          bps += base * active * totalMultiplier * cryptoMultiplier;
        }
     }
  }

    return sanitizeNumber(bps, 0, 0, MAX_SAFE_INTEGER);
  } catch (e) {
    console.error("Error in calculateBPS():", e);
    return 0;
  }
}

export function calculateMPS(offlineEfficiency = 1) {
  try {
    const prestigeBonus = sanitizeNumber(getPrestigeBonus(), 0, 0, 10000);
    const achievementBonus = sanitizeNumber(getAchievementBonus("income"), 1, 1, 1000);
    const totalMultiplier = (1 + prestigeBonus * 0.10) * achievementBonus * offlineEfficiency;

    if (!isFinite(totalMultiplier) || totalMultiplier < 0) {
      console.error("Invalid totalMultiplier in calculateMPS");
      return 0;
    }

    let mps = 0;

    if (game.upgrades && typeof game.upgrades === 'object') {
      for (const id in game.upgrades) {
        if (game.upgrades[id] && upgrades[id] && upgrades[id].type === "money") {
          const base = sanitizeNumber(upgrades[id].base, 0, 0, MAX_SAFE_INTEGER);
          mps += base * totalMultiplier;
        }
      }
    }

    if (game.tools && typeof game.tools === 'object') {
      for (const id in game.tools) {
        const tool = tools[id];
        if (!tool || tool.type !== "money") continue;
        const active = game.tools[id]?.active ? 1 : 0;
        if (active > 0) {
          const base = sanitizeNumber(tool.base, 0, 0, MAX_SAFE_INTEGER);
          mps += base * active * totalMultiplier;
        }
      }
    }

    const cryptoInstance = getCryptoMiningInstance();
    if (cryptoInstance && cryptoInstance.state && cryptoInstance.state.active) {
      const totalBots = sanitizeNumber(
        (game.bots.t1 || 0) + 
        (game.bots.t2 || 0) + 
        (game.bots.t3 || 0) + 
        (game.bots.mobile || 0),
        0, 0, MAX_SAFE_INTEGER
      );
      
      const mode = cryptoInstance.state.mode;
      const rate = cryptoInstance.currentRate && cryptoInstance.currentRate[mode] 
        ? sanitizeNumber(cryptoInstance.currentRate[mode], 0.0001, 0, 1) 
        : 0.0001;
      
      const cryptoMPS = totalBots * rate;
      mps += cryptoMPS * offlineEfficiency;
    }

    return sanitizeNumber(mps, 0, 0, MAX_SAFE_INTEGER);
  } catch (e) {
    console.error("Error in calculateMPS():", e);
    return 0;
  }
}

export function getPrestigeBonus() {
  try {
    let extraPrestige = 0;
    if (Array.isArray(achievements)) {
      for (const a of achievements) {
        if (game.achievements && game.achievements[a.id] && a.reward === "prestige") {
          extraPrestige += sanitizeNumber(a.bonus, 0, 0, 1000);
        }
      }
    }
    const basePrestige = sanitizeNumber(game.prestige, 0, 0, 10000);
    return sanitizeNumber(basePrestige + extraPrestige, 0, 0, 10000);
  } catch (e) {
    console.error("Error in getPrestigeBonus():", e);
    return 0;
  }
}

export function rollPrices() {
  try {
    const oldPrices = game.prices ? { ...game.prices } : null;

    game.prices = {
      t1: sanitizeNumber(Math.random() * 0.45 + 0.8, 1, 0.01, 100),
      t2: sanitizeNumber(Math.random() * 0.5 + 0.3, 0.5, 0.01, 100),
      t3: sanitizeNumber(Math.random() * 0.22 + 0.08, 0.15, 0.01, 100),
      mobile: sanitizeNumber(Math.random() * 0.8 + 1.2, 1.5, 0.01, 100)
    };

    if (oldPrices && Object.keys(oldPrices).length > 0 && game.upgrades && game.upgrades.marketScanner) {
      const oldT3 = sanitizeNumber(oldPrices.t3, 0.15, 0.01, 100);
      const newT3 = game.prices.t3;
      game.priceDirection = newT3 > oldT3 ? 1 : (newT3 < oldT3 ? -1 : 0);
    } else {
      game.priceDirection = 0;
    }
    
    game.priceTime = Date.now();
  } catch (e) {
    console.error("Error in rollPrices():", e);
    game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    game.priceTime = Date.now();
  }
}

export function exportSave() {
  try {
    const data = btoa(JSON.stringify(game));
    const el = document.createElement("textarea");
    el.value = data;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    alert("Save data exported to clipboard");
  } catch (e) {
    console.error("Export failed:", e);
    alert("Failed to export save data");
  }
}

export function importSave() {
  const data = prompt("Paste save data:");
  if (!data) return;

  try {
    if (!/^[A-Za-z0-9+/=]+$/.test(data)) {
      throw new Error("Invalid base64 data");
    }
    
    const imported = JSON.parse(atob(data));

    const requiredProps = ['bots', 'money', 'skills', 'upgrades', 'tools'];
    for (const prop of requiredProps) {
      if (imported[prop] === undefined) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }

    if (typeof imported.bots !== 'object') {
      throw new Error("Invalid bots data");
    }
    
    const botTiers = ['t1', 't2', 't3'];
    if (imported.unlocks?.mobile) botTiers.push('mobile');
    
    for (const tier of botTiers) {
      if (typeof imported.bots[tier] !== 'number' || imported.bots[tier] < 0) {
        throw new Error(`Invalid bot count for ${tier}`);
      }
    }
    
    if (typeof imported.money !== 'number' || imported.money < 0) {
      throw new Error("Invalid money value");
    }
    
    Object.assign(game, imported);
    localStorage.setItem("botnet_empire_v1", JSON.stringify(game));
    alert("Save data imported successfully");
    setTimeout(() => location.reload(), 500);
  } catch (e) {
    console.error("Import error:", e);
    alert("Invalid save data format: " + e.message);
  }
}

export function resetGame() {
  if (!confirm("This will permanently delete ALL game data. Are you absolutely sure?")) {
    return;
  }

  if (!confirm("This cannot be undone. Really reset everything?")) {
    return;
  }

  try {
    const itemsToRemove = [
      "botnet_empire_v1",
      "botnet_empire_version",
      "botnet_migration_in_progress",
      "botnet_migration_backup",
      "hacker_slots",
      "crypto_mining_v3",
      "offline_system"
    ];
    
    itemsToRemove.forEach(item => {
      try {
        localStorage.removeItem(item);
      } catch (e) {
        console.warn(`Could not remove ${item}:`, e);
      }
    });

    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('botnet_backup_') || key.includes('crypto') || key.includes('offline'))) {
        backupKeys.push(key);
      }
    }
    backupKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });

    Object.assign(game, {
      version: '1.2.3',
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
      eventAcknowledged:false,
      cryptoMiningState: {
        active: false,
        mode: 'low',
        totalMined: 0,
        lastUpdate: Date.now()
      },
      offlineProcessed: false
    });
    
    localStorage.setItem("botnet_empire_version", "1.2.3");
    
    if (typeof window.saveGame === 'function') {
      window.saveGame();
    }
    
    if (typeof window.resetCryptoMining === 'function') {
      window.resetCryptoMining();
    }
    
    if (typeof window.getCryptoMiningInstance === 'function') {
      const cryptoInstance = window.getCryptoMiningInstance();
      if (cryptoInstance) {
        cryptoInstance.offlineProcessed = false;
        cryptoInstance.state = {
          active: false,
          mode: 'low',
          lastUpdate: Date.now(),
          totalMined: 0
        };
        
        if (cryptoInstance.updateInterval) {
          clearInterval(cryptoInstance.updateInterval);
          cryptoInstance.updateInterval = null;
        }
        
        cryptoInstance.miningActive = false;
        cryptoInstance.isActive = false;
        
        if (cryptoInstance.elements && cryptoInstance.elements.toggleBtn) {
          cryptoInstance.elements.toggleBtn.textContent = 'Start Mining';
          cryptoInstance.elements.toggleBtn.className = 'primary';
        }
        
        if (typeof cryptoInstance.updateUI === 'function') {
          cryptoInstance.updateUI();
        }
      }
    }
    
    setTimeout(() => {
      location.reload();
    }, 100);
    
  } catch (e) {
    console.error("Reset failed:", e);
    alert("Failed to reset game");
  }
}

export function upgrade(skill) {
  try {
    const baseCosts = {
      tiers: 5e5,
      prices: 1e6,
      generation: 2e6,
      automation: 5e6
    };

    if (!baseCosts[skill]) {
      console.error("Invalid skill:", skill);
      return false;
    }

    const baseCost = baseCosts[skill];
    const currentLevel = sanitizeNumber(game.skills[skill], 0, 0, 10000);
    const cost = baseCost * Math.pow(1.6, currentLevel);
    
    if (!isFinite(cost) || cost < 0) {
      console.error("Invalid cost calculated");
      return false;
    }

    if (game.money >= cost) {
      game.money = sanitizeNumber(game.money - cost, 0, 0, MAX_SAFE_INTEGER);
      game.skills[skill] = sanitizeNumber(currentLevel + 1, 0, 0, 10000);
      saveGame();
      
      if (typeof window.markSkillsDirty === 'function') {
        window.markSkillsDirty();
      }
      return true;
    }

    return false;
  } catch (e) {
    console.error("Error in upgrade():", e);
    return false;
  }
}