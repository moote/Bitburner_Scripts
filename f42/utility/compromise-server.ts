import Logger from "/f42/classes/Logger.class";
import { HMCtrlMsg_ADD_TS } from "/f42/hack-man/classes/HMCtrlMsg.class";

/**
 * @param {NS} ns
 * @version 1.0
 * 
 * This script attacks the requested server, opening all ports possible
 * and gaining root access
 */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Compromise Server";
  const scriptDescription = "Attack the requested server, open all ports possible, gain root access";
  const logger = new Logger(ns, true, true, false, scriptTitle);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addStringFlag("target", "Target server's hostname", true);
  flags.addStringFlag("add-tgt-list", "On sucessful compromise, add to HackManager target list", false);

  if(feedback.printHelpAndEnd()){
    return;
  }

  const opVars = {
    targetSeverHostname: flags.getFlagString("target"),
  };
  const userHackLev = ns.getHackingLevel();
  const addAsTarget = flags.getFlagBoolean("add-tgt-list");

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

  const serverHackLev = ns.getServerRequiredHackingLevel(opVars.targetSeverHostname);
  const serverHackPorts = ns.getServerNumPortsRequired(opVars.targetSeverHostname);
  let hasRoot = ns.hasRootAccess(opVars.targetSeverHostname);

  feedback.printTitle();
  feedback.print("- Your hack level is: ", userHackLev);
  feedback.printf("- You can hack %d ports", userMaxHackPorts);
  feedback.printLineSeparator();
  feedback.printHiLi(">> Target server: %s", opVars.targetSeverHostname);
  feedback.printf("Target hack lev: %s", serverHackLev);
  feedback.printf("Target hack ports: %s", serverHackPorts);
  feedback.printf("Existing root: %s", hasRoot ? "Yes" : "No");

  if (hasRoot) {
    feedback.printLineSeparator();
    feedback.printf("Root access exists on this sever, ending");

    if (addAsTarget) {
      // add as target
      HMCtrlMsg_ADD_TS.staticPush(ns, opVars.targetSeverHostname);
      feedback.printf("Added as target");
    }

    feedback.printEnd();
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

  feedback.printLineSeparator();
  feedback.printf("Hack Result: %s", resultStr);
  feedback.printEnd();
}