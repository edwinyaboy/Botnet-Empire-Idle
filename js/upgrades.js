import { game, saveGame } from './state.js';
import { tools } from './tools.js';

export const upgrades = {
  buildPC:{ name:"Brand New Computer", desc:"Your first custom-built desktop for running operations", cost:500, effect:"base_bots", value:2 },
  antenna:{ name:"External WiFi Antenna", desc:"Improves signal reach when expanding your network - Additional 5% Hacked Computers gained per click", cost:2500, effect:"click_multiplier", value:0.05 },
  ramUpgrade:{ name:"High-Speed RAM Kit", desc:"Handles more tasks at once without slowdowns", cost:5000, effect:"base_bots", value:800 },
  ssdUpgrade:{ name:"NVMe Storage Array", desc:"Faster storage speeds up payload execution", cost:20000, effect:"base_bots", value:5500 },
  proxygambit:{ name:"ProxyGambit", desc:"Routes traffic through distant relays to expand safely - Additional 10% Hacked Computers gained per click", cost:40000, effect:"click_multiplier", value:0.10 },
  osHardening:{ name:"Custom Hardened OS", desc:"Streamlined system built for automation workloads", cost:60000, effect:"base_bots", value:7500 },
  networkStack:{ name:"Optimized Network Stack", desc:"Improves data flow and long-term stability", cost:500000, effect:"base_bots", value:80000 },
  serverRack:{ name:"Dedicated Server Rack", desc:"Enterprise hardware massively boosts operations", cost:1500000, effect:"base_bots", value:150000 },
  ai:{ name:"Autonomous Spread Controller", desc:"Smart automation improves manual expansion efficiency - Additional 25% Hacked Computers gained per click", cost:5000000, effect:"click_multiplier", value:0.25 }
};

let purchaseInProgress = false;
let purchaseQueue = Promise.resolve();
const MAX_SAFE_INTEGER = 9007199254740991;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

export function buyUpgrade(id) {
  if (!id || typeof id !== 'string') {
    console.error("Invalid upgrade id");
    return false;
  }

  purchaseQueue = purchaseQueue.then(() => performUpgradePurchase(id));
  return purchaseQueue;
}

async function performUpgradePurchase(id) {
  if (purchaseInProgress) {
    console.warn("Purchase already in progress");
    return false;
  }

  try {
    purchaseInProgress = true;

    if (['tiers', 'prices', 'generation', 'automation'].includes(id)) {
      return await buySkillUpgrade(id);
    }

    const u = upgrades[id];
    if (!u) {
      console.error("Upgrade not found:", id);
      return false;
    }

    if (game.upgrades && game.upgrades[id]) {
      console.warn("Upgrade already owned:", id);
      return false;
    }

    const cost = sanitizeNumber(u.cost, 0, 0, MAX_SAFE_INTEGER);
    const currentMoney = sanitizeNumber(game.money, 0, 0, MAX_SAFE_INTEGER);

    if (currentMoney < cost) {
      return false;
    }

    const snapshot = {
      money: game.money,
      upgrades: game.upgrades ? { ...game.upgrades } : {}
    };

    try {
      if (!game.upgrades) {
        game.upgrades = {};
      }

      game.money = sanitizeNumber(currentMoney - cost, 0, 0, MAX_SAFE_INTEGER);
      game.upgrades[id] = true;

      if (game.money < 0) {
        throw new Error("Negative money after purchase");
      }

      if (typeof window.markUpgradesDirty === 'function') {
        window.markUpgradesDirty();
      }

      return true;

    } catch (e) {
      console.error("Upgrade purchase failed, rolling back:", e);
      game.money = snapshot.money;
      game.upgrades = snapshot.upgrades;
      return false;
    }

  } catch (e) {
    console.error("Critical error in buyUpgrade():", e);
    return false;
  } finally {
    purchaseInProgress = false;
  }
}

async function buySkillUpgrade(id) {
  try {
    const baseCosts = {
      tiers: 5e5,
      prices: 1e6,
      generation: 2e6,
      automation: 5e6
    };

    if (!baseCosts[id]) {
      console.error("Invalid skill:", id);
      return false;
    }

    if (!game.skills) {
      game.skills = { tiers:0, prices:0, generation:0, automation:0 };
    }

    const currentLevel = sanitizeNumber(game.skills[id], 0, 0, 10000);
    const baseCost = baseCosts[id];
    const cost = baseCost * Math.pow(1.6, currentLevel);

    if (!isFinite(cost) || cost < 0) {
      console.error("Invalid skill cost");
      return false;
    }

    const currentMoney = sanitizeNumber(game.money, 0, 0, MAX_SAFE_INTEGER);

    if (currentMoney < cost) {
      return false;
    }

    const snapshot = {
      money: game.money,
      skills: { ...game.skills }
    };

    try {
      game.money = sanitizeNumber(currentMoney - cost, 0, 0, MAX_SAFE_INTEGER);
      game.skills[id] = sanitizeNumber(currentLevel + 1, 0, 0, 10000);

      if (game.money < 0) {
        throw new Error("Negative money after skill purchase");
      }

      saveGame();

      if (typeof window.markSkillsDirty === 'function') {
        window.markSkillsDirty();
      }

      return true;

    } catch (e) {
      console.error("Skill purchase failed, rolling back:", e);
      game.money = snapshot.money;
      game.skills = snapshot.skills;
      return false;
    }

  } catch (e) {
    console.error("Error in buySkillUpgrade():", e);
    return false;
  }
}

export function buyTool(id) {
  if (!id || typeof id !== 'string') {
    console.error("Invalid tool id");
    return false;
  }

  purchaseQueue = purchaseQueue.then(() => performToolPurchase(id));
  return purchaseQueue;
}

async function performToolPurchase(id) {
  if (purchaseInProgress) {
    console.warn("Purchase already in progress");
    return false;
  }

  try {
    purchaseInProgress = true;

    const t = tools[id];
    if (!t) {
      console.error("Tool not found:", id);
      return false;
    }

    if (game.tools && game.tools[id]) {
      console.warn("Tool already owned:", id);
      return false;
    }

    const cost = sanitizeNumber(t.cost, 0, 0, MAX_SAFE_INTEGER);
    const currentMoney = sanitizeNumber(game.money, 0, 0, MAX_SAFE_INTEGER);

    if (currentMoney < cost) {
      return false;
    }

    const snapshot = {
      money: game.money,
      tools: game.tools ? JSON.parse(JSON.stringify(game.tools)) : {},
      unlocks: game.unlocks ? { ...game.unlocks } : { mobile: false }
    };

    try {
      if (!game.tools) {
        game.tools = {};
      }

      game.money = sanitizeNumber(currentMoney - cost, 0, 0, MAX_SAFE_INTEGER);
      game.tools[id] = { active: true, clicks: 0 };

      if (t.unlocks === "mobile") {
        if (!game.unlocks) {
          game.unlocks = { mobile: false };
        }
        game.unlocks.mobile = true;
      }

      if (game.money < 0) {
        throw new Error("Negative money after tool purchase");
      }

      if (typeof window.markMarketplaceDirty === 'function') {
        window.markMarketplaceDirty();
      }

      return true;

    } catch (e) {
      console.error("Tool purchase failed, rolling back:", e);
      game.money = snapshot.money;
      game.tools = snapshot.tools;
      game.unlocks = snapshot.unlocks;
      return false;
    }

  } catch (e) {
    console.error("Critical error in buyTool():", e);
    return false;
  } finally {
    purchaseInProgress = false;
  }
}