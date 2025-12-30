import { game, saveGame } from './state.js';
import { showTutorial, closeTutorial } from './tutorial.js';
import { spread, startSpread, stopSpread } from './bots.js';
import { sell, sellCustom } from './purchase.js';
import { buyUpgrade, buyTool } from './upgrades.js';
import { clickTool } from './tools.js';
import { prestigeReset } from './prestige.js';
import { showEvent, acknowledgeEvent, triggerEvent } from './events.js';
import { render, update, setupEventListeners } from './ui.js';
import { exportSave, importSave, resetGame } from './gameLoop.js';

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
  render();
  setInterval(update, 100);
  update();
  
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

document.getElementById('prestigeBtn').addEventListener('click', prestigeReset);
document.getElementById('exportBtn').addEventListener('click', exportSave);
document.getElementById('importBtn').addEventListener('click', importSave);
document.getElementById('tutorialBtn').addEventListener('click', showTutorial);

// Use the imported resetGame function
document.getElementById('resetBtn').addEventListener('click', () => {
  if(confirm('Permanently delete all data?')) resetGame();
});

window.game = game;
window.render = render;
window.spread = spread;
window.sell = sell;
window.sellCustom = sellCustom;
window.buyUpgrade = buyUpgrade;
window.buyTool = buyTool;
window.clickTool = clickTool;
window.prestigeReset = prestigeReset;
window.showTutorial = showTutorial;
window.closeTutorial = closeTutorial;
window.showEvent = showEvent;
window.acknowledgeEvent = acknowledgeEvent;
window.exportSave = exportSave;
window.importSave = importSave;
window.resetGame = resetGame;