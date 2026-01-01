import { game } from './state.js';
import { achievements } from './achievements.js';

export let spreadHeld = false;
export let spreadInterval = null;
export let spreadClickInProgress = false;
export let lastSpreadTime = 0;

export function resetSpread() {
  spreadHeld = false;
  spreadInterval = null;
  spreadClickInProgress = false;
  lastSpreadTime = 0;
}

export function spread() {
  const now = Date.now();

  if (!game || !game.activeEvent === undefined) {
    console.warn("Game state issue in spread()");
    return;
  }
  
  if(game.activeEvent && !game.eventAcknowledged) return;
  if(now - lastSpreadTime < 100) return;
  if(spreadClickInProgress) return;
  
  spreadClickInProgress = true;
  lastSpreadTime = now;
  
  if (typeof game.totalClicks !== 'number') game.totalClicks = 0;
  game.totalClicks++;
  
  const tiersSkill = (game.skills && typeof game.skills.tiers === 'number') ? game.skills.tiers : 0;
  const tierBonus = tiersSkill * 0.05;
  
  let roll = Math.random();
  if (!isNaN(tierBonus)) {
    roll += tierBonus;
  }
  
  let clickMult = 1;
  
  try {
    clickMult *= getAchievementBonus("click");
  } catch (e) {
    console.warn("Error getting achievement bonus:", e);
  }
  
  const amount = Math.floor(10 * clickMult);
  
  const mobileUnlocked = (game.unlocks && game.unlocks.mobile === true);

  if (!game.bots) {
    game.bots = { t1: 0, t2: 0, t3: 0, mobile: 0 };
  }
  
  if (mobileUnlocked && roll > 0.98) {
    if (typeof game.bots.mobile !== 'number') game.bots.mobile = 0;
    game.bots.mobile += amount;
  } else if (roll > 0.94) {
    if (typeof game.bots.t1 !== 'number') game.bots.t1 = 0;
    game.bots.t1 += amount;
  } else if (roll > 0.72) {
    if (typeof game.bots.t2 !== 'number') game.bots.t2 = 0;
    game.bots.t2 += amount;
  } else {
    if (typeof game.bots.t3 !== 'number') game.bots.t3 = 0;
    game.bots.t3 += amount;
  }
  
  setTimeout(() => { spreadClickInProgress = false; }, 50);
}

export function startSpread() {
  if(!spreadHeld){
    spread();
    spreadHeld = true;
    spreadInterval = setInterval(() => { spread(); }, 200);
  }
}

export function stopSpread() {
  spreadHeld = false;
  if(spreadInterval){
    clearInterval(spreadInterval);
    spreadInterval = null;
  }
}

export function getTotalBots() {
  return game.bots.t1 + game.bots.t2 + game.bots.t3 + game.bots.mobile;
}

export function getAchievementBonus(type){
  let bonus = 1;
  for(const a of achievements){
    if(game.achievements[a.id] && a.reward === type) bonus += a.bonus;
  }
  return bonus;
}
