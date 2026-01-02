export const SAVE_KEY = "botnet_empire_v1";
export const VERSION_KEY = "botnet_empire_version";
export const GRAPH_SAMPLE_INTERVAL = 10000;
export const GRAPH_MAX_POINTS = 6048;

const MAX_SAFE_INTEGER = 9007199254740991;
const MIN_SAFE_INTEGER = -9007199254740991;

export let game = {
  version: '1.2.0',
  bots: { t1:0, t2:0, t3:0, mobile:0 },
  money:0,
  prestige:0,
  skills:{ tiers:0, prices:0, generation:0, automation:0 },
  tools:{},
  upgrades:{},
  prices:{ t1:1, t2:0.5, t3:0.15, mobile:1.5 },
  priceTime:Date.now(),
  lastSaveTime: 0,
  achievements:{},
  moneyGraph:[],
  unlocks:{ mobile:false },
  clickCooldowns:{},
  lastTick:Date.now(),
  lastGraphSample:Date.now(),
  activeEvent:null,
  eventEndTime:0,
  eventEffect:null,
  eventDuration:null,
  nextEventTime:Date.now() + (300000 + Math.random() * 300000),
  totalEarned:0,
  totalClicks:0,
  totalBotsSold:0,
  activeToolTab:null,
  tutorialComplete:false,
  priceDirection:0,
  eventAcknowledged:false,
  cryptoMiningState: null
};

