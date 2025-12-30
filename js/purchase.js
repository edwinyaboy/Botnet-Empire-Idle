import { game, saveGame } from './state.js';
import { getAchievementBonus } from './bots.js';
import { getPrestigeBonus } from './gameLoop.js';

export function sell(tier, amount){
  amount = Math.max(0, Math.floor(amount));
  if(amount === 0) return;
  
  if(amount > 50000000){
    if(!confirm(`Sell ${amount.toLocaleString()} ${tier.toUpperCase()} bots?`)) return;
  }
  
  if(game.bots[tier] >= amount){
    game.bots[tier] -= amount;
    game.totalBotsSold += amount;
    
    let priceBonus = 1 + game.skills.prices * 0.03;
    
    const prestigeBonus = 1 + getPrestigeBonus() * 0.10;
    const achievementBonus = getAchievementBonus("income");
    const earned = amount * game.prices[tier] * priceBonus * prestigeBonus * achievementBonus;
    game.money += earned;
    game.totalEarned += earned;
    saveGame();
  }
}

export function sellCustom(tier){
  const input = document.getElementById(`sell_custom_${tier}`);
  if(!input) return;
  
  let amount = parseInt(input.value);
  
  if(isNaN(amount) || amount <= 0) {
    input.value = "";
    return;
  }
  
  amount = Math.min(amount, Math.floor(game.bots[tier]));
  
  if(amount > 0){
    sell(tier, amount);
    input.value = "";
  }
}