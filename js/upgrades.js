import { game, saveGame } from './state.js';
import { tools } from './tools.js';

export const upgrades = {
  buildPC:{ name:"Brand New Computer", desc:"Build your first desktop with top of the line specs", cost:500, effect:"base_bots", value:200000 },
  antenna:{ name:"External WiFi Antenna", desc:"Add an external WiFi antenna, providing more bots each time you spread your network.", cost:2500, type:"bots", base:25 },
  proxygambit:{ name:"ProxyGambit", desc:"This reverse GSM-to-TCP bridge device allows you to proxy from thousands of miles away, giving you even more bots each time you spread your network.", cost:5000, type:"bots", base:150 },
  ramUpgrade:{ name:"High-Speed RAM Kit", desc:"Faster memory allows simultaneous intrusion handling.", cost:10000, effect:"base_bots", value:5 },
  ssdUpgrade:{ name:"NVMe Storage Array", desc:"Rapid payload deployment reduces execution delays.", cost:20000, effect:"base_bots", value:10 },
  osHardening:{ name:"Custom Hardened OS", desc:"Optimized operating system tuned for automation workloads.", cost:60000, effect:"base_bots", value:25 },
  networkStack:{ name:"Optimized Network Stack", desc:"Reduces packet loss and improves sustained bot throughput.", cost:500000, effect:"base_bots", value:150 },
  serverRack:{ name:"Dedicated Server Rack", desc:"Enterprise-grade hardware massively increases baseline operations.", cost:1500000, effect:"base_bots", value:400 },
  ai:{ name:"Autonomous Spread Controller", desc:"AI-assisted decision making maximizes manual expansion efficiency.", cost:5000000, type:"bots", base:12000 }
};

let purchaseInProgress = false;

export function buyUpgrade(id){
  if(purchaseInProgress) return;

  if(['tiers', 'prices', 'generation', 'automation'].includes(id)) {
    const baseCosts = {
      tiers: 5e5,
      prices: 1e6,
      generation: 2e6,
      automation: 5e6
    };
    const baseCost = baseCosts[id];
    const cost = baseCost * Math.pow(1.6, game.skills[id]);
    
    if(game.money >= cost){
      purchaseInProgress = true;
      game.money -= cost;
      game.skills[id]++;
      saveGame();
      
      if (typeof window.markSkillsDirty === 'function') {
        window.markSkillsDirty();
      }
      
      setTimeout(() => { 
        purchaseInProgress = false;
      }, 100);
    }
    return;
  }

  const u = upgrades[id];
  if(!u || game.upgrades[id]) return;

  if(game.money >= u.cost){
    purchaseInProgress = true;
    game.money -= u.cost;
    game.upgrades[id] = true;

    if (typeof window.markUpgradesDirty === 'function') {
      window.markUpgradesDirty();
    }

    setTimeout(() => { 
      purchaseInProgress = false;
    }, 100);
  }
}

export function buyTool(id){
  if(purchaseInProgress) return;

  const t = tools[id];
  if(!t || game.tools[id]) return;

  if(game.money >= t.cost){
    purchaseInProgress = true;
    game.money -= t.cost;
    game.tools[id] = { active: true, clicks: 0 };
    
    if(t.unlocks === "mobile"){
      game.unlocks.mobile = true;
    }
    
    if (typeof window.markMarketplaceDirty === 'function') {
      window.markMarketplaceDirty();
    }
    
    setTimeout(() => {
      purchaseInProgress = false;
    }, 100);
  }
}