/** @param {NS} ns */
export async function main(ns) {
  if (ns.args.length != 1) {
    renderError(ns, "!! You must specify a server !!");
    return;
  }

  try {
    var serverObj = ns.getServer(ns.args[0]);
  }
  catch (e) {
    renderError(ns, "!! Invalid server hostname !!");
    return;
  }

  renderServerList(ns, serverObj);
}

function renderError(ns, errorMsg) {
  ns.tprintf("Usage: run fab42-chk-srv.js [server hostname]");
  ns.tprintf("- server hostname: hostname of server to check");
  ns.tprintf(errorMsg);
}

function renderServerList(ns, serverObj) {
  ns.tprintf("\n\nCheck Server");
  ns.tprintf("--------------------------");
  ns.tprintf(">> %s", serverObj.hostname);
  ns.tprintf("   - Money max: %s", ns.formatNumber(serverObj.moneyMax, 2));
  ns.tprintf("   - Money avail: %s", ns.formatNumber(serverObj.moneyAvailable, 2));
  ns.tprintf("   - Org Name: %s", serverObj.organizationName);
  ns.tprintf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  ns.tprintf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  ns.tprintf("   - Ports open: %s", serverObj.openPortCount);
  ns.tprintf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  ns.tprintf("   - Curr hack difficulty: %s", serverObj.hackDifficulty);
  ns.tprintf("   - Min hack difficulty: %s", serverObj.minDifficulty);
  ns.tprintf("   - Base hack difficulty: %s", serverObj.baseDifficulty);
  ns.tprintf("   - Server growth: %s", serverObj.serverGrowth);
  ns.tprintf("   - Cores: %s", serverObj.cpuCores);
  ns.tprintf("   - Max RAM: %s", ns.formatRam(serverObj.maxRam));
  ns.tprintf("   - Used RAM: %s", ns.formatRam(serverObj.ramUsed));
  ns.tprintf("   - Player owned: %s", serverObj.purchasedByPlayer);
  // ns.tprintf("   - xxxx: %s", serverObj.xxx);
  ns.tprintf("--------------------------\n\n");

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