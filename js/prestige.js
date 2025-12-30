import { game } from './state.js';
import { getTotalBots } from './bots.js';

export function prestigeReset(){
  if(getTotalBots() >= 8.2e9){
    if(!confirm('Prestige will reset all progress except achievements. Continue?')) return;
    
    game.prestige++;
    game.bots = {t1:0, t2:0, t3:0, mobile:0};
    game.money = 0;
    game.totalEarned = 0;
    game.totalBotsSold = 0;
    game.tools = {};
    game.upgrades = {};
    game.clickCooldowns = {};
    game.unlocks.mobile = false;
    game.moneyGraph = [];
    game.activeToolTab = null;
    game.totalClicks = 0;
    game.skills = { tiers:0, prices:0, generation:0, automation:0 };
    game.lastGraphSample = Date.now();
    game.activeEvent = null;
    game.eventEffect = null;
    game.eventEndTime = 0;
    game.eventDuration = null;
    game.eventAcknowledged = false;
    game.nextEventTime = Date.now() + (600000 + Math.random() * 1200000);
  }
}