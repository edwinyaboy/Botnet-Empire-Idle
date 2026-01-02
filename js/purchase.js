import { game, saveGame } from './state.js';
import { getAchievementBonus } from './bots.js';
import { getPrestigeBonus } from './gameLoop.js';

let sellInProgress = false;
const MAX_SAFE_INTEGER = 9007199254740991;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

export function sell(tier, amount) {
  if (sellInProgress) {
    console.warn("Sell operation already in progress");
    return false;
  }

  try {
    sellInProgress = true;

    if (typeof tier !== 'string' || !['t1', 't2', 't3', 'mobile'].includes(tier)) {
      console.error("Invalid tier:", tier);
      return false;
    }

    amount = sanitizeNumber(amount, 0, 0, MAX_SAFE_INTEGER);
    amount = Math.floor(amount);

    if (amount === 0 || amount < 0) {
      return false;
    }

    if (!game.bots || typeof game.bots[tier] !== 'number') {
      console.error("Invalid bot tier in game state");
      return false;
    }

    const availableBots = Math.floor(sanitizeNumber(game.bots[tier], 0, 0, MAX_SAFE_INTEGER));
    
    if (availableBots < amount) {
      console.warn("Insufficient bots for sale");
      return false;
    }

    if (amount > 50000000) {
      if (!confirm(`Sell ${amount.toLocaleString()} ${tier.toUpperCase()} hacked computers?`)) {
        return false;
      }
    }

    if (!game.prices || typeof game.prices[tier] !== 'number') {
      console.error("Invalid price data");
      return false;
    }

    const snapshot = {
      bots: game.bots[tier],
      money: game.money,
      totalEarned: game.totalEarned,
      totalBotsSold: game.totalBotsSold
    };

    try {
      let priceBonus = 1;
      if (game.skills && typeof game.skills.prices === 'number') {
        priceBonus = 1 + sanitizeNumber(game.skills.prices, 0, 0, 10000) * 0.03;
      }

      const prestigeBonus = 1 + sanitizeNumber(getPrestigeBonus(), 0, 0, 1000) * 0.10;
      const achievementBonus = sanitizeNumber(getAchievementBonus("income"), 1, 1, 100);
      const basePrice = sanitizeNumber(game.prices[tier], 0.01, 0.01, 1000);

      let earned = amount * basePrice * priceBonus * prestigeBonus * achievementBonus;
      earned = sanitizeNumber(earned, 0, 0, MAX_SAFE_INTEGER);

      if (!isFinite(earned) || earned < 0) {
        throw new Error("Invalid earned amount calculated");
      }

      game.bots[tier] = sanitizeNumber(game.bots[tier] - amount, 0, 0, MAX_SAFE_INTEGER);
      game.totalBotsSold = sanitizeNumber(game.totalBotsSold + amount, 0, 0, MAX_SAFE_INTEGER);
      game.money = sanitizeNumber(game.money + earned, 0, 0, MAX_SAFE_INTEGER);
      game.totalEarned = sanitizeNumber(game.totalEarned + earned, 0, 0, MAX_SAFE_INTEGER);

      if (game.bots[tier] < 0 || game.money < 0 || game.totalEarned < 0 || game.totalBotsSold < 0) {
        throw new Error("Transaction resulted in negative values");
      }

      saveGame();
      return true;

    } catch (e) {
      console.error("Transaction failed, rolling back:", e);
      game.bots[tier] = snapshot.bots;
      game.money = snapshot.money;
      game.totalEarned = snapshot.totalEarned;
      game.totalBotsSold = snapshot.totalBotsSold;
      return false;
    }

  } catch (e) {
    console.error("Critical error in sell():", e);
    return false;
  } finally {
    sellInProgress = false;
  }
}

export function sellCustom(tier) {
  try {
    const input = document.getElementById(`sell_custom_${tier}`);
    if (!input || !input.value) {
      return false;
    }

    let amount = parseInt(input.value, 10);
    
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      input.value = "";
      return false;
    }

    amount = Math.min(amount, Math.floor(sanitizeNumber(game.bots[tier], 0, 0, MAX_SAFE_INTEGER)));
    
    if (amount > 0) {
      const success = sell(tier, amount);
      if (success) {
        input.value = "";
      }
      return success;
    }

    return false;
  } catch (e) {
    console.error("Error in sellCustom():", e);
    return false;
  }
}