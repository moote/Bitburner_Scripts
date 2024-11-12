import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/**
 * @param {NS} ns
 * @version 1.0
 * 
 * 
 */
export async function main(ns) {
  throw new Error("DEPRECATED: Use: /scripts/dynamic/v3/auto-targeter.js");

  let opVars = {};
  getUserLevels(ns, opVars);

  ns.tail();
  ns.disableLog("ALL");
  ns.printf("\n--------------------------");
  ns.printf("Auto Targetter");
  ns.printf("- You can hack %d ports", opVars.userMaxHackPorts);
  ns.printf("- Your hack level is: %d", opVars.userHackLev);
  ns.printf("--------------------------");

  while (true) {
    // update levels
    getUserLevels(ns, opVars);
    ns.printf("--------------------------");
    ns.printf("Scanning targets: (%s)", timestampAsBase62Str());
    ns.printf("- level: %d | ports: %d", opVars.reqHackLevel, opVars.reqHackPorts);
    ns.printf("--------------------------");

    // recursivly scan all severs
    scanAdjServers(ns, "home", 0, opVars);
    ns.printf("Waiting...");
    await ns.sleep(1000);
  }
}

function getUserLevels(ns, opVars) {
  opVars.userHackLev = ns.getHackingLevel();
  opVars.userMaxHackPorts = 0;

  if (ns.fileExists("BruteSSH.exe", "home")) {
    opVars.userMaxHackPorts++;
    if (ns.fileExists("FTPCrack.exe", "home")) {
      opVars.userMaxHackPorts++;
      if (ns.fileExists("relaySMTP.exe", "home")) {
        opVars.userMaxHackPorts++;
        if (ns.fileExists("HTTPWorm.exe", "home")) {
          opVars.userMaxHackPorts++;
          if (ns.fileExists("SQLInject.exe", "home")) {
            opVars.userMaxHackPorts++;
          }
        }
      }
    }
  }

  opVars.reqHackLevel = Math.floor(opVars.userHackLev * 0.75);
  opVars.reqHackPorts = opVars.userMaxHackPorts;
}

function scanAdjServers(ns, baseServer, depthCnt, opVars) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  let adjServers = ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let srvHostname = adjServers[i];
      let serverHackLev = ns.getServerRequiredHackingLevel(srvHostname);
      let serverHackPorts = ns.getServerNumPortsRequired(srvHostname);

      let hasRoot = ns.hasRootAccess(srvHostname);
      let canHack = false;

      // test if can hack
      canHack = (serverHackLev <= opVars.reqHackLevel && serverHackPorts <= opVars.reqHackPorts);

      if (hasRoot) {
        // check if thrall files on server
        if (ns.fileExists("", srvHostname)) {

        }
        else {

        }
      }
      else if (canHack) {
        // open ports
        if (serverHackPorts > 0) {
          for (let j = serverHackPorts; j > 0; j--) {
            switch (j) {
              case 5: // SQL
                ns.sqlinject(srvHostname);
                break;
              case 4: // HTTP
                ns.httpworm(srvHostname);
                break;
              case 3: // SMTP
                ns.relaysmtp(srvHostname);
                break;
              case 2: // FTP
                ns.ftpcrack(srvHostname);
                break;
              case 1: // SSH
                ns.brutessh(srvHostname);
                break;
            }
          }
        }

        // nuke
        ns.nuke(srvHostname);

        // re-test root
        hasRoot = ns.hasRootAccess(srvHostname);

        // add as target
        if (hasRoot) {
          // add target
          addTarget();
        }
      }

      ns.printf("Skipping target: %s", srvHostname);

      // scan recursively
      scanAdjServers(ns, srvHostname, depthCnt, opVars);
    }
  }
}

function addTarget(ns, target) {
  // ns.run("/scripts/dynamic/v3/add-target-server.js", 1, "--target", srvHostname);
  ns.printf("Adding target: %s", target);
  return true;
}