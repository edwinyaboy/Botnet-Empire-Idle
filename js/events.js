import { game } from './state.js';

export function showEvent(event){
  const modal = document.getElementById("eventModal");
  if (!modal) return;
  
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" style="pointer-events: all; display: flex;">
      <div class="modal" onclick="event.stopPropagation();">
        <div class="modal-title">${event.title}</div>
        <div class="modal-content">${event.text}</div>
        <button class="primary" onclick="acknowledgeEvent(); event.stopPropagation();">Acknowledge</button>
      </div>
    </div>
  `;
}

export function acknowledgeEvent(){
  if (!game.activeEvent) return;

  game.eventAcknowledged = true;
  game.eventEndTime = Date.now() + game.eventDuration;

  const modal = document.getElementById("eventModal");
  if (modal) {
    modal.innerHTML = "";
    modal.style.display = 'none';
  }
}

export function triggerEvent(){
  const now = Date.now();
  
  if(game.activeEvent && game.eventAcknowledged && now >= game.eventEndTime){
    game.activeEvent = null;
    game.eventEffect = null;
    game.eventAcknowledged = false;
    game.eventDuration = null;
  }
  
  if(!game.activeEvent && now >= game.nextEventTime){
    const events = [
      {title:"SECURITY ALERT", text:"FBI raid detected on network infrastructure. Automatically hacked computers reduced by 30% for 2 minutes.", type:"raid", duration:120000, effect:"Bot generation -30%"},
      {title:"NETWORK OUTAGE", text:"Major ISP experiencing service disruption. Cash per second reduced by 50% for 90 seconds.", type:"outage", duration:90000, effect:"Income generation -50%"},
      {title:"EXPLOIT DISCOVERED", text:"Critical zero-day vulnerability identified. Automatically hacked computers increased by 100% for 2 minutes.", type:"boom", duration:120000, effect:"Bot generation +100%"}
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    game.activeEvent = event.type;
    game.eventDuration = event.duration;
    game.eventEffect = event.effect;
    game.eventAcknowledged = false;
    game.eventEndTime = 0;
    game.nextEventTime = now + event.duration + (300000 + Math.random() * 300000);
    
    showEvent(event);
  }
}

export function getRemainingEventTime() {
  if (!game.activeEvent || !game.eventAcknowledged) return 0;
  return Math.max(0, game.eventEndTime - Date.now());
}