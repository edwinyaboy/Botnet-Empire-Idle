import { game, saveGame } from './state.js';

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

function createTextElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function createListItem(text) {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}

export function showTutorial() {
  try {
    const modal = document.getElementById("tutorialModal");
    if (!modal) {
      console.error("Tutorial modal not found");
      return;
    }
    
    modal.style.display = 'block';
    modal.innerHTML = '';
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal';
    
    const title = createTextElement('div', 'modal-title', 'Welcome to Botnet Empire Idle');
    modalContent.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const sections = [
      {
        title: 'Game Overview',
        text: 'Build and manage a botnet empire. Generate hacked computers, sell them for profit, purchase tools, and eventually prestige to multiply your earnings.'
      },
      {
        title: 'Getting Started',
        items: [
          'Spread Virus Button: Click to gain 10+ hacked computers. Hold to generate hacked computers continuously.',
          'Hacked Computer Quality: Poor (72% chance), Standard (22%), Premium (6%). Higher quality hacked computers sell for more.'
        ]
      },
      {
        title: 'Selling Hacked Computers',
        items: [
          'Navigate to "Sell Hacked Computers" to sell hacked computers for money.',
          'Prices update every 30 minutes: T1 ($0.80-$1.25), T2 ($0.30-$0.80), T3 ($0.08-$0.30).',
          'Use preset buttons (1-500M) or enter a custom amount.'
        ]
      },
      {
        title: 'Dark Web Marketplace',
        items: [
          'Hacked Computer Generation Tools: SQL Injection Module, XSS Kit, Credential Harvester, etc. - generate hacked computers passively.',
          'Money Generation Tools: DDoS Platform, Card Dumper, Ransomware - generate income passively.',
          'Clickable Tools: Some tools (SQLi, DDoS, Ransomware, Zero-Day) have bonus click actions. Click 50 times then there is a cooldown.'
        ]
      },
      {
        title: 'Skill Upgrades',
        items: [
          'Hacked Computer Quality Distribution: +5% Better Quality Per Level',
          'Market Efficiency: +10% Sell Prices Per Level.',
          'Hacked Computers Generation Rate: +10% Hacked Computers Per Level.',
          'Automation Efficiency: +5% Tool Effectiveness Per Level.'
        ]
      },
      {
        title: 'Achievements',
        text: 'Completing achievements grants permanent bonuses: income boosts, generation boosts, or extra prestige levels.'
      },
      {
        title: 'Prestige System',
        items: [
          'Reach 8.2B total hacked computers to prestige.',
          'Resets hacked computers, money, tools, and skills but keeps achievements.',
          'Each prestige grants +10% income and generation permanently.'
        ]
      },
      {
        title: 'Random Events',
        text: 'Events occur every 5-10 minutes causing random effects that last 120 seconds.'
      }
    ];
    
    sections.forEach(section => {
      const h4 = createTextElement('h4', null, section.title);
      content.appendChild(h4);
      
      if (section.text) {
        const p = createTextElement('p', null, section.text);
        content.appendChild(p);
      }
      
      if (section.items) {
        const ul = document.createElement('ul');
        section.items.forEach(item => {
          ul.appendChild(createListItem(item));
        });
        content.appendChild(ul);
      }
    });
    
    modalContent.appendChild(content);
    
    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = 'Start Playing';
    button.onclick = () => closeTutorial();
    modalContent.appendChild(button);
    
    overlay.appendChild(modalContent);
    modal.appendChild(overlay);
    
  } catch (e) {
    console.error("Error showing tutorial:", e);
  }
}

export function closeTutorial() {
  try {
    const modal = document.getElementById("tutorialModal");
    if (modal) {
      modal.innerHTML = "";
      modal.style.display = 'none';
    }
    
    if (!game || typeof game !== 'object') {
      console.error("Game state invalid in closeTutorial");
      return;
    }
    
    game.tutorialComplete = true;
    saveGame();
  } catch (e) {
    console.error("Error closing tutorial:", e);
  }
}