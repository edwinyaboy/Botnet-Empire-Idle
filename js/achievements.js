import { game } from './state.js';
import { getTotalBots } from './bots.js';
import { calculateBPS } from './gameLoop.js';

function safeCheck(checkFn) {
  return () => {
    try {
      if (typeof checkFn !== 'function') return false;
      const result = checkFn();
      return Boolean(result);
    } catch (e) {
      console.error("Achievement check failed:", e);
      return false;
    }
  };
}

function safeGetNumber(obj, path, defaultValue = 0) {
  try {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value;
    }
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function safeBoolCheck(obj, path) {
  try {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false;
      }
    }
    return Boolean(value);
  } catch (e) {
    return false;
  }
}

export const achievements = [
  { 
    id:"first_pc", 
    text:"Boot Sequence", 
    reward:"generation", 
    bonus:0.01, 
    check: safeCheck(() => safeBoolCheck(game, 'upgrades.buildPC'))
  },
  { 
    id:"first_clicks", 
    text:"Hands On Keyboard", 
    reward:"click", 
    bonus:0.05, 
    check: safeCheck(() => safeGetNumber(game, 'totalClicks') >= 50)
  },
  { 
    id:"clicks_200", 
    text:"Manual Operator", 
    reward:"click", 
    bonus:0.10, 
    check: safeCheck(() => safeGetNumber(game, 'totalClicks') >= 200)
  },
  { 
    id:"clicks_1000", 
    text:"Human Amplifier", 
    reward:"click", 
    bonus:0.15, 
    check: safeCheck(() => safeGetNumber(game, 'totalClicks') >= 1000)
  },
  { 
    id:"clicks_5000", 
    text:"Relentless Execution", 
    reward:"click", 
    bonus:0.20, 
    check: safeCheck(() => safeGetNumber(game, 'totalClicks') >= 5000)
  },
  { 
    id:"first_sale", 
    text:"First Transaction", 
    reward:"income", 
    bonus:0.01, 
    check: safeCheck(() => safeGetNumber(game, 'totalBotsSold') > 0)
  },
  { 
    id:"sell_1k", 
    text:"Small Batch Seller", 
    reward:"income", 
    bonus:0.01, 
    check: safeCheck(() => safeGetNumber(game, 'totalBotsSold') >= 1000)
  },
  { 
    id:"sell_100k", 
    text:"Wholesale Dealer", 
    reward:"income", 
    bonus:0.02, 
    check: safeCheck(() => safeGetNumber(game, 'totalBotsSold') >= 100000)
  },
  { 
    id:"sell_1m", 
    text:"Industrial Scale", 
    reward:"income", 
    bonus:0.03, 
    check: safeCheck(() => safeGetNumber(game, 'totalBotsSold') >= 1e6)
  },
  { 
    id:"bots_1k", 
    text:"Network Seeded", 
    reward:"generation", 
    bonus:0.01, 
    check: safeCheck(() => getTotalBots() >= 1000)
  },
  { 
    id:"bots_10k", 
    text:"Expanding Mesh", 
    reward:"generation", 
    bonus:0.015, 
    check: safeCheck(() => getTotalBots() >= 10000)
  },
  { 
    id:"bots_100k", 
    text:"Autonomous Network", 
    reward:"generation", 
    bonus:0.02, 
    check: safeCheck(() => getTotalBots() >= 100000)
  },
  { 
    id:"bots_1m", 
    text:"Distributed Control", 
    reward:"generation", 
    bonus:0.025, 
    check: safeCheck(() => getTotalBots() >= 1e6)
  },
  { 
    id:"bots_10m", 
    text:"Global Presence", 
    reward:"generation", 
    bonus:0.03, 
    check: safeCheck(() => getTotalBots() >= 1e7)
  },
  { 
    id:"bots_1b", 
    text:"Planetary Scale", 
    reward:"generation", 
    bonus:0.03, 
    check: safeCheck(() => getTotalBots() >= 1e9)
  },
  { 
    id:"bps_25", 
    text:"Passive Stream", 
    reward:"generation", 
    bonus:0.01, 
    check: safeCheck(() => calculateBPS() >= 25)
  },
  { 
    id:"bps_100", 
    text:"Automated Engine", 
    reward:"generation", 
    bonus:0.015, 
    check: safeCheck(() => calculateBPS() >= 100)
  },
  { 
    id:"bps_1000", 
    text:"Self-Sustaining Grid", 
    reward:"generation", 
    bonus:0.02, 
    check: safeCheck(() => calculateBPS() >= 1000)
  },
  { 
    id:"tools_1", 
    text:"First Exploit", 
    reward:"generation", 
    bonus:0.01, 
    check: safeCheck(() => {
      return game.tools && typeof game.tools === 'object' && Object.keys(game.tools).length >= 1;
    })
  },
  { 
    id:"tools_5", 
    text:"Toolchain Built", 
    reward:"income", 
    bonus:0.02, 
    check: safeCheck(() => {
      return game.tools && typeof game.tools === 'object' && Object.keys(game.tools).length >= 5;
    })
  },
  { 
    id:"tools_10", 
    text:"Operational Suite", 
    reward:"generation", 
    bonus:0.025, 
    check: safeCheck(() => {
      return game.tools && typeof game.tools === 'object' && Object.keys(game.tools).length >= 10;
    })
  },
  { 
    id:"tools_20", 
    text:"Black Market Arsenal", 
    reward:"income", 
    bonus:0.03, 
    check: safeCheck(() => {
      return game.tools && typeof game.tools === 'object' && Object.keys(game.tools).length >= 20;
    })
  },
  { 
    id:"upgrades_5", 
    text:"Hardware Optimized", 
    reward:"generation", 
    bonus:0.015, 
    check: safeCheck(() => {
      return game.upgrades && typeof game.upgrades === 'object' && Object.keys(game.upgrades).length >= 5;
    })
  },
  { 
    id:"upgrades_10", 
    text:"Overclocked", 
    reward:"generation", 
    bonus:0.02, 
    check: safeCheck(() => {
      return game.upgrades && typeof game.upgrades === 'object' && Object.keys(game.upgrades).length >= 10;
    })
  },
  { 
    id:"mobile_unlock", 
    text:"Mobile Expansion", 
    reward:"generation", 
    bonus:0.02, 
    check: safeCheck(() => safeBoolCheck(game, 'unlocks.mobile'))
  },
  { 
    id:"earn_100k", 
    text:"Cash Flow Positive", 
    reward:"income", 
    bonus:0.01, 
    check: safeCheck(() => safeGetNumber(game, 'totalEarned') >= 100000)
  },
  { 
    id:"earn_1m", 
    text:"Underground Profits", 
    reward:"income", 
    bonus:0.02, 
    check: safeCheck(() => safeGetNumber(game, 'totalEarned') >= 1e6)
  },
  { 
    id:"earn_10m", 
    text:"Dark Web Tycoon", 
    reward:"income", 
    bonus:0.03, 
    check: safeCheck(() => safeGetNumber(game, 'totalEarned') >= 1e7)
  },
  { 
    id:"prestige_1", 
    text:"System Reset", 
    reward:"prestige", 
    bonus:1, 
    check: safeCheck(() => safeGetNumber(game, 'prestige') >= 1)
  },
  { 
    id:"prestige_3", 
    text:"Refined Loop", 
    reward:"prestige", 
    bonus:1, 
    check: safeCheck(() => safeGetNumber(game, 'prestige') >= 3)
  },
  { 
    id:"prestige_5", 
    text:"Perfected Cycle", 
    reward:"prestige", 
    bonus:1, 
    check: safeCheck(() => safeGetNumber(game, 'prestige') >= 5)
  },
  {
    id:"hidden_idle",
    hidden:true,
    text:"Silent Operator",
    reward:"generation",
    bonus:0.01,
    check: safeCheck(() => {
      return safeGetNumber(game, 'totalClicks') === 0 && calculateBPS() >= 25;
    })
  },
    {
    id:"hidden_first_ddos",
    hidden:true,
    text:"First Real Disruption",
    reward:"income",
    bonus:0.01,
    check: safeCheck(() => {
      return safeBoolCheck(game, 'tools.miniDdos') || safeBoolCheck(game, 'tools.ddos');
    })
  },
  {
    id:"impulse_buyer",
    hidden:true,
    text:"Impulse Buyer",
    reward:"special",
    check: safeCheck(() => {
      return getTotalBots() < 1000000 && safeGetNumber(game, 'totalEarned') >= 10000000;
    })
  },
  {
    id:"paid_for_knowledge",
    hidden:true,
    text:"Paid for Knowledge",
    reward:"special",
    check: safeCheck(() => {
      return getTotalBots() < 50000 && safeGetNumber(game, 'totalClicks') >= 500;
    })
  }
];