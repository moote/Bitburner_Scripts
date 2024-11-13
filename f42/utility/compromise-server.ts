import { HMCtrlMsg_ADD_TS } from "/f42/hack-man/classes/HMCtrlMsg.class";

/**
 * @param {NS} ns
 * @version 1.0
 * 
 * This script attacks the requested server, opening all ports possible
 * and gaining root access
 */
export async function main(ns: NS): void {
  const opVars = {
    targetSeverHostname: "",
  };

  ns.tprintf("\n--------------------------");
  ns.tprintf("Compromise Server");

  if (ns.args.length < 1) {
    ns.tprintf("- This script attacks the requested server, opening all ports possible and gaining root access");
    ns.tprintf("Usage: run srv-compromise.js [targetServerHostname: string] [addAsTarget?: bool]");
    ns.tprintf("- targetServerHostname: the host to target, required");
    ns.tprintf("- addAsTarget (optional): if true, add to target server list for PortHandler if compromise is a success");
    ns.tprintf("!! You must set all required args !!");
    return;
  }

  const userHackLev = ns.getHackingLevel();
  opVars.targetSeverHostname = ns.args[0];

  const addAsTarget = ns.args[1] || false;

  // calc the max number of ports we can open
  let userMaxHackPorts = 0;

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

  ns.tprintf("- Your hack level is: %d", userHackLev);
  ns.tprintf("- You can hack %d ports", userMaxHackPorts);

  ns.tprintf("--------------------------");
  ns.tprintf("Target server: %s", opVars.targetSeverHostname);

  const serverHackLev = ns.getServerRequiredHackingLevel(opVars.targetSeverHostname);
  const serverHackPorts = ns.getServerNumPortsRequired(opVars.targetSeverHostname);
  let hasRoot = ns.hasRootAccess(opVars.targetSeverHostname);

  ns.tprintf("Target hack lev: %s", serverHackLev);
  ns.tprintf("Target hack ports: %s", serverHackPorts);
  ns.tprintf("Existing root: %s", hasRoot ? "Yes" : "No");

  if (hasRoot) {
    ns.tprintf("--------------------------");
    ns.tprintf("Root access exists on this sever, ending");

    if (addAsTarget) {
      // add as target
      HMCtrlMsg_ADD_TS.staticPush(ns, opVars.targetSeverHostname);
      ns.tprintf("Added as target");
    }

    ns.tprintf("--------------------------");
    ns.tprintf("END");
    return;
  }

  let resultStr = "";
  const canHack = (serverHackLev <= userHackLev && serverHackPorts <= userMaxHackPorts);

  if (canHack) {
    // open ports
    if (serverHackPorts > 0) {
      for (let j = serverHackPorts; j > 0; j--) {
        switch (j) {
          case 5: // SQL
            ns.sqlinject(opVars.targetSeverHostname);
            resultStr += (" | sqlinject");
            break;
          case 4: // HTTP
            ns.httpworm(opVars.targetSeverHostname);
            resultStr += (" | httpworm");
            break;
          case 3: // SMTP
            ns.relaysmtp(opVars.targetSeverHostname);
            resultStr += (" | relaysmtp");
            break;
          case 2: // FTP
            ns.ftpcrack(opVars.targetSeverHostname);
            resultStr += (" | ftpcrack");
            break;
          case 1: // SSH
            ns.brutessh(opVars.targetSeverHostname);
            resultStr += (" | brutessh");
            break;
        }
      }
    }

    // nuke
    ns.nuke(opVars.targetSeverHostname);

    // re-test root
    hasRoot = ns.hasRootAccess(opVars.targetSeverHostname);

    if (hasRoot) {
      resultStr += (" | nuked | !HACK_SUCCEEDED!");

      if (addAsTarget) {
        // add as target for PortHandler
        resultStr += (" | TARGET_ADDED");
        HMCtrlMsg_ADD_TS.staticPush(ns, opVars.targetSeverHostname);
      }
    }
    else {
      resultStr += (" | !NUKE_FAIL!");
    }
  }
  else {
    resultStr += (" | !HACK_IMPOSSIBLE!");

    if (serverHackLev > userHackLev) {
      resultStr += (" | usr_hack_level_too_low");
    }

    if (serverHackPorts > userMaxHackPorts) {
      resultStr += (" | usr_hack_ports_too_low");
    }
  }

  ns.tprintf("--------------------------");
  ns.tprintf("Hack Result: %s", resultStr);
  ns.tprintf("--------------------------");
  ns.tprintf("END");
}