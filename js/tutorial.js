import { game, saveGame } from './state.js';

export function showTutorial(){
  const modal = document.getElementById("tutorialModal");
  if (!modal) return;
  
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-title">Welcome to Botnet Empire Idle</div>
        <div class="modal-content">
          <h4>Game Overview</h4>
          <p>Build and manage a botnet empire. Generate hacked computers, sell them for profit, purchase tools, and eventually prestige to multiply your earnings.</p>
          
          <h4>Getting Started</h4>
          <ul>
            <li><strong>Spread Virus Button:</strong> Click to gain 10+ hacked computers. Hold to generate hacked computers continuously.</li>
            <li><strong>Hacked Computer Tiers:</strong> T3 (Basic, 72% chance), T2 (Standard, 22%), T1 (Premium, 6%). Higher tiers sell for more.</li>
          </ul>
          
          <h4>Selling Hacked Computers</h4>
          <ul>
            <li>Navigate to "Sell Hacked Computers" to sell hacked computers for money.</li>
            <li>Prices update every 30 minutes: T1 ($0.80-$1.25), T2 ($0.30-$0.80), T3 ($0.08-$0.30).</li>
            <li>Use preset buttons (1-500M) or enter a custom amount.</li>
          </ul>
          
          <h4>Dark Web Marketplace</h4>
          <ul>
            <li><strong>Hacked Computer Generation Tools:</strong> SQL Injection Module, XSS Kit, Credential Harvester, etc. - generate hacked computers passively.</li>
            <li><strong>Money Generation Tools:</strong> DDoS Platform, Card Dumper, Ransomware - generate income passively.</li>
            <li><strong>Clickable Tools:</strong> Some tools (SQLi, DDoS, Ransomware, Zero-Day) have bonus click actions. Click 50 times then there is a cooldown.</li>
          </ul>
          
          <h4>Skill Upgrades</h4>
          <ul>
            <li><strong>Hacked Computer Tier Distribution:</strong> +5% Better Tiers Per Level</li>
            <li><strong>Market Efficiency:</strong> +10% Sell Prices Per Level.</li>
            <li><strong>Hacked Computers Generation Rate:</strong> +10% Hacked Computers Per Level.</li>
            <li><strong>Automation Efficiency:</strong> +5% Tool Effectiveness Per Level.</li>
          </ul>
          
          <h4>Achievements</h4>
          <p>Completing achievements grants permanent bonuses: income boosts, generation boosts, or extra prestige levels.</p>
          
          <h4>Prestige System</h4>
          <ul>
            <li>Reach 8.2B total hacked computers to prestige.</li>
            <li>Resets hacked computers, money, tools, and skills but keeps achievements.</li>
            <li>Each prestige grants +10% income and generation permanently.</li>
          </ul>
          
          <h4>Random Events</h4>
          <p>Events occur every 10-30 minutes: FBI raids (-30% automatically hacked computers), ISP outages (-50% automatically gained income), or exploit discoveries (+100% automatically hacked computers). Effects last 90-120 seconds.</p>
        </div>
        <button class="primary" onclick="closeTutorial()">Start Playing</button>
      </div>
    </div>
  `;
}

export function closeTutorial(){
  const modal = document.getElementById("tutorialModal");
  if (modal) {
    modal.innerHTML = "";
    modal.style.display = 'none';
  }
  game.tutorialComplete = true;
  saveGame();
}