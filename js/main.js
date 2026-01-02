import { game, saveGame } from './state.js';
import { showTutorial, closeTutorial } from './tutorial.js';
import { spread, startSpread, stopSpread, resetSpread } from './bots.js';
import { sell, sellCustom } from './purchase.js';
import { buyUpgrade, buyTool } from './upgrades.js';
import { clickTool } from './tools.js';
import { prestigeReset } from './prestige.js';
import { showEvent, acknowledgeEvent, triggerEvent } from './events.js';
import { render, setupEventListeners, initUICosts } from './ui.js';
import { exportSave, importSave, resetGame, update as gameUpdate, rollPrices, upgrade, calculateBPS, calculateMPS } from './gameLoop.js';
import { enterSlots } from './slots.js';
import { initCryptoAfterGameLoad, getCryptoMiningInstance } from './crypto.js';
import { initOfflineSystem, processOfflineProgress, updateLastOnlineTime } from './offline.js';

export { game };

const VERSION_KEY = "botnet_empire_version";
const SAVE_KEY = "botnet_empire_v1";
const MIGRATION_LOCK_KEY = "botnet_migration_in_progress";
const MIGRATION_BACKUP_KEY = "botnet_migration_backup";
const CURRENT_VERSION = '1.2.0';

const eventHandlers = new Map();

function sanitizeNumber(value, defaultValue = 0, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

function migrateGameState(loadedGame) {
  try {
    localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(loadedGame));
  } catch (e) {
    console.warn("Failed to create migration backup:", e);
  }
  
  const defaultGame = {
    version: CURRENT_VERSION,
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
  };

  const migrated = JSON.parse(JSON.stringify(defaultGame));
  
  try {
    for (const key in loadedGame) {
      if (loadedGame[key] !== undefined && loadedGame[key] !== null) {
        if (typeof loadedGame[key] === 'object' && !Array.isArray(loadedGame[key])) {
          migrated[key] = { ...migrated[key], ...loadedGame[key] };
        } else {
          migrated[key] = loadedGame[key];
        }
      }
    }
  } catch (e) {
    console.error("Error during migration:", e);
  }
  
  if (!migrated.bots || typeof migrated.bots !== 'object') {
    migrated.bots = { t1:0, t2:0, t3:0, mobile:0 };
  }
  if (!migrated.skills || typeof migrated.skills !== 'object') {
    migrated.skills = { tiers:0, prices:0, generation:0, automation:0 };
  }
  if (!migrated.unlocks || typeof migrated.unlocks !== 'object') {
    migrated.unlocks = { mobile:false };
  }
  if (!migrated.clickCooldowns || typeof migrated.clickCooldowns !== 'object') {
    migrated.clickCooldowns = {};
  }
  if (!Array.isArray(migrated.moneyGraph)) {
    migrated.moneyGraph = [];
  }
  
  migrated.version = CURRENT_VERSION;
  
  return migrated;
}

function checkStorageHealth() {
  try {
    const testKey = 'storage_test_' + Date.now();
    const testData = 'x'.repeat(1024 * 10);
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn("Storage may be full or corrupted:", e);
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('backup') || key.includes('migration'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });
    } catch (e) {
      console.error("Failed to clean storage:", e);
    }
    return false;
  }
}

