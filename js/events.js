import { game } from './state.js';

const EVENT_TYPES = ['raid', 'outage', 'boom'];
const MAX_EVENT_DURATION = 300000;

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeNumber(value, defaultValue = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

export function showEvent(event) {
  try {
    const modal = document.getElementById("eventModal");
    if (!modal) {
      console.error("Event modal element not found");
      return;
    }

    if (!event || typeof event !== 'object') {
      console.error("Invalid event object");
      return;
    }

    if (!event.title || !event.text) {
      console.error("Event missing required properties");
      return;
    }

    const safeTitle = sanitizeString(event.title);
    const safeText = sanitizeString(event.text);

    modal.style.display = 'block';
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'pointer-events: all; display: flex;';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal';
    modalContent.onclick = (e) => e.stopPropagation();

    const titleDiv = document.createElement('div');
    titleDiv.className = 'modal-title';
    titleDiv.textContent = event.title;

    const textDiv = document.createElement('div');
    textDiv.className = 'modal-content';
    textDiv.textContent = event.text;

    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = 'Acknowledge';
    button.onclick = (e) => {
      acknowledgeEvent();
      e.stopPropagation();
    };

    modalContent.appendChild(titleDiv);
    modalContent.appendChild(textDiv);
    modalContent.appendChild(button);
    overlay.appendChild(modalContent);
    
    modal.innerHTML = '';
    modal.appendChild(overlay);

  } catch (e) {
    console.error("Error displaying event modal:", e);
  }
}

export function acknowledgeEvent() {
  try {
    if (!game.activeEvent) {
      console.warn("No active event to acknowledge");
      return false;
    }

    game.eventAcknowledged = true;
    
    const duration = sanitizeNumber(game.eventDuration, 90000, 0, MAX_EVENT_DURATION);
    game.eventEndTime = Date.now() + duration;

    const modal = document.getElementById("eventModal");
    if (modal) {
      modal.innerHTML = "";
      modal.style.display = 'none';
    }

    return true;
  } catch (e) {
    console.error("Error acknowledging event:", e);
    return false;
  }
}

export function triggerEvent() {
  try {
    const now = Date.now();
    
    if (game.activeEvent && game.eventAcknowledged) {
      const endTime = sanitizeNumber(game.eventEndTime, 0, 0, now + MAX_EVENT_DURATION);
      if (now >= endTime) {
        game.activeEvent = null;
        game.eventEffect = null;
        game.eventAcknowledged = false;
        game.eventDuration = null;
        game.eventEndTime = 0;
      }
    }
    
    const nextEventTime = sanitizeNumber(game.nextEventTime, now, now, now + 86400000);
    
    if (!game.activeEvent && now >= nextEventTime) {
      const events = [
        {
          title:"SECURITY ALERT",
          text:"FBI raid detected on network infrastructure.",
          type:"raid",
          duration:120000,
          effect:"Automatically hacked computers reduced by 30% for 2 minutes."
        },
        {
          title:"NETWORK OUTAGE",
          text:"Major ISP experiencing service disruption.",
          type:"outage",
          duration:90000,
          effect:"Cash per second reduced by 50% for 90 seconds."
        },
        {
          title:"EXPLOIT DISCOVERED",
          text:"Critical zero-day vulnerability identified.",
          type:"boom",
          duration:120000,
          effect:"Automatically hacked computers increased by 100% for 2 minutes."
        }
      ];
      
      const event = events[Math.floor(Math.random() * events.length)];
      
      if (!EVENT_TYPES.includes(event.type)) {
        console.error("Invalid event type");
        return;
      }

      game.activeEvent = event.type;
      game.eventDuration = sanitizeNumber(event.duration, 90000, 60000, MAX_EVENT_DURATION);
      game.eventEffect = sanitizeString(event.effect);
      game.eventAcknowledged = false;
      game.eventEndTime = 0;
      
      const minWait = 300000;
      const maxWait = 600000;
      const randomWait = Math.floor(Math.random() * (maxWait - minWait)) + minWait;
      game.nextEventTime = now + game.eventDuration + randomWait;
      
      showEvent(event);
    }
  } catch (e) {
    console.error("Error in triggerEvent():", e);
    game.activeEvent = null;
    game.eventEffect = null;
    game.eventAcknowledged = false;
    game.eventDuration = null;
  }
}

export function getRemainingEventTime() {
  try {
    if (!game.activeEvent || !game.eventAcknowledged) {
      return 0;
    }
    const remaining = game.eventEndTime - Date.now();
    return Math.max(0, sanitizeNumber(remaining, 0, 0, MAX_EVENT_DURATION));
  } catch (e) {
    console.error("Error in getRemainingEventTime():", e);
    return 0;
  }
}