function sanitizeNumber(value, defaultValue = 0, min = MIN_SAFE_INTEGER, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') {
    return defaultValue;
  }
  if (isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

function sanitizeGameState(state) {
  try {
    if (!state || typeof state !== 'object') {
      return null;
    }

    const cleanState = {};

    const numericProps = ['money', 'prestige', 'totalEarned', 'totalClicks', 'totalBotsSold', 'priceDirection'];
    numericProps.forEach(prop => {
      if (state[prop] !== undefined) {
        cleanState[prop] = sanitizeNumber(state[prop], 
          prop === 'priceDirection' ? 0 : 0, 
          0, 
          prop === 'priceDirection' ? 1 : MAX_SAFE_INTEGER
        );
      }
    });

    if (state.bots && typeof state.bots === 'object') {
      cleanState.bots = {
        t1: sanitizeNumber(state.bots.t1, 0, 0, MAX_SAFE_INTEGER),
        t2: sanitizeNumber(state.bots.t2, 0, 0, MAX_SAFE_INTEGER),
        t3: sanitizeNumber(state.bots.t3, 0, 0, MAX_SAFE_INTEGER),
        mobile: sanitizeNumber(state.bots.mobile, 0, 0, MAX_SAFE_INTEGER)
      };
    }

    if (state.skills && typeof state.skills === 'object') {
      cleanState.skills = {
        tiers: sanitizeNumber(state.skills.tiers, 0, 0, 10000),
        prices: sanitizeNumber(state.skills.prices, 0, 0, 10000),
        generation: sanitizeNumber(state.skills.generation, 0, 0, 10000),
        automation: sanitizeNumber(state.skills.automation, 0, 0, 10000)
      };
    }

    if (state.prices && typeof state.prices === 'object') {
      cleanState.prices = {
        t1: sanitizeNumber(state.prices.t1, 1, 0.01, 100),
        t2: sanitizeNumber(state.prices.t2, 0.5, 0.01, 100),
        t3: sanitizeNumber(state.prices.t3, 0.15, 0.01, 100),
        mobile: sanitizeNumber(state.prices.mobile, 1.5, 0.01, 100)
      };
    }

    if (Array.isArray(state.moneyGraph)) {
      cleanState.moneyGraph = state.moneyGraph
        .filter(v => typeof v === 'number' && isFinite(v))
        .slice(-GRAPH_MAX_POINTS);
    }

    if (state.clickCooldowns && typeof state.clickCooldowns === 'object') {
      cleanState.clickCooldowns = {};
      for (const key in state.clickCooldowns) {
        if (typeof key === 'string' && /^[a-zA-Z0-9_]+$/.test(key)) {
          cleanState.clickCooldowns[key] = sanitizeNumber(state.clickCooldowns[key], 0, 0, 10000);
        }
      }
    }
	
	if (state.cryptoMiningState && typeof state.cryptoMiningState === 'object') {
      cleanState.cryptoMiningState = {
        active: Boolean(state.cryptoMiningState.active),
        mode: state.cryptoMiningState.mode || 'low',
        totalMined: sanitizeNumber(state.cryptoMiningState.totalMined, 0, 0),
        lastUpdate: sanitizeNumber(state.cryptoMiningState.lastUpdate, Date.now())
      };
    }

    const now = Date.now();
    cleanState.priceTime = sanitizeNumber(state.priceTime, now, now - 86400000, now + 86400000);
    cleanState.lastSaveTime = sanitizeNumber(state.lastSaveTime, 0, 0, now);
    cleanState.lastTick = sanitizeNumber(state.lastTick, now, now - 86400000, now);
    cleanState.lastGraphSample = sanitizeNumber(state.lastGraphSample, now, now - 86400000, now);
    cleanState.eventEndTime = sanitizeNumber(state.eventEndTime, 0, 0, now + 86400000);
    cleanState.nextEventTime = sanitizeNumber(state.nextEventTime, now, now, now + 86400000);

    const safeProps = ['version', 'tools', 'upgrades', 'achievements', 'unlocks', 'activeEvent', 'eventEffect', 'activeToolTab', 'tutorialComplete', 'eventAcknowledged', 'eventDuration'];
    safeProps.forEach(prop => {
      if (state[prop] !== undefined) {
        cleanState[prop] = state[prop];
      }
    });

    return cleanState;
  } catch (e) {
    console.error("Error sanitizing game state:", e);
    return null;
  }
}

let saveInProgress = false;
let pendingSave = false;
let saveQueue = Promise.resolve();

export function saveGame() {
  if (saveInProgress) {
    pendingSave = true;
    return;
  }

  saveQueue = saveQueue.then(() => performSave());
}

async function performSave() {
  if (saveInProgress) {
    return;
  }

  saveInProgress = true;
  pendingSave = false;

  try {
    game.lastTick = Date.now();
    game.version = '1.2.0';
    
    if (!game.bots || typeof game.bots !== 'object') {
      game.bots = { t1:0, t2:0, t3:0, mobile:0 };
    }
    if (!game.skills || typeof game.skills !== 'object') {
      game.skills = { tiers:0, prices:0, generation:0, automation:0 };
    }
    if (!game.prices || typeof game.prices !== 'object') {
      game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    }
    if (!game.unlocks || typeof game.unlocks !== 'object') {
      game.unlocks = { mobile:false };
    }
    if (!game.clickCooldowns || typeof game.clickCooldowns !== 'object') {
      game.clickCooldowns = {};
    }
    if (!Array.isArray(game.moneyGraph)) {
      game.moneyGraph = [];
    }
    if (typeof game.eventAcknowledged !== 'boolean') {
      game.eventAcknowledged = false;
    }
    if (typeof game.priceDirection !== 'number') {
      game.priceDirection = 0;
    }
    if (typeof game.priceTime !== 'number') {
      game.priceTime = Date.now();
    }

    const sanitized = sanitizeGameState(game);
    if (!sanitized) {
      throw new Error("Failed to sanitize game state");
    }

    const saveData = JSON.stringify(sanitized);
    
    if (saveData.length > 5000000) {
      console.warn("Save data exceeds 5MB, truncating graph");
      if (Array.isArray(game.moneyGraph) && game.moneyGraph.length > 100) {
        game.moneyGraph = game.moneyGraph.slice(-100);
      }
      return performSave();
    }

    const testKey = 'save_test_' + Date.now();
    try {
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (e) {
      console.error("Storage unavailable, clearing old backups");
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('botnet_backup_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });
    }

    localStorage.setItem(SAVE_KEY, saveData);
    localStorage.setItem(VERSION_KEY, sanitized.version);

  } catch (e) {
    console.error("Critical error saving game:", e);
    
    try {
      const emergency = {
        version: '1.2.0',
        bots: { t1:0, t2:0, t3:0, mobile:0 },
        money: game.money || 0,
        prestige: game.prestige || 0
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(emergency));
    } catch (emergencyError) {
      console.error("Emergency save also failed:", emergencyError);
    }
  } finally {
    saveInProgress = false;
    
    if (pendingSave) {
      setTimeout(() => saveGame(), 100);
    }
  }
}