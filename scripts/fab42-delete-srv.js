/** @param {NS} ns */
export async function main(ns) {
  var serverObj;
  var doDelete = false;

  if (ns.args.length == 0) {
    renderError(ns, "!! You must specify a server !!");
    return;
  }

  try {
    serverObj = ns.getServer(ns.args[0]);
  }
  catch (e) {
    renderError(ns, ns.sprintf("\n!! Invalid hostname !!"));
    return;
  }

  if(ns.args.length == 2 && ns.args[1] === true){
    doDelete = true;
  }

  renderServerList(ns, serverObj);

  // get active scripts
  let activeScripts = ns.ps(serverObj.hostname);
  ns.tprintf("%s has %d active scripts", serverObj.hostname, activeScripts.length);

  if(doDelete){
    ns.tprintf("--------------------------");
    ns.tprintf("Killing scripts...");

    // kill any active scripts
    if(activeScripts.length > 0){
      ns.killall(serverObj.hostname);
    }

    try{
      if(ns.deleteServer(serverObj.hostname)){
        ns.tprintf("!! Delete success !!");
      }
      else{
        ns.tprintf("!! Delete failed !!");
      }
    }
    catch(e){
      renderError(ns, ns.sprintf("!! Delete failed: !!\n %s", e));
      return;
    }

    
  }

  ns.tprintf("--------------------------\nEND\n");
}

function renderError(ns, errorMsg) {
  ns.tprintf("Usage: run fab42-delete-srv.js [server hostname] [confirm delete | optional]");
  ns.tprintf("- server hostname: hostname of server to delete");
  ns.tprintf("- confirm delete: eneter 'true' to confirm, else script will just check server");
  ns.tprintf(errorMsg);
}

function renderServerList(ns, serverObj) {
  ns.tprintf("\nCheck Server");
  ns.tprintf("--------------------------");
  ns.tprintf(">> %s", serverObj.hostname);
  ns.tprintf("   - Money max: %s", ns.formatNumber(serverObj.moneyMax, 2));
  ns.tprintf("   - Money avail: %s", ns.formatNumber(serverObj.moneyAvailable, 2));
  ns.tprintf("   - Max RAM: %s", ns.formatRam(serverObj.maxRam, 2));
  ns.tprintf("   - Org Name: %s", serverObj.organizationName);
  ns.tprintf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  ns.tprintf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  ns.tprintf("   - Ports open: %s", serverObj.openPortCount);
  ns.tprintf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  ns.tprintf("   - Curr hack difficulty: %s", serverObj.hackDifficulty);
  ns.tprintf("   - Min hack difficulty: %s", serverObj.minDifficulty);
  ns.tprintf("   - Base hack difficulty: %s", serverObj.baseDifficulty);
  ns.tprintf("   - Server growth: %s", serverObj.serverGrowth);
  ns.tprintf("   - Player owned: %s", serverObj.purchasedByPlayer);
  // ns.tprintf("   - xxxx: %s", serverObj.xxx);
  ns.tprintf("--------------------------");

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