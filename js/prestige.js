import { game } from './state.js';
import { getTotalBots } from './bots.js';

const PRESTIGE_REQUIREMENT = 8.2e9;
const MAX_SAFE_INTEGER = 9007199254740991;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

let prestigeInProgress = false;
let confirmationTimeout = null;

export function prestigeReset() {
  if (prestigeInProgress) {
    console.warn("Prestige already in progress");
    return false;
  }

  try {
    prestigeInProgress = true;

    const totalBots = getTotalBots();
    const sanitizedTotal = sanitizeNumber(totalBots, 0, 0, MAX_SAFE_INTEGER);

    if (sanitizedTotal < PRESTIGE_REQUIREMENT) {
      alert(`You need ${PRESTIGE_REQUIREMENT.toLocaleString()} total hacked computers to prestige. You currently have ${Math.floor(sanitizedTotal).toLocaleString()}.`);
      return false;
    }

    if (confirmationTimeout) {
      clearTimeout(confirmationTimeout);
      confirmationTimeout = null;
    }

    const confirmed = confirm(
      `Prestige will reset:\n\n` +
      `✓ All hacked computers\n` +
      `✓ All money\n` +
      `✓ All tools\n` +
      `✓ All upgrades\n` +
      `✓ All skills\n` +
      `✓ Mobile unlock\n\n` +
      `You will keep:\n` +
      `✓ All achievements\n` +
      `✓ Prestige level +1\n\n` +
      `Continue?`
    );

    if (!confirmed) {
      return false;
    }

    confirmationTimeout = setTimeout(() => {
      const finalConfirmation = confirm(
        `This is your last chance!\n\n` +
        `Really prestige and reset all progress?`
      );

      if (!finalConfirmation) {
        confirmationTimeout = null;
        return;
      }

      performPrestigeReset();
      confirmationTimeout = null;
    }, 100);

    return true;

  } catch (e) {
    console.error("Error in prestigeReset():", e);
    return false;
  } finally {
    setTimeout(() => {
      prestigeInProgress = false;
    }, 200);
  }
}

function performPrestigeReset() {
  try {
    const snapshot = {
      prestige: game.prestige,
      achievements: game.achievements ? { ...game.achievements } : {}
    };

    game.prestige = sanitizeNumber(game.prestige + 1, 0, 0, 10000);

    game.bots = { t1:0, t2:0, t3:0, mobile:0 };
    game.money = 0;
    game.totalEarned = 0;
    game.totalBotsSold = 0;
    game.totalClicks = 0;
    game.tools = {};
    game.upgrades = {};
    game.clickCooldowns = {};
    game.skills = { tiers:0, prices:0, generation:0, automation:0 };
    game.unlocks = { mobile:false };
    game.moneyGraph = [];
    game.activeToolTab = null;
    game.lastGraphSample = Date.now();
    game.activeEvent = null;
    game.eventEffect = null;
    game.eventEndTime = 0;
    game.eventDuration = null;
    game.eventAcknowledged = false;

    const now = Date.now();
    const minWait = 600000;
    const maxWait = 1200000;
    const randomWait = Math.floor(Math.random() * (maxWait - minWait)) + minWait;
    game.nextEventTime = now + randomWait;

    if (game.prestige < snapshot.prestige || game.prestige > 10000) {
      console.error("Prestige value invalid, restoring");
      game.prestige = snapshot.prestige;
      game.achievements = snapshot.achievements;
      return false;
    }

    alert(`Prestige successful! You are now prestige level ${game.prestige}. All progress has been reset but you keep your achievements.`);

    if (typeof window.render === 'function') {
      window.render();
    }

    return true;

  } catch (e) {
    console.error("Critical error in performPrestigeReset():", e);
    alert("Prestige failed! Your progress has been preserved.");
    return false;
  }
}