function validateGameState() {
  const requiredProperties = [
    'bots', 'money', 'prestige', 'skills', 'tools', 'upgrades', 
    'prices', 'achievements', 'unlocks', 'totalClicks', 'totalEarned',
    'totalBotsSold'
  ];
  
  try {
    for (const prop of requiredProperties) {
      if (game[prop] === undefined) {
        switch (prop) {
          case 'bots':
            game.bots = { t1:0, t2:0, t3:0, mobile:0 };
            break;
          case 'skills':
            game.skills = { tiers:0, prices:0, generation:0, automation:0 };
            break;
          case 'tools':
            game.tools = {};
            break;
          case 'upgrades':
            game.upgrades = {};
            break;
          case 'prices':
            game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
            break;
          case 'achievements':
            game.achievements = {};
            break;
          case 'unlocks':
            game.unlocks = { mobile:false };
            break;
          case 'money':
          case 'prestige':
          case 'totalClicks':
          case 'totalEarned':
          case 'totalBotsSold':
            game[prop] = 0;
            break;
        }
      }
    }
    
    const numericProps = ['money', 'prestige', 'totalClicks', 'totalEarned', 'totalBotsSold'];
    for (const prop of numericProps) {
      game[prop] = sanitizeNumber(game[prop], 0, 0);
    }
    
    const botTiers = ['t1', 't2', 't3', 'mobile'];
    for (const tier of botTiers) {
      game.bots[tier] = sanitizeNumber(game.bots[tier], 0, 0);
    }
    
    const skillKeys = ['tiers', 'prices', 'generation', 'automation'];
    for (const skill of skillKeys) {
      game.skills[skill] = sanitizeNumber(game.skills[skill], 0, 0);
    }
    
    const priceTiers = ['t1', 't2', 't3', 'mobile'];
    for (const tier of priceTiers) {
      const defaults = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
      game.prices[tier] = sanitizeNumber(game.prices[tier], defaults[tier] || 1, 0.01, 100);
    }
  } catch (e) {
    console.error("Error validating game state:", e);
  }
}

function cleanupEventListeners() {
  eventHandlers.forEach((handler, key) => {
    try {
      const [target, event] = key.split(':');
      if (target === 'window') {
        window.removeEventListener(event, handler);
      } else if (target === 'document') {
        document.removeEventListener(event, handler);
      } else {
        const el = document.getElementById(target);
        if (el) {
          el.removeEventListener(event, handler);
        }
      }
    } catch (e) {
      console.error("Error cleaning up listener:", e);
    }
  });
  eventHandlers.clear();
}

function addTrackedListener(target, event, handler, options) {
  try {
    const key = `${target}:${event}`;
    const targetObj = target === 'window' ? window : target === 'document' ? document : document.getElementById(target);
    
    if (targetObj) {
      targetObj.addEventListener(event, handler, options);
      eventHandlers.set(key, handler);
    }
  } catch (e) {
    console.error("Error adding listener:", e);
  }
}

