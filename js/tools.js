import { game } from './state.js';
import { getPrestigeBonus } from './gameLoop.js';
import { getAchievementBonus } from './bots.js';

export let toolClickInProgress = false;
let lastToolClick = 0;
const MIN_TOOL_CLICK_INTERVAL = 50;

export function clickTool(id){
  const now = Date.now();
  if(now - lastToolClick < MIN_TOOL_CLICK_INTERVAL) return;
  if(toolClickInProgress) return;
  
  const t = tools[id];
  const cd = game.clickCooldowns[id] || 0;
  if(cd > 0) return;
  
  toolClickInProgress = true;
  lastToolClick = now;
  
  game.tools[id].clicks = (game.tools[id].clicks || 0) + 1;
  
  const prestigeBonus = 1 + getPrestigeBonus() * 0.10;
  const achievementBonus = getAchievementBonus(t.type === "bots" ? "generation" : "income");
  
  if(t.type === "bots"){
    game.bots.t3 += t.clickBonus * prestigeBonus * achievementBonus;
  } else if(t.type === "money"){
    const earned = t.clickBonus * prestigeBonus * achievementBonus;
    game.money += earned;
    game.totalEarned += earned;
  }
  
  if(game.tools[id].clicks >= 50){
    game.clickCooldowns[id] = t.clickCooldown;
    game.tools[id].clicks = 0;
  }
  
  setTimeout(() => { toolClickInProgress = false; }, 50);
}

export const tools = {
  starter:{ name:"Deauthentication Tool", desc:"Forces nearby wireless clients to disconnect from poorly secured access points", cost:1000, type:"bots", base:10, clickable:true, clickBonus:50, clickCooldown:60 },
  miniWorm:{ name:"Basic Propagation Script", desc:"A simple automated script that repeats successful intrusions without user input", cost:1500, type:"bots", base:50 },
  sqlTest:{ name:"SQL Injection Test Module", desc:"Automates detection and exploitation of improperly sanitized database queries", cost:2000, type:"bots", base:80 },
  enumScan:{ name:"Service Enumeration Scanner", desc:"Maps exposed services and open ports to increase successful intrusion rates", cost:3500, type:"bots", base:150 },
  autoClick:{ name:"Automated Interaction Engine", desc:"Simulates repetitive actions to rapidly expand compromised systems", cost:5000, type:"bots", base:500 },
  phishMini:{ name:"Phishing Campaign Test", desc:"Deploys targeted social engineering attempts with optional manual execution", cost:10000, type:"bots", base:800, clickable:true, clickBonus:2000, clickCooldown:180 },
  payloadForge:{ name:"Payload Obfuscation Tool", desc:"Alters exploit signatures to bypass basic detection mechanisms", cost:12000, type:"bots", base:1100 },
  marketScanner:{ name:"Red Pill", desc:"Track the next market price trend for Tier 3 bots (â†‘) or (â†“)", cost:15000, value:1 },
  credGrab:{ name:"Information Grabber", desc:"Collects stored usernames and passwords from compromised systems", cost:20000, type:"bots", base:1500 },
  botSeed:{ name:"Botnet Seeding Framework", desc:"Organizes newly compromised systems into a coordinated network", cost:30000, type:"bots", base:3000 },
  lateralMove:{ name:"Lateral Movement Module", desc:"Automatically pivots through internal networks after initial compromise", cost:40000, type:"bots", base:4500 },
  miniDdos:{ name:"L4 DDoS Utility", desc:"Generates short bursts of artificial layer 4 network traffic on demand", cost:50000, type:"money", base:200, clickable:true, clickBonus:1000, clickCooldown:120 },
  trafficSpoof:{ name:"Traffic Spoofing Engine", desc:"Masks malicious activity within normal network patterns", cost:75000, type:"money", base:350 },
  sqli:{ name:"SQL Injection Automation Suite", desc:"Fully automates exploitation of vulnerable database-backed services", cost:100000, type:"bots", base:15000, clickable:true, clickBonus:30000, clickCooldown:300 },
  ddos:{ name:"L7 DDoS Utility", desc:"Coordinates web application load across multiple sources for paid disruption", cost:200000, type:"money", base:800, clickable:true, clickBonus:3000, clickCooldown:300 },
  xss:{ name:"Cross-Site Scripting Suite", desc:"Identifies and abuses client-side injection points in web applications", cost:300000, type:"bots", base:35000 },
  sessionHijack:{ name:"Session Hijacking Toolkit", desc:"Captures active authentication sessions without credential storage", cost:350000, type:"bots", base:50000 },
  creds:{ name:"Credential Collection Service", desc:"Passively aggregates authentication data across compromised hosts", cost:400000, type:"bots", base:70000 },
  phishing:{ name:"Large Phishing Campaign", desc:"Manages large-scale email-based social engineering operations", cost:500000, type:"bots", base:120000 },
  dropService:{ name:"Data Drop Service", desc:"Secure underground marketplace distribution for harvested data", cost:750000, type:"money", base:1000 },
  spam:{ name:"Bulk Messaging Network", desc:"Distributes unsolicited messages across multiple platforms at scale", cost:1000000, type:"money", base:1500 },
  cards:{ name:"Payment Data Extraction", desc:"Extracts, filters, and categorizes harvested payment information", cost:1200000, type:"money", base:3000 },
  crypto:{ name:"Cryptocurrency Miner", desc:"Uses idle processing power across systems for computational revenue", cost:2000000, type:"money", base:4000 },
  worm:{ name:"Self-Propagating Worm", desc:"Autonomously spreads and adapts across new environments", cost:3000000, type:"bots", base:200000 },
  c2Mesh:{ name:"Distributed C2 Mesh", desc:"Decentralizes command infrastructure to reduce takedowns", cost:3200000, type:"bots", base:275000 },
  proxy:{ name:"Proxy Network Service", desc:"Anonymization service monetization", cost:3500000, type:"money", base:5500 },
  exploitBroker:{ name:"Exploit Brokerage", desc:"Sells discovered vulnerabilities to third parties for recurring revenue", cost:15000000, type:"money", base:9000 },
  ransomware:{ name:"Ransomware Distribution", desc:"File encryption and ransom collection", cost:5e8, type:"money", base:7000, clickable:true, clickBonus:15000, clickCooldown:300 },
  mobile:{ name:"Mobile Device Loader", desc:"Unlock mobile device targeting", cost:7e8, unlocks:"mobile" },
  http:{ name:"HTTP Botnet Controller", desc:"An advanced HTTP botnet, maximizing evasion", cost:1.2e9, type:"bots", base:350000 },
  rootkit:{ name:"Advanced Rootkit System", desc:"Maintains long-term access by surviving reinstalls and updates", cost:2e9, type:"bots", base:500000 },
  backdoor:{ name:"Persistent Backdoor System", desc:"Ensures continuous remote access across compromised systems", cost:3.5e9, type:"bots", base:750000 },
  aptFramework:{ name:"APT Operations Framework", desc:"Long-term stealth campaigns targeting high-value infrastructure", cost:5e9, type:"bots", base:950000 },
  zeroday:{ name:"Zero-Day Exploit Kit", desc:"Unpatched vulnerability exploitation", cost:6e9, type:"bots", base:1200000, clickable:true, clickBonus:5000000, clickCooldown:300 },
  influenceOps:{ name:"Influence Operations Suite", desc:"Manipulates digital ecosystems for indirect financial gain", cost:8e9, type:"money", base:12000, clickable:true, clickBonus:30000, clickCooldown:600 }
};