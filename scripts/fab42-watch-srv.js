import HackConfig from '/scripts/dynamic/f42-hack-cfg-class.js';
import { numberToBase62Str } from "/scripts/utility/utility-functions.js";

/**
 * @param {NS} ns
 * @version 1.0
 * 
 * A looping version of "find richest" that targets specified host
 * and endlessly loops output to terminal for monitoring
 */
export async function main(ns) {
  let hackConfig = false;
  let targetHostname = "";

  if (ns.args.length < 1) {
    // default to target host
    hackConfig = new HackConfig(ns, true);
    // hackConfig.writeLog = true;
    if (updateTarget(ns, hackConfig, targetHostname) === false) {
      renderError(ns, ns.sprintf("No HackPayload target: %s", hackConfig.statusVerbose));
      return;
    }
  }
  // check for help request
  else if (ns.args[0] == "help") {
    renderError(ns, false);
    return;
  }
  // verify server exists if requested
  else if (!ns.serverExists(ns.args[0])) {
    renderError(ns, "Invalid hostname");
    return;
  }
  else {
    targetHostname = ns.args[0];
  }

  // tail
  ns.tail();
  ns.disableLog("ALL");

  // check for noloop
  if (ns.args.length == 2 && ns.args[1] === true) {
    // start noloop
    watchServerNoLoop(ns, targetHostname, hackConfig);
  }
  else {
    // start loop
    await watchServerLoop(ns, targetHostname, hackConfig);
  }
}

function updateTarget(ns, hackConfig, reqHostname) {
  // watching server specified by arg
  if (hackConfig === false) {
    ns.setTitle(sprintf("Watching Server: %s", reqHostname));
    return reqHostname;
  }

  // no arg secified server; load from config
  hackConfig.checkConfig();
  if (hackConfig.hasConfig) {
    ns.setTitle(sprintf("Watching Server: %s", hackConfig.target));
    return hackConfig.target;
  }
  else {
    return false;
  }
}

/**
 * The watch noloop
 */
function watchServerNoLoop(ns, hostname, hackConfig) {
  // update target if needed
  hostname = updateTarget(ns, hackConfig, hostname);

  // get server object
  var serverObj = ns.getServer(hostname);

  // render
  renderServer(ns, serverObj);
}

/**
 * The watch loop
 */
async function watchServerLoop(ns, hostname, hackConfig) {
  while (true) {
    // update target if needed
    hostname = updateTarget(ns, hackConfig, hostname);

    // get server object
    const serverObj = ns.getServer(hostname);

    // render
    renderServer(ns, serverObj);

    // wait
    await ns.sleep(250);
  }
}

/**
 * Render to terminal function 
 */
function renderServer(ns, serverObj) {
  ns.clearLog();
  ns.printf("--------------------------");
  ns.printf("Watch Server");
  ns.printf("--------------------------");
  ns.printf(">> %s", serverObj.hostname);
  ns.printf("   - Money max: %s", ns.formatNumber(serverObj.moneyMax, 2));
  ns.printf("   - Money avail: %s", ns.formatNumber(serverObj.moneyAvailable, 2));
  ns.printf("   - Curr hack difficulty: %s", ns.formatNumber(serverObj.hackDifficulty, 2));
  ns.printf("   - Min hack difficulty: %s", ns.formatNumber(serverObj.minDifficulty, 2));
  ns.printf("   - Base hack difficulty: %s", ns.formatNumber(serverObj.baseDifficulty, 2));
  ns.printf("   - Server growth: %s", serverObj.serverGrowth);
  ns.printf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  ns.printf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  ns.printf("   - Ports open: %s", serverObj.openPortCount);
  ns.printf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  ns.printf("   - Org Name: %s", serverObj.organizationName);
  ns.printf("   - Player owned: %s", serverObj.purchasedByPlayer);
  ns.printf("   - Timestamp: %s", numberToBase62Str(Date.now()));
  // ns.printf("   - xxxx: %s", serverObj.xxx);
  ns.printf("--------------------------");

  // example server object
  // var serverObj = {
  //   "hostname": "n00dles",
  //   "ip": "15.7.8.7",
  //   "sshPortOpen": false,
  //   "ftpPortOpen": false,
  //   "smtpPortOpen": false,
  //   "httpPortOpen": false,
  //   "sqlPortOpen": false,
  //   "hasAdminRights": true,
  //   "cpuCores": 1,
  //   "isConnectedTo": false,
  //   "ramUsed": 0,
  //   "maxRam": 4,
  //   "organizationName": "Noodle Bar",
  //   "purchasedByPlayer": false,
  //   "backdoorInstalled": true,
  //   "baseDifficulty": 1,
  //   "hackDifficulty": 1,
  //   "minDifficulty": 1,
  //   "moneyAvailable": 1750000,
  //   "moneyMax": 1750000,
  //   "numOpenPortsRequired": 0,
  //   "openPortCount": 0,
  //   "requiredHackingSkill": 1,
  //   "serverGrowth": 3000
  // };
}

/**
 * Error render function
 */
function renderError(ns, errorMsg = false) {
  ns.printf("\n--------------------------");
  ns.printf("Watch Server");
  ns.printf("--------------------------");
  ns.printf("Usage: run fab42-watch-srv.js [hostname | help?] [noloop?]");
  ns.printf("- hostname (optional): the host to watch, defaults to the target host; if this is 'help', display this usage info");
  ns.printf("- noloop: optional, if set true then will just run once");
  ns.printf("--------------------------\n\n");

  if (errorMsg !== false) {
    ns.printf("!! %s !!", errorMsg);
  }
}