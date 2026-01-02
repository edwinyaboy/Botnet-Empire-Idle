import { game } from './state.js';
import { getPrestigeBonus } from './gameLoop.js';
import { getAchievementBonus } from './bots.js';

export let toolClickInProgress = false;
let lastToolClick = 0;
const MIN_TOOL_CLICK_INTERVAL = 50;
const MAX_SAFE_INTEGER = 9007199254740991;

function sanitizeNumber(value, defaultValue = 0, min = 0, max = MAX_SAFE_INTEGER) {
  if (typeof value !== 'number') return defaultValue;
  if (isNaN(value) || !isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

export function clickTool(id) {
  if (!id || typeof id !== 'string') {
    console.error("Invalid tool id");
    return false;
  }

  const now = Date.now();
  if (now - lastToolClick < MIN_TOOL_CLICK_INTERVAL) {
    return false;
  }

  if (toolClickInProgress) {
    return false;
  }

  try {
    const t = tools[id];
    if (!t) {
      console.error("Tool not found:", id);
      return false;
    }

    if (!game.tools || !game.tools[id]) {
      console.error("Tool not owned:", id);
      return false;
    }

    const cd = sanitizeNumber(game.clickCooldowns?.[id], 0, 0, 10000);
    if (cd > 0) {
      return false;
    }
    
    toolClickInProgress = true;
    lastToolClick = now;

    const snapshot = {
      clicks: game.tools[id].clicks || 0,
      bots: game.bots.t3,
      money: game.money,
      totalEarned: game.totalEarned,
      cooldown: game.clickCooldowns?.[id] || 0
    };

    try {
      if (!game.tools[id].clicks || typeof game.tools[id].clicks !== 'number') {
        game.tools[id].clicks = 0;
      }
      game.tools[id].clicks++;

      const prestigeBonus = 1 + sanitizeNumber(getPrestigeBonus(), 0, 0, 10000) * 0.10;
      const achievementBonus = sanitizeNumber(
        getAchievementBonus(t.type === "bots" ? "generation" : "income"), 
        1, 1, 1000
      );

      const totalBonus = sanitizeNumber(prestigeBonus * achievementBonus, 1, 1, 10000);

      if (t.type === "bots") {
        const botsGained = sanitizeNumber(t.clickBonus * totalBonus, 0, 0, MAX_SAFE_INTEGER);
        game.bots.t3 = sanitizeNumber(game.bots.t3 + botsGained, 0, 0, MAX_SAFE_INTEGER);
      } else if (t.type === "money") {
        const earned = sanitizeNumber(t.clickBonus * totalBonus, 0, 0, MAX_SAFE_INTEGER);
        game.money = sanitizeNumber(game.money + earned, 0, 0, MAX_SAFE_INTEGER);
        game.totalEarned = sanitizeNumber(game.totalEarned + earned, 0, 0, MAX_SAFE_INTEGER);
      }

      if (game.tools[id].clicks >= 50) {
        if (!game.clickCooldowns) {
          game.clickCooldowns = {};
        }
        game.clickCooldowns[id] = sanitizeNumber(t.clickCooldown, 0, 0, 10000);
        game.tools[id].clicks = 0;
      }

      if (game.bots.t3 < 0 || game.money < 0 || game.totalEarned < 0) {
        throw new Error("Negative values detected");
      }

      return true;

    } catch (e) {
      console.error("Tool click failed, rolling back:", e);
      game.tools[id].clicks = snapshot.clicks;
      game.bots.t3 = snapshot.bots;
      game.money = snapshot.money;
      game.totalEarned = snapshot.totalEarned;
      if (game.clickCooldowns) {
        game.clickCooldowns[id] = snapshot.cooldown;
      }
      return false;
    }

  } catch (e) {
    console.error("Critical error in clickTool():", e);
    return false;
  } finally {
    setTimeout(() => { 
      toolClickInProgress = false; 
    }, 50);
  }
}

export const tools = {
  starter:{ name:"Deauthentication Tool", desc:"Kicks nearby devices off weak WiFi networks to create new entry points", cost:1000, type:"bots", base:10, clickable:true, clickBonus:50, clickCooldown:60 },
  miniWorm:{ name:"Basic Propagation Script", desc:"Repeats successful break-ins automatically to grow your network", cost:1500, type:"bots", base:50 },
  sqlTest:{ name:"SQL Injection Test Module", desc:"Scans sites for unsafe database queries and exploits them", cost:2000, type:"bots", base:80 },
  enumScan:{ name:"Service Enumeration Scanner", desc:"Finds open services and exposed ports to improve access rates", cost:3500, type:"bots", base:150 },
  autoClick:{ name:"Automated Interaction Engine", desc:"Simulates repeated actions to speed up system takeovers", cost:5000, type:"bots", base:500 },
  phishMini:{ name:"Phishing Campaign Test", desc:"Runs small social engineering attempts with optional manual boosts", cost:10000, type:"bots", base:800, clickable:true, clickBonus:2000, clickCooldown:180 },
  payloadForge:{ name:"Payload Obfuscation Tool", desc:"Modifies exploits to slip past basic detection systems", cost:12000, type:"bots", base:1100 },
  marketScanner:{ name:"Red Pill", desc:"Shows the next price trend (↑) or (↓) for Poor quality hacked computers", cost:15000, value:1 },
  credGrab:{ name:"Information Grabber", desc:"Pulls stored usernames and passwords from compromised machines", cost:20000, type:"bots", base:1500 },
  botSeed:{ name:"Botnet Seeding Framework", desc:"Groups new systems into a coordinated network", cost:30000, type:"bots", base:3000 },
  lateralMove:{ name:"Lateral Movement Module", desc:"Spreads deeper into internal networks after first access", cost:40000, type:"bots", base:4500 },
  miniDdos:{ name:"L4 DDoS Utility", desc:"Sends short traffic bursts to disrupt services for quick payouts", cost:50000, type:"money", base:200, clickable:true, clickBonus:1000, clickCooldown:120 },
  trafficSpoof:{ name:"Traffic Spoofing Engine", desc:"Hides malicious activity inside normal-looking network traffic", cost:75000, type:"money", base:350 },
  sqli:{ name:"SQL Injection Automation Suite", desc:"Fully automates database exploitation at scale", cost:100000, type:"bots", base:15000, clickable:true, clickBonus:30000, clickCooldown:300 },
  ddos:{ name:"L7 DDoS Utility", desc:"Overloads web apps using coordinated traffic floods", cost:200000, type:"money", base:800, clickable:true, clickBonus:3000, clickCooldown:300 },
  xss:{ name:"Cross-Site Scripting Suite", desc:"Finds and abuses client-side injection flaws", cost:300000, type:"bots", base:35000 },
  sessionHijack:{ name:"Session Hijacking Toolkit", desc:"Takes over active logins without storing credentials", cost:350000, type:"bots", base:50000 },
  creds:{ name:"Credential Collection Service", desc:"Silently gathers login data across your network", cost:400000, type:"bots", base:70000 },
  phishing:{ name:"Large Phishing Campaign", desc:"Runs mass email scams to rapidly expand control", cost:500000, type:"bots", base:120000 },
  dropService:{ name:"Data Drop Service", desc:"Moves harvested data through underground markets", cost:750000, type:"money", base:1000 },
  spam:{ name:"Bulk Messaging Network", desc:"Sends high-volume messages across multiple platforms", cost:1000000, type:"money", base:1500 },
  cards:{ name:"Payment Data Extraction", desc:"Processes stolen payment data for resale", cost:1200000, type:"money", base:3000 },
  crypto:{ name:"Cryptocurrency Miner", desc:"Uses idle hardware to generate passive crypto income", cost:2000000, type:"money", base:4000 },
  worm:{ name:"Self-Propagating Worm", desc:"Spreads itself automatically across new systems", cost:3000000, type:"bots", base:200000 },
  c2Mesh:{ name:"Distributed C2 Mesh", desc:"Decentralized control system that resists shutdowns", cost:3200000, type:"bots", base:275000 },
  proxy:{ name:"Proxy Network Service", desc:"Sells anonymized traffic routing as a service", cost:3500000, type:"money", base:5500 },
  exploitBroker:{ name:"Exploit Brokerage", desc:"Sells newly discovered vulnerabilities for profit", cost:15000000, type:"money", base:9000 },
  ransomware:{ name:"Ransomware Distribution", desc:"Encrypts files and collects ransom payments", cost:5e8, type:"money", base:7000, clickable:true, clickBonus:15000, clickCooldown:300 },
  mobile:{ name:"Mobile Device Loader", desc:"Unlocks attacks targeting mobile devices", cost:7e8, unlocks:"mobile" },
  http:{ name:"HTTP Botnet Controller", desc:"Manages large-scale botnets over standard web traffic", cost:1.2e9, type:"bots", base:350000 },
  rootkit:{ name:"Advanced Rootkit System", desc:"Maintains access even after reinstalls and updates", cost:2e9, type:"bots", base:500000 },
  backdoor:{ name:"Persistent Backdoor System", desc:"Keeps continuous remote access to infected systems", cost:3.5e9, type:"bots", base:750000 },
  aptFramework:{ name:"APT Operations Framework", desc:"Runs long-term stealth campaigns against major targets", cost:5e9, type:"bots", base:950000 },
  zeroday:{ name:"Zero-Day Exploit Kit", desc:"Uses undisclosed flaws before patches exist", cost:6e9, type:"bots", base:1200000, clickable:true, clickBonus:5000000, clickCooldown:300 },
  influenceOps:{ name:"Influence Operations Suite", desc:"Manipulates online spaces for indirect profit", cost:8e9, type:"money", base:12000, clickable:true, clickBonus:30000, clickCooldown:600 }
};