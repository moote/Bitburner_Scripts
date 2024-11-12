import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';
import HackConfig from '/scripts/dynamic/f42-hack-cfg-class.js';

/** @param {NS} ns */
export async function main(ns) {
  let hackConfig;

  let logger = new F42Logger(ns, false, true, true, "Hack Analyser");
  let scriptTitle = "Hack Analyser";
  let scriptDescription = "Analyse target server and determine optimal hack resources to apply.\n > Usage: run /scripts/dynamic/f42-smart-control.js";
  let scriptFlags = [
    F42ClFlagDef.getOptStrAny("target", "target server to analyse, will default to the current target"),
    F42ClFlagDef.getOptIntAny("dollars", "Amount in dollars to hack, will defaul to the server max", "0"),
    F42ClFlagDef.getReqStrAny("attackingHostname", "Host name of attacking server, defaults to server running this script", "home"),
  ];

  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let attackingServer = feedback.parsedClFlags.attackingHostname;
  let targetServer = feedback.parsedClFlags.target;
  let targetDollars = feedback.parsedClFlags.dollars;

  hackConfig = new HackConfig(ns, true);

  if (!hackConfig.hasConfig) {
    feedback.addUserDefError("--HackConfig", "Hack config port is empty");
    feedback.printFlagErrorsAndEnd(true);
    return false;
  }

  if (targetServer !== "") {
    // validate server
    if (!ns.serverExists(targetServer)) {
      feedback.addUserDefError("--target", "Not a valid hostname");
      feedback.printFlagErrorsAndEnd(true);
      return false;
    }
  }
  else {
    targetServer = hackConfig.target;
  }

  // validate attacking server
  if (!ns.serverExists(attackingServer)) {
    feedback.addUserDefError("--attackingServer", "Not a valid hostname");
    feedback.printFlagErrorsAndEnd(true);
    return false;
  }

  attackingServer = ns.getServer(attackingServer);
  targetServer = ns.getServer(targetServer);
  let person = ns.getPlayer();

  if (targetDollars == 0) {
    targetDollars = targetServer.moneyMax;
  }

  const _hackPerc = ns.formulas.hacking.hackPercent(targetServer, person);
  const _hackTime = ns.formulas.hacking.hackTime(targetServer, person);
  const _hackChance = ns.formulas.hacking.hackChance(targetServer, person);
  const hackThreads = ns.hackAnalyzeThreads(targetServer.hostname, targetDollars);

  const _growTime = ns.formulas.hacking.growTime(targetServer, person);
  const _growThreads = ns.formulas.hacking.growThreads(targetServer, person, targetServer.moneyMax, attackingServer.cpuCores);

  const _weakenTime = ns.formulas.hacking.weakenTime(targetServer, person);
  const _weakenThreads = 1;
  const _weakenAnal = ns.weakenAnalyze(_weakenThreads);

  let availRam = attackingServer.maxRam - attackingServer.ramUsed;

  feedback.printTitle();
  feedback.printf("Attacking Server Analysys: %s", attackingServer.hostname);
  feedback.printLineSeparator();
  feedback.printf(">> max RAM: %s", ns.formatRam(attackingServer.maxRam));
  feedback.printf(">> used RAM: %s", ns.formatRam(attackingServer.ramUsed));
  feedback.printf(">> avail RAM: %s", ns.formatRam(availRam));
  feedback.printf(">> cores: %s", attackingServer.cpuCores);
  feedback.printf(">> hack script RAM (calc): %s", hackConfig.hackScriptExeRam);
  feedback.printf(">> hack script RAM (actual): %s", hackConfig.hackScriptExeRam2);
  feedback.printf(">> max threads for hack script: %s", Math.ceil(attackingServer.maxRam / hackConfig.hackScriptExeRam2));
  feedback.printf(">> avail threads for hack script: %s", Math.floor(availRam / hackConfig.hackScriptExeRam2));
  feedback.printLineSeparator();
  feedback.printf("Target Server Analysys: %s", targetServer.hostname);
  feedback.printLineSeparator();
  feedback.printf(">> max money: $%s", ns.formatNumber(targetServer.moneyMax));
  feedback.printf(">> avail money: $%s", ns.formatNumber(targetServer.moneyAvailable));
  feedback.printf(">> base hack diff: %s", ns.formatNumber(targetServer.baseDifficulty));
  feedback.printf(">> min hack diff: %s", ns.formatNumber(targetServer.minDifficulty));
  feedback.printf(">> curr hack diff: %s", ns.formatNumber(targetServer.hackDifficulty));
  feedback.printf(">> server growth: %s", ns.formatNumber(targetServer.serverGrowth));
  feedback.printf(">> hack level: %s", ns.formatNumber(targetServer.requiredHackingSkill));
  feedback.printLineSeparator();
  feedback.printf(">> hack perc: %f / thread", ns.formatNumber(_hackPerc, 4, 1000, false));
  feedback.printf(">> hack amount: $%s / thread", ns.formatNumber(_hackPerc * targetServer.moneyAvailable, 4, 1000, false));
  feedback.printf(">> hack chance: %f", ns.formatNumber(_hackChance, 4, 1000, false));
  feedback.printf(">> hack time: %s", msToTime(_hackTime));
  feedback.printf(">> hack threads for %s: %d", ns.formatNumber(targetDollars), hackThreads);
  feedback.printLineSeparator();
  feedback.printf(">> grow time: %s", msToTime(_growTime));
  feedback.printf(">> grow threads for max money: %d", _growThreads);
  feedback.printLineSeparator();
  feedback.printf(">> %d thread weaken amt: %f", _weakenThreads, ns.formatNumber(_weakenAnal, 4, 1000, false));
  feedback.printf(">> optimal weaken amt: %f", ns.formatNumber(targetServer.hackDifficulty - targetServer.minDifficulty));
  feedback.printf(">> weaken time: %s", msToTime(_weakenTime));
  feedback.printf(">> optimal weaken threads: %d", Math.ceil((targetServer.hackDifficulty - targetServer.minDifficulty) / _weakenAnal));
}


function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " Sec";
  else if (minutes < 60) return minutes + " Min";
  else if (hours < 24) return hours + " Hrs";
  else return days + " Days"
}