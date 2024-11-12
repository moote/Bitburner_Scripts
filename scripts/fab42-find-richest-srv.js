/**
 * @param {NS} ns
 * @version 1.0
 * 
 * Find this richest server for the requested parameters
 */
export async function main(ns) {
  var opVars = {
    reqMaxHackLevel: -1,
    reqMaxHackPorts: -1,
    topServerArr: [],
    topServerCnt: 3,
    showDebug: false
  };

  // while (true) {
    ns.tprintf("\n--------------------------");
    ns.tprintf("Find Richest Server");

    if (ns.args.length >= 1) {
      if (ns.args[0] == "help") {
        ns.tprintf("Usage: run find-richest-srv.js [max server hack level / help | optional] [max server ports | optional]");
        ns.tprintf("- max server hack level (optional): defaults to half your hack level; if this is 'help', display usage info");
        ns.tprintf("- max server ports (optional): defaults to the total ports you can open");
        ns.tprintf("- debug (optional): if set true will show all steps in top array build");
        return;
      }

      opVars.reqMaxHackLevel = ns.args[0];
      opVars.reqMaxHackPorts = ns.args[1] || -1;

      if (ns.args.length == 3 && ns.args[2] === true) {
        opVars.showDebug = true;
      }
    }

    // get user hack level
    let userHackLev = ns.getHackingLevel();

    // calc the max number of ports we can open
    var userMaxHackPorts = 0;

    if (ns.fileExists("BruteSSH.exe", "home")) {
      userMaxHackPorts++;
      if (ns.fileExists("FTPCrack.exe", "home")) {
        userMaxHackPorts++;
        if (ns.fileExists("relaySMTP.exe", "home")) {
          userMaxHackPorts++;
          if (ns.fileExists("HTTPWorm.exe", "home")) {
            userMaxHackPorts++;
            if (ns.fileExists("SQLInject.exe", "home")) {
              userMaxHackPorts++;
            }
          }
        }
      }
    }

    // set defaluts / test reauested values
    let hackLevDefault = false;
    let hackPortsDefault = false;

    if (opVars.reqMaxHackLevel == -1) {
      opVars.reqMaxHackLevel = Math.floor(userHackLev / 2);
      hackLevDefault = true;
    }
    else if (opVars.reqMaxHackLevel > userHackLev) {
      ns.tprintf("!! Your requested hack level (%d) is greater than your hack level (%d) !!", opVars.reqMaxHackLevel, userHackLev);
      return;
    }

    if (opVars.reqMaxHackPorts == -1) {
      opVars.reqMaxHackPorts = userMaxHackPorts;
      hackPortsDefault = true;
    }
    else if (opVars.reqMaxHackPorts > userMaxHackPorts) {
      ns.tprintf("!! You requested severs with %d ports, but you can only hack %d !!", opVars.reqMaxHackPorts, userMaxHackPorts);
      return;
    }

    // ns.tprintf(">> %s", JSON.stringify(opVars));

    ns.tprintf("- Your hack level is: %d", userHackLev);
    ns.tprintf("- You can hack %d ports", userMaxHackPorts);
    ns.tprintf("--------------------------");
    ns.tprintf("Target conditions:");
    ns.tprintf("- Find most valuable server");
    ns.tprintf("- Max server hack lev: %d%s", opVars.reqMaxHackLevel, (hackLevDefault ? " (default)" : " (user defined)"));
    ns.tprintf("- Max server hack ports: %d%s", opVars.reqMaxHackPorts, (hackPortsDefault ? " (default)" : " (user defined)"));
    ns.tprintf("--------------------------");
    ns.tprintf("Top %d servers:", opVars.topServerCnt);
    ns.tprintf("--------------------------");

    // recursivly scan all severs
    scanAdjServers(ns, "home", opVars);

    // render list
    opVars.topServerArr.forEach(renderServerList, ns);

    ns.tprintf("END");

  //   await ns.sleep(5000);
  // }


}

function scanAdjServers(ns, baseServer, opVars) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }

  let adjServers = ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      var serverHostName = adjServers[i];
      var currServerObj = ns.getServer(serverHostName);

      // test server is viable
      if (
        currServerObj.requiredHackingSkill <= opVars.reqMaxHackLevel
        && currServerObj.numOpenPortsRequired <= opVars.reqMaxHackPorts
      ) {
        // server viable
        let serverAdded = false;

        for (let topIdx in opVars.topServerArr) {
          let topServerObj = opVars.topServerArr[topIdx];

          if (opVars.showDebug) {
            ns.tprintf(
              "Compare %s (%s) <> %s (%s) @ idx %d",
              currServerObj.hostname,
              ns.formatNumber(currServerObj.moneyMax, 2),
              topServerObj.hostname,
              ns.formatNumber(topServerObj.moneyMax, 2),
              topIdx
            );
          }

          if (currServerObj.moneyMax >= topServerObj.moneyMax) {
            opVars.topServerArr.splice(topIdx, 0, currServerObj);

            if (opVars.showDebug) {
              ns.tprintf(
                "Inserting %s (%s) at idx %d",
                currServerObj.hostname,
                ns.formatNumber(currServerObj.moneyMax, 2),
                topIdx
              );
            }

            if (opVars.topServerArr.length > opVars.topServerCnt) {
              if (opVars.showDebug) {
                ns.tprintf(
                  "Server list too long (%d) trimming to %d",
                  opVars.topServerArr.length,
                  opVars.topServerCnt
                );
              }

              opVars.topServerArr.pop();
            }

            serverAdded = true;

            break;
          }
        }

        // if no server added and list not full, push current on to end
        if (!serverAdded && opVars.topServerArr.length < opVars.topServerCnt) {
          opVars.topServerArr.push(currServerObj);

          if (opVars.showDebug) {
            ns.tprintf(
              "Server list not full pushing %s (%d) to idx %d",
              currServerObj.hostname,
              currServerObj.moneyMax,
              opVars.topServerArr.length - 1
            );
          }
        }
      }

      if (opVars.showDebug) {
        // opVars.topServerArr.forEach(renderServerList, ns);
      }

      // scan recursively
      scanAdjServers(ns, serverHostName, opVars);
    }
  }
}

function renderServerList(serverObj, idx) {
  this.tprintf("%d >> %s", (idx + 1), serverObj.hostname);
  this.tprintf("   - Money max: %s", this.formatNumber(serverObj.moneyMax, 2));
  this.tprintf("   - Org Name: %s", serverObj.organizationName);
  this.tprintf("   - Money avail: %s", this.formatNumber(serverObj.moneyAvailable, 2));
  this.tprintf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  this.tprintf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  this.tprintf("   - Ports open: %s", serverObj.openPortCount);
  this.tprintf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  this.tprintf("   - Curr hack difficulty: %s", serverObj.hackDifficulty);
  this.tprintf("   - Min hack difficulty: %s", serverObj.minDifficulty);
  this.tprintf("   - Base hack difficulty: %s", serverObj.baseDifficulty);
  this.tprintf("   - Server growth: %s", serverObj.serverGrowth);
  this.tprintf("   - Player owned: %s", serverObj.purchasedByPlayer);
  // this.tprintf("   - xxxx: %s", serverObj.xxx);
  this.tprintf("--------------------------");

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