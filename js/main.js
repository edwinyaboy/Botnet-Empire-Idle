import { game, saveGame } from './state.js';
import { showTutorial, closeTutorial } from './tutorial.js';
import { spread, startSpread, stopSpread } from './bots.js';
import { sell, sellCustom } from './purchase.js';
import { buyUpgrade, buyTool } from './upgrades.js';
import { clickTool } from './tools.js';
import { prestigeReset } from './prestige.js';
import { showEvent, acknowledgeEvent, triggerEvent } from './events.js';
import { render, setupEventListeners, initUICosts } from './ui.js';
import { exportSave, importSave, resetGame, update as gameUpdate, upgrade } from './gameLoop.js';

export { game };

window.addEventListener('load', () => {
  const saved = localStorage.getItem("botnet_empire_v1");
  if(saved){
    try {
      const parsed = JSON.parse(saved);
      Object.assign(game, parsed);
      
      if(!Array.isArray(game.moneyGraph)) game.moneyGraph = [];
      if(!game.prices || typeof game.prices !== 'object') {
        game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
        game.priceTime = Date.now();
      }
      if(!game.skills) game.skills = { tiers:0, prices:0, generation:0, automation:0 };
      if(!game.upgrades) game.upgrades = {};
      if(!game.tools) game.tools = {};
      if(!game.achievements) game.achievements = {};
    } catch(e) {
      console.error("Error loading save:", e);
    }
  }

  if(!game.prices) {
    game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    game.priceTime = Date.now();
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