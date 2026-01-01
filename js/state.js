export const SAVE_KEY = "botnet_empire_v1";
export const GRAPH_SAMPLE_INTERVAL = 10000;
export const GRAPH_MAX_POINTS = 6048;

export let game = {
  version: '1.1.3',
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
  eventAcknowledged:false
};

export function saveGame() {
  try {
    game.lastTick = Date.now();
    game.version = '1.1.3';
    
    if (!game.bots) game.bots = { t1:0, t2:0, t3:0, mobile:0 };
    if (!game.skills) game.skills = { tiers:0, prices:0, generation:0, automation:0 };
    if (!game.prices) game.prices = { t1:1, t2:0.5, t3:0.15, mobile:1.5 };
    if (!game.unlocks) game.unlocks = { mobile:false };
    if (!game.clickCooldowns) game.clickCooldowns = {};
    if (!game.moneyGraph) game.moneyGraph = [];
    if (game.eventAcknowledged === undefined) game.eventAcknowledged = false;
    if (game.priceDirection === undefined) game.priceDirection = 0;
    if (!game.priceTime) game.priceTime = Date.now();
    
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch(e) {
    console.error("Error saving game:", e);
  }
}