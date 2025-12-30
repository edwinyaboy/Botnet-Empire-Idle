import { game, saveGame } from './state.js';
import { achievements } from './achievements.js';

let spreadHeld = false;
let spreadInterval = null;
export let spreadClickInProgress = false;
let lastSpreadTime = 0;
const SPREAD_COOLDOWN = 100;

export function spread(){
  const now = Date.now();
  if(game.activeEvent && !game.eventAcknowledged) return;
  
  if(now - lastSpreadTime < SPREAD_COOLDOWN) return;
  if(spreadClickInProgress) return;
  
  spreadClickInProgress = true;
  lastSpreadTime = now;
  
  game.totalClicks++;
  const tierBonus = game.skills.tiers * 0.05;
  const roll = Math.random() + tierBonus;
  
  let clickMult = 1;
  clickMult *= getAchievementBonus("click");
  
  const amount = Math.floor(10 * clickMult);
  
  if(game.unlocks.mobile && roll > 0.98) game.bots.mobile += amount;
  else if(roll > 0.94) game.bots.t1 += amount;
  else if(roll > 0.72) game.bots.t2 += amount;
  else game.bots.t3 += amount;
  
  setTimeout(() => { spreadClickInProgress = false; }, 50);
}

export function startSpread(){
  if(!spreadHeld){
    spread();
    spreadHeld = true;
    spreadInterval = setInterval(() => {
      spread();
    }, 200);
  }
}

export function stopSpread(){
  spreadHeld = false;
  if(spreadInterval){
    clearInterval(spreadInterval);
    spreadInterval = null;
  }
}

export function getTotalBots(){
  return game.bots.t1 + game.bots.t2 + game.bots.t3 + game.bots.mobile;
}
export function getAchievementBonus(type){
  let bonus = 1;
  for(const a of achievements){
    if(game.achievements[a.id] && a.reward === type){
      bonus += a.bonus;
    }
  }
  return bonus;
}