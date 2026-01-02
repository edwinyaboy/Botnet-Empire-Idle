import { game } from './state.js';
import { achievements } from './achievements.js';

export let spreadHeld = false;
export let spreadInterval = null;
export let spreadClickInProgress = false;
export let lastSpreadTime = 0;

const SPREAD_COOLDOWN = 100;
const CLICK_DEBOUNCE = 50;

export function resetSpread() {
  spreadHeld = false;
  if (spreadInterval) {
    clearInterval(spreadInterval);
  }
  spreadInterval = null;
  spreadClickInProgress = false;
  lastSpreadTime = 0;
}

export function spread() {
  const now = Date.now();

  if (!game || typeof game.activeEvent === 'undefined') {
    console.error("Game state corrupted in spread()");
    return;
  }
  
  if (game.activeEvent && !game.eventAcknowledged) return;
  if (now - lastSpreadTime < SPREAD_COOLDOWN) return;
  if (spreadClickInProgress) return;
  
  spreadClickInProgress = true;
  lastSpreadTime = now;
  
  try {
    if (typeof game.totalClicks !== 'number' || isNaN(game.totalClicks)) {
      game.totalClicks = 0;
    }
    game.totalClicks++;
    
    const tiersSkill = (game.skills && typeof game.skills.tiers === 'number' && !isNaN(game.skills.tiers)) 
      ? game.skills.tiers : 0;
    const tierBonus = Math.max(0, tiersSkill * 0.05);
    
    let roll = Math.random();
    roll = Math.min(1, roll + tierBonus);
    
    let clickMult = 1;
    try {
      const achievementBonus = getAchievementBonus("click");
      if (typeof achievementBonus === 'number' && !isNaN(achievementBonus)) {
        clickMult *= achievementBonus;
      }
      
      if (game.upgrades && typeof game.upgrades === 'object') {
        for (const id in game.upgrades) {
          if (game.upgrades[id] && upgrades[id] && upgrades[id].effect === "click_multiplier") {
            const upgradeValue = upgrades[id].value || 0;
            clickMult *= 1 + upgradeValue;
          }
        }
      }
    } catch (e) {
      console.error("Error calculating click multiplier:", e);
      clickMult = 1;
    }

    if (!isFinite(clickMult) || clickMult < 1) {
      clickMult = 1;
    }

    const amount = Math.max(1, Math.floor(10 * clickMult));
    
    const mobileUnlocked = (game.unlocks && game.unlocks.mobile === true);

    if (!game.bots || typeof game.bots !== 'object') {
      game.bots = { t1: 0, t2: 0, t3: 0, mobile: 0 };
    }
    
    ['t1', 't2', 't3', 'mobile'].forEach(tier => {
      if (typeof game.bots[tier] !== 'number' || isNaN(game.bots[tier]) || !isFinite(game.bots[tier])) {
        game.bots[tier] = 0;
      }
    });
    
    if (mobileUnlocked && roll > 0.98) {
      game.bots.mobile = Math.floor(game.bots.mobile + amount);
    } else if (roll > 0.94) {
      game.bots.t1 = Math.floor(game.bots.t1 + amount);
    } else if (roll > 0.72) {
      game.bots.t2 = Math.floor(game.bots.t2 + amount);
    } else {
      game.bots.t3 = Math.floor(game.bots.t3 + amount);
    }
  } catch (e) {
    console.error("Critical error in spread():", e);
  } finally {
    setTimeout(() => { 
      spreadClickInProgress = false; 
    }, CLICK_DEBOUNCE);
  }
}

export function startSpread() {
  if (!spreadHeld) {
    spread();
    spreadHeld = true;
    if (spreadInterval) {
      clearInterval(spreadInterval);
    }
    spreadInterval = setInterval(() => { 
      if (spreadHeld) {
        spread(); 
      }
    }, 200);
  }
}

export function stopSpread() {
  spreadHeld = false;
  if (spreadInterval) {
    clearInterval(spreadInterval);
    spreadInterval = null;
  }
}

export function getTotalBots() {
  try {
    if (!game.bots || typeof game.bots !== 'object') {
      return 0;
    }
    
    const t1 = (typeof game.bots.t1 === 'number' && isFinite(game.bots.t1)) ? game.bots.t1 : 0;
    const t2 = (typeof game.bots.t2 === 'number' && isFinite(game.bots.t2)) ? game.bots.t2 : 0;
    const t3 = (typeof game.bots.t3 === 'number' && isFinite(game.bots.t3)) ? game.bots.t3 : 0;
    const mobile = (typeof game.bots.mobile === 'number' && isFinite(game.bots.mobile)) ? game.bots.mobile : 0;
    
    const total = t1 + t2 + t3 + mobile;
    return isFinite(total) ? Math.max(0, total) : 0;
  } catch (e) {
    console.error("Error in getTotalBots():", e);
    return 0;
  }
}

export function getAchievementBonus(type) {
  try {
    let bonus = 1;
    if (!Array.isArray(achievements)) {
      return bonus;
    }
    
    for (const a of achievements) {
      if (game.achievements && game.achievements[a.id] && a.reward === type && typeof a.bonus === 'number') {
        bonus += a.bonus;
      }
    }
    
    return Math.max(1, bonus);
  } catch (e) {
    console.error("Error in getAchievementBonus():", e);
    return 1;
  }
}