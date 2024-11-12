import F42Logger from '/scripts/classes/f42-logger-class.js';
// import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import F42PortHandler from "/scripts/classes/f42-port-handler-class.js";
import { F42_HM_TARGETS } from "/scripts/cfg/port-defs.js";
import { timestampAsBase62Str, getActivityVisStr } from "/scripts/utility/utility-functions.js";

const AT_IS_DEBUG = false;
const AT_LEV_MULTI = 0.75;

/**
 * @param {NS} ns
 * @version 3
 */
export async function main(ns) {
  // make sure not already running
  vaildateSingleton(ns);

  let logger = new F42Logger(ns, false, false, true, "AutoTargeter:v3", true);
  let scriptTitle = "AutoTargeter:v3";
  let scriptDescription = "Finds valid targets and posts them to HackManager";
  let scriptFlags = [];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  // init
  let portHandler = new F42PortHandler(ns, logger);
  let opVars = {
    pHandle: portHandler.getPortHandle(F42_HM_TARGETS.id, false, F42_HM_TARGETS.key),
    minSrvMoney: 1e6,
    targetList: false,
    dBugStr: [],
  };

  while (true) {
    // update levels
    getUserLevels(feedback, opVars);

    // start output
    feedback.ns.clearLog();
    feedback.printTitle(false);
    feedback.printf("- You can hack %d ports", opVars.userMaxHackPorts);
    feedback.printf("- Your hack level is: %d", opVars.userHackLev);
    feedback.printf("- Targeting: level %d | ports: %d", opVars.reqHackLevel, opVars.reqHackPorts);
    feedback.printLineSeparator();

    // check if HackManager running
    if (isHackManRunning(feedback, opVars)) {
      feedback.printSubTitle("Targets Added:");

      if (opVars.targetList.length == 0) {
        feedback.printf("- none");
      }
      else {
        for (const addedTgt of opVars.targetList) {
          feedback.printf("- %s", addedTgt);
        }
      }

      feedback.printSubTitle("Scanning: (%s)", timestampAsBase62Str());

      // recursivly scan all severs
      scanAdjServers(feedback, "home", 0, opVars);

      // debug
      if (AT_IS_DEBUG) {
        for (const dbug of opVars.dBugStr) {
          feedback.ns.tprintf(dbug);
        }

        feedback.ns.tprintf("--------------------------");
      }
    }

    feedback.printf(getActivityVisStr(feedback.ns, "Waiting "));
    await feedback.ns.sleep(AT_IS_DEBUG ? 20000 : 5000);
  }
}

function vaildateSingleton(ns) {
  for (const psInfo of ns.ps()) {
    if (psInfo.filename == ns.getScriptName() && ns.pid != psInfo.pid) {
      throw new Error("Auto targeter not started, already running; only process can run at a time.\n* Running process not affected.");
    }
  }
}

function isHackManRunning(feedback, opVars) {
  // peek target list
  let portList = opVars.pHandle.peek();

  if (feedback.ns.isRunning("scripts/dynamic/v3/hack-manager.js")) {
    feedback.printHiLi("- HackManager running");
    if (!portList) {
      // port list not loaded yet, wait
      return false;
    }
    else {
      // copy list
      opVars.targetList = portList;
      return true;
    }
  }
  else {
    // not running, clear target list & port
    opVars.targetList = false;

    if (portList !== false) {
      opVars.pHandle.clear();
      feedback.printErr("- HackManager not started: Clearing port");
    }
    else {
      feedback.printErr("- HackManager not started: Port empty");
    }

    return false;
  }
}

