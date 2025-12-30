import { game } from './state.js';

export function showTutorial(){
  const modal = document.getElementById("tutorialModal");
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-title">Welcome to Botnet Empire Idle</div>
        <div class="modal-content">
          <h4>Game Overview</h4>
          <p>Build and manage a botnet empire. Generate bots, sell them for profit, purchase tools, and eventually prestige to multiply your earnings.</p>
          
          <h4>Getting Started</h4>
          <ul>
            <li><strong>Spread Network Button:</strong> Click to generate 10 random bots. Hold to generate bots continuously.</li>
            <li><strong>Bot Tiers:</strong> T3 (Basic, 72% chance), T2 (Standard, 22%), T1 (Premium, 6%). Higher tiers sell for more.</li>
          </ul>
          
          <h4>Selling Bots</h4>
          <ul>
            <li>Navigate to "Market Exchange Rates" to sell bots for money.</li>
            <li>Prices update every 30 minutes: T1 ($0.80-$1.25), T2 ($0.30-$0.80), T3 ($0.08-$0.30).</li>
            <li>Use preset buttons (100-500M) or enter a custom amount.</li>
          </ul>
          
          <h4>Dark Web Marketplace</h4>
          <ul>
            <li><strong>Bot Generation Tools:</strong> SQL Injection Module, XSS Kit, Credential Harvester, etc. - generate bots passively.</li>
            <li><strong>Money Generation Tools:</strong> DDoS Platform, Card Dumper, Ransomware - generate income passively.</li>
            <li><strong>Clickable Tools:</strong> Some tools (SQLi, DDoS, Ransomware, Zero-Day) have bonus click actions. Click 50 times then 5-minute cooldown.</li>
          </ul>
          
          <h4>Skill Upgrades</h4>
          <ul>
            <li><strong>Bot Tier Distribution:</strong> +5% chance for better tiers per level.</li>
            <li><strong>Market Efficiency:</strong> +10% sell prices per level.</li>
            <li><strong>Bot Generation Rate:</strong> +10% passive bot generation per level.</li>
            <li><strong>Automation Efficiency:</strong> +5% tool effectiveness per level.</li>
          </ul>
          
          <h4>Achievements</h4>
          <p>Completing achievements grants permanent bonuses: income boosts, generation boosts, or extra prestige levels.</p>
          
          <h4>Prestige System</h4>
          <ul>
            <li>Reach 8.2B total bots to prestige.</li>
            <li>Resets bots, money, tools, and skills but keeps achievements.</li>
            <li>Each prestige grants +10% income and generation permanently.</li>
            <li>Game balanced for ~1 week per prestige.</li>
          </ul>
          
          <h4>Random Events</h4>
          <p>Events occur every 10-30 minutes: FBI raids (-30% bots), ISP outages (-50% income), or exploit discoveries (+100% bots). Effects last 90-120 seconds.</p>
        </div>
        <button class="primary" onclick="closeTutorial()">Start Playing</button>
      </div>
    </div>
  `;
  game.tutorialComplete = true;
}

export function closeTutorial(){
  document.getElementById("tutorialModal").innerHTML = "";
}