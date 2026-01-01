import { game, saveGame } from './state.js';
import { showTutorial, closeTutorial } from './tutorial.js';
import { spread, startSpread, stopSpread, resetSpread, spreadHeld, spreadInterval, spreadClickInProgress, lastSpreadTime } from './bots.js';
import { sell, sellCustom } from './purchase.js';
import { buyUpgrade, buyTool } from './upgrades.js';
import { clickTool } from './tools.js';
import { prestigeReset } from './prestige.js';
import { showEvent, acknowledgeEvent, triggerEvent } from './events.js';
import { render, setupEventListeners, initUICosts } from './ui.js';
import { exportSave, importSave, resetGame, update as gameUpdate, rollPrices, upgrade } from './gameLoop.js';
import { enterSlots } from './slots.js';

export { game };

function migrateGameState(loadedGame) {
  const currentVersion = '1.1.3';
  const defaultGame = {
    version: currentVersion,
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

  const merged = JSON.parse(JSON.stringify(defaultGame));
  
  for (const key in loadedGame) {
    if (key === 'bots' && loadedGame.bots) {
      merged.bots = { ...merged.bots, ...loadedGame.bots };
    } else if (key === 'skills' && loadedGame.skills) {
      merged.skills = { ...merged.skills, ...loadedGame.skills };
    } else if (key === 'prices' && loadedGame.prices) {
      merged.prices = { ...merged.prices, ...loadedGame.prices };
    } else if (key === 'unlocks' && loadedGame.unlocks) {
      merged.unlocks = { ...merged.unlocks, ...loadedGame.unlocks };
    } else if (key === 'tools' && loadedGame.tools) {
      merged.tools = { ...loadedGame.tools };
    } else if (key === 'upgrades' && loadedGame.upgrades) {
      merged.upgrades = { ...loadedGame.upgrades };
    } else if (key === 'achievements' && loadedGame.achievements) {
      merged.achievements = { ...loadedGame.achievements };
    } else if (key === 'clickCooldowns' && loadedGame.clickCooldowns) {
      merged.clickCooldowns = { ...loadedGame.clickCooldowns };
    } else if (key === 'moneyGraph' && Array.isArray(loadedGame.moneyGraph)) {
      merged.moneyGraph = [...loadedGame.moneyGraph];
    } else if (key in merged && loadedGame[key] !== undefined) {
      merged[key] = loadedGame[key];
    }
  }
  
  if (!merged.bots.t1 && merged.bots.t1 !== 0) merged.bots.t1 = 0;
  if (!merged.bots.t2 && merged.bots.t2 !== 0) merged.bots.t2 = 0;
  if (!merged.bots.t3 && merged.bots.t3 !== 0) merged.bots.t3 = 0;
  if (!merged.bots.mobile && merged.bots.mobile !== 0) merged.bots.mobile = 0;
  
  if (!merged.skills.tiers && merged.skills.tiers !== 0) merged.skills.tiers = 0;
  if (!merged.skills.prices && merged.skills.prices !== 0) merged.skills.prices = 0;
  if (!merged.skills.generation && merged.skills.generation !== 0) merged.skills.generation = 0;
  if (!merged.skills.automation && merged.skills.automation !== 0) merged.skills.automation = 0;
  
  if (typeof merged.money !== 'number' || isNaN(merged.money)) merged.money = 0;
  if (typeof merged.prestige !== 'number' || isNaN(merged.prestige)) merged.prestige = 0;
  if (typeof merged.totalEarned !== 'number' || isNaN(merged.totalEarned)) merged.totalEarned = 0;
  if (typeof merged.totalClicks !== 'number' || isNaN(merged.totalClicks)) merged.totalClicks = 0;
  if (typeof merged.totalBotsSold !== 'number' || isNaN(merged.totalBotsSold)) merged.totalBotsSold = 0;
  
  if (!merged.priceTime || typeof merged.priceTime !== 'number') {
    merged.priceTime = Date.now();
  }
  
  merged.version = currentVersion;
  
  return merged;
}

function validateGameState() {
  const requiredProperties = [
    'bots', 'money', 'prestige', 'skills', 'tools', 'upgrades', 
    'prices', 'achievements', 'unlocks', 'totalClicks', 'totalEarned',
    'totalBotsSold'
  ];
  
  for (const prop of requiredProperties) {
    if (game[prop] === undefined) {
      switch(prop) {
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
    if (typeof game[prop] !== 'number' || isNaN(game[prop])) {
      game[prop] = 0;
    }
  }
  
  const botTiers = ['t1', 't2', 't3', 'mobile'];
  for (const tier of botTiers) {
    if (typeof game.bots[tier] !== 'number' || isNaN(game.bots[tier])) {
      game.bots[tier] = 0;
    }
  }
  
  const skillKeys = ['tiers', 'prices', 'generation', 'automation'];
  for (const skill of skillKeys) {
    if (typeof game.skills[skill] !== 'number' || isNaN(game.skills[skill])) {
      game.skills[skill] = 0;
    }
  }
  
  const priceTiers = ['t1', 't2', 't3', 'mobile'];
  for (const tier of priceTiers) {
    if (typeof game.prices[tier] !== 'number' || isNaN(game.prices[tier])) {
      const defaults = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
      game.prices[tier] = defaults[tier] || 1;
    }
  }
}

window.addEventListener('load', () => {
  const saved = localStorage.getItem("botnet_empire_v1");
  const VERSION_KEY = "botnet_empire_version";
  const CURRENT_VERSION = "1.1.3";
  
  let migrationPerformed = false;
  
  if(saved) {
    try {
      const parsed = JSON.parse(saved);
      const loadedVersion = parsed.version || '1.0.0';
      
      if(loadedVersion !== CURRENT_VERSION) {
        const confirmation = confirm(
          `New update detected (${loadedVersion} → ${CURRENT_VERSION})! Your save data needs to be migrated.\n\n` +
          "Click OK to migrate (recommended)\n" +
          "Click Cancel to reset and start fresh\n\n" +
          "Note: This is a one-time process for major updates."
        );
        
        if(confirmation) {
          const migratedGame = migrateGameState(parsed);
          Object.assign(game, migratedGame);
          localStorage.setItem("botnet_empire_v1", JSON.stringify(game));
          localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
          alert("Save data migrated successfully!");
          migrationPerformed = true;
          saveGame();
        }
      } else {
        Object.assign(game, parsed);
      }
    } catch(e) {
      console.error("Error loading save:", e);
      resetGame();
      return;
    }
  }
  
  if(!game.prices || game.prices.t1 === 1) {
    rollPrices();
  }
  
  if(!migrationPerformed && saved) {
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
    
    if(game.tutorialComplete === undefined) {
      game.tutorialComplete = false;
    }
    
    saveGame();
  }
  
  if(!game.prices) {
    game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    game.priceTime = Date.now();
  }
  
  validateGameState();
  
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
  if(!game.lastGraphSample) game.lastGraphSample = Date.now();
  
  initUICosts();
  render();
  
  setInterval(() => {
    gameUpdate();
    triggerEvent();
    render();
  }, 100);
  
  setupEventListeners();
  
  if(!game.tutorialComplete){
    setTimeout(showTutorial, 500);
  }
});

window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => {
  if(document.hidden) saveGame();
});

const spreadBtn = document.getElementById('spreadBtn');
if (spreadBtn) {
  spreadBtn.addEventListener('mousedown', startSpread);
  spreadBtn.addEventListener('mouseup', stopSpread);
  spreadBtn.addEventListener('mouseleave', stopSpread);
  spreadBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startSpread();
  }, {passive: false});
  spreadBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopSpread();
  }, {passive: false});
}

if (document.getElementById('prestigeBtn')) {
  document.getElementById('prestigeBtn').addEventListener('click', prestigeReset);
}
if (document.getElementById('exportBtn')) {
  document.getElementById('exportBtn').addEventListener('click', exportSave);
}
if (document.getElementById('importBtn')) {
  document.getElementById('importBtn').addEventListener('click', importSave);
}
if (document.getElementById('tutorialBtn')) {
  document.getElementById('tutorialBtn').addEventListener('click', showTutorial);
}
if (document.getElementById('resetBtn')) {
  document.getElementById('resetBtn').addEventListener('click', () => {
    if(confirm('Permanently delete all data?')) resetGame();
  });
}

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