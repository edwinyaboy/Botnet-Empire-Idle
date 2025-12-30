import { game } from './state.js';

export function showEvent(event){
  const modal = document.getElementById("eventModal");
  if (!modal) return;
  
  modal.innerHTML = `
    <div class="modal-overlay" style="pointer-events: all; display: flex;">
      <div class="modal" onclick="event.stopPropagation();">
        <div class="modal-title">${event.title}</div>
        <div class="modal-content">${event.text}</div>
        <button class="primary" onclick="acknowledgeEvent(); event.stopPropagation();">Acknowledge</button>
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

export function acknowledgeEvent(){
  game.eventAcknowledged = true;
  const modal = document.getElementById("eventModal");
  if (modal) {
    modal.innerHTML = "";
    modal.style.display = 'none';
  }
}

export function triggerEvent(){
  const now = Date.now();
  
  if(game.activeEvent && now >= game.eventEndTime){
    game.activeEvent = null;
    game.eventEffect = null;
    game.eventAcknowledged = false;
  }
  
  if(!game.activeEvent && now >= game.nextEventTime){
    const events = [
      {title:"SECURITY ALERT", text:"FBI raid detected on network infrastructure. Bot generation reduced by 30% for 2 minutes.", type:"raid", duration:120000, effect:"Bot generation -30%"},
      {title:"NETWORK OUTAGE", text:"Major ISP experiencing service disruption. Income generation reduced by 50% for 90 seconds.", type:"outage", duration:90000, effect:"Income generation -50%"},
      {title:"EXPLOIT DISCOVERED", text:"Critical zero-day vulnerability identified. Bot generation increased by 100% for 2 minutes.", type:"boom", duration:120000, effect:"Bot generation +100%"}
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    game.activeEvent = event.type;
    game.eventEndTime = now + event.duration;
    game.eventEffect = event.effect;
    game.eventAcknowledged = false;
    game.nextEventTime = now + event.duration + (300000 + Math.random() * 300000);
    
    showEvent(event);
  }
}