function getUserLevels(feedback, opVars) {
  opVars.userHackLev = feedback.ns.getHackingLevel();
  opVars.userMaxHackPorts = 0;

  if (feedback.ns.fileExists("BruteSSH.exe", "home")) {
    opVars.userMaxHackPorts++;
    if (feedback.ns.fileExists("FTPCrack.exe", "home")) {
      opVars.userMaxHackPorts++;
      if (feedback.ns.fileExists("relaySMTP.exe", "home")) {
        opVars.userMaxHackPorts++;
        if (feedback.ns.fileExists("HTTPWorm.exe", "home")) {
          opVars.userMaxHackPorts++;
          if (feedback.ns.fileExists("SQLInject.exe", "home")) {
            opVars.userMaxHackPorts++;
          }
        }
      }
    }
  }

  opVars.reqHackLevel = Math.floor(opVars.userHackLev * AT_LEV_MULTI);
  opVars.reqHackPorts = opVars.userMaxHackPorts;
}

function scanAdjServers(feedback, baseServer, depthCnt, opVars) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  let adjServers = feedback.ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let srvHostname = adjServers[i];
      let serverHackLev = feedback.ns.getServerRequiredHackingLevel(srvHostname);
      let serverHackPorts = feedback.ns.getServerNumPortsRequired(srvHostname);
      let srvMaxMoney = feedback.ns.getServerMaxMoney(srvHostname);

      let hasRoot = feedback.ns.hasRootAccess(srvHostname);
      let canHack = false;
      let tgtDBug = [];
      let skipTarget = false;

      // test if can hack
      canHack = (serverHackLev <= opVars.reqHackLevel && serverHackPorts <= opVars.reqHackPorts);

      tgtDBug.push(feedback.ns.sprintf(
        ">>> Scan %d|%s $%s (lev %d <> reLev %d):",
        depthCnt,
        srvHostname,
        feedback.ns.formatNumber(srvMaxMoney),
        serverHackLev,
        opVars.reqHackLevel
      ));

      if(srvMaxMoney < opVars.minSrvMoney){
        tgtDBug.push("SKIP: tooPoor");
        skipTarget = true;
      }

      if (!skipTarget && !opVars.targetList.includes(srvHostname)) {
        if (hasRoot && canHack) {
          // already root and not in list, will add
          tgtDBug.push("hasRoot");
        }
        else if (canHack) {
          tgtDBug.push("canHack");

          // open ports
          if (serverHackPorts > 0) {
            for (let j = serverHackPorts; j > 0; j--) {
              switch (j) {
                case 5: // SQL
                  feedback.ns.sqlinject(srvHostname);
                  break;
                case 4: // HTTP
                  feedback.ns.httpworm(srvHostname);
                  break;
                case 3: // SMTP
                  feedback.ns.relaysmtp(srvHostname);
                  break;
                case 2: // FTP
                  feedback.ns.ftpcrack(srvHostname);
                  break;
                case 1: // SSH
                  feedback.ns.brutessh(srvHostname);
                  break;
              }
            }
          }

          // nuke
          feedback.ns.nuke(srvHostname);
        }
        else {
          tgtDBug.push("SKIP: noRoot/noHack)");
          skipTarget = true;
        }

        if (!skipTarget) {
          // re-test root
          hasRoot = feedback.ns.hasRootAccess(srvHostname);

          // add as target
          if (hasRoot) {
            // add target and stop looking any further (continue next loop)
            addTarget(feedback, srvHostname);
            tgtDBug.push(">TARGETED<");
            if (!AT_IS_DEBUG) {
              return;
            }
          }
          else {
            tgtDBug.push("hackFail");
          }
        }
      }
      else {
        if(opVars.targetList.includes(srvHostname)){
          tgtDBug.push(">EXISTING<");
        }
      }

      if (AT_IS_DEBUG) {
        opVars.dBugStr.push(tgtDBug.join(" > "));
      }

      // scan recursively
      scanAdjServers(feedback, srvHostname, depthCnt, opVars);
    }
  }
}

function addTarget(feedback, target) {
  if (AT_IS_DEBUG) {
    feedback.printf("DEBUG_MODE: Target found, not added: %s", target);
    feedback.ns.tprintf(">>>>>> DEBUG_MODE: Target found, not added: %s", target);
    return true;
  }
  else {
    feedback.printf("Target found and added: %s", target);
    feedback.ns.run("/scripts/dynamic/v3/add-target-server.js", 1, "--target", target, "-q");
  }
}