window.addEventListener('load', () => {
  try {
    if (!checkStorageHealth()) {
      console.warn("Storage issues detected, attempting recovery...");
    }
    
    if (localStorage.getItem(MIGRATION_LOCK_KEY)) {
      console.warn("Migration was interrupted, restoring from backup...");
      const backup = localStorage.getItem(MIGRATION_BACKUP_KEY);
      if (backup) {
        try {
          localStorage.setItem(SAVE_KEY, backup);
          localStorage.removeItem(MIGRATION_LOCK_KEY);
          localStorage.removeItem(MIGRATION_BACKUP_KEY);
          setTimeout(() => location.reload(), 100);
          return;
        } catch (e) {
          console.error("Failed to restore from backup:", e);
        }
      }
    }
    
    const saved = localStorage.getItem(SAVE_KEY);
    const savedVersion = localStorage.getItem(VERSION_KEY);
    
    let migrationPerformed = false;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const loadedVersion = parsed.version || '1.0.0';
        
        localStorage.setItem(MIGRATION_LOCK_KEY, 'true');
        
        if (loadedVersion !== CURRENT_VERSION) {
          const confirmation = confirm(
            `New update detected (${loadedVersion} → ${CURRENT_VERSION})! Your save data needs to be migrated.\n\n` +
            "Click OK to migrate (recommended)\n" +
            "Click Cancel to reset and start fresh\n\n" +
            "Note: A backup will be created automatically."
          );
          
          if (confirmation) {
            const migratedGame = migrateGameState(parsed);
            Object.assign(game, migratedGame);
            
            localStorage.setItem(SAVE_KEY, JSON.stringify(game));
            localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
            
            localStorage.removeItem(MIGRATION_LOCK_KEY);
            localStorage.removeItem(MIGRATION_BACKUP_KEY);
            
            alert("Save data migrated successfully!");
            migrationPerformed = true;
            saveGame();
            
            setTimeout(() => location.reload(), 100);
            return;
          } else {
            localStorage.removeItem(MIGRATION_LOCK_KEY);
            localStorage.removeItem(MIGRATION_BACKUP_KEY);
            resetGame();
            return;
          }
        } else {
          Object.assign(game, parsed);
        }
        
        localStorage.removeItem(MIGRATION_LOCK_KEY);
        
      } catch (e) {
        console.error("Error loading save:", e);
        
        const backup = localStorage.getItem(MIGRATION_BACKUP_KEY);
        if (backup) {
          try {
            localStorage.setItem(SAVE_KEY, backup);
            console.log("Restored corrupted save from backup");
          } catch (restoreError) {
            console.error("Failed to restore:", restoreError);
          }
        }
        
        localStorage.removeItem(MIGRATION_LOCK_KEY);
        resetGame();
        return;
      }
    }
    
    if (!game.prices || game.prices.t1 === 1) {
      rollPrices();
    }
    
    if (!migrationPerformed && saved) {
      resetSpread();
      
      if (!game.priceTime) {
        game.priceTime = Date.now();
      }
      
      if (game.priceDirection === undefined) {
        game.priceDirection = 0;
      }
      
      if (game.eventAcknowledged === undefined) {
        game.eventAcknowledged = false;
      }
      
      if (game.tutorialComplete === undefined) {
        game.tutorialComplete = false;
      }
      
      saveGame();
    }
    
    if (!game.prices || typeof game.prices !== 'object') {
      game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
      game.priceTime = Date.now();
    }
	
	processOfflineProgress(
      game, 
      calculateBPS, 
      calculateMPS,
      () => getCryptoMiningInstance ? getCryptoMiningInstance() : null
    );
    
    validateGameState();
	initCryptoAfterGameLoad();
	initOfflineSystem();
    
    if (game.activeEvent && !game.eventAcknowledged) {
      setTimeout(() => {
        if (game.activeEvent && !game.eventAcknowledged) {
          game.eventAcknowledged = true;
          game.eventEndTime = Date.now() + (game.eventDuration || 90000);
          saveGame();
        }
      }, 5000);
    }
    
    game.lastTick = Date.now();
    if (!game.lastGraphSample) game.lastGraphSample = Date.now();
    
    initUICosts();
    render();
    
    setInterval(() => {
      try {
        gameUpdate();
        triggerEvent();
        render();
      } catch (e) {
        console.error("Error in game loop:", e);
      }
    }, 100);
    
    setupEventListeners();
    
    if (!game.tutorialComplete) {
      setTimeout(showTutorial, 500);
    }
  } catch (e) {
    console.error("Critical error in initialization:", e);
    alert("Failed to initialize game. Please refresh the page.");
  }
});

addTrackedListener('window', 'beforeunload', saveGame);
addTrackedListener('document', 'visibilitychange', () => {
  if (document.hidden) saveGame();
});

const spreadBtn = document.getElementById('spreadBtn');
if (spreadBtn) {
  spreadBtn.addEventListener('mousedown', startSpread);
  spreadBtn.addEventListener('mouseup', stopSpread);
  spreadBtn.addEventListener('mouseleave', stopSpread);
  spreadBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startSpread();
  }, { passive: false });
  spreadBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopSpread();
  }, { passive: false });
}

const buttonMappings = [
  { id: 'prestigeBtn', handler: prestigeReset },
  { id: 'exportBtn', handler: exportSave },
  { id: 'importBtn', handler: importSave },
  { id: 'tutorialBtn', handler: showTutorial },
  { id: 'resetBtn', handler: () => {
    if (confirm('Permanently delete all data?')) resetGame();
  }}
];

buttonMappings.forEach(({ id, handler }) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', handler);
  }
});

let cleanedUp = false;
function cleanupOnce() {
  if (!cleanedUp) {
    cleanupEventListeners();
    cleanedUp = true;
  }
}

addTrackedListener('window', 'pagehide', cleanupOnce);
addTrackedListener('window', 'beforeunload', cleanupOnce);

window.game = game;
window.render = render;
window.spread = spread;
window.sell = sell;
window.sellCustom = sellCustom;
window.buyUpgrade = buyUpgrade;
window.buyTool = buyTool;
window.clickTool = clickTool;
window.upgrade = upgrade;
window.prestigeReset = prestigeReset;
window.showTutorial = showTutorial;
window.closeTutorial = closeTutorial;
window.showEvent = showEvent;
window.acknowledgeEvent = acknowledgeEvent;
window.exportSave = exportSave;
window.importSave = importSave;
window.resetGame = resetGame;
window.enterSlots = enterSlots;