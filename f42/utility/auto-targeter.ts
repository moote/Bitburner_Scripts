import Logger from "/f42/classes/Logger.class";
import FeedbackRenderer from "/f42/classes/FeedbackRenderer";
import HackManager from "/f42/hack-man/classes/HackManager.class";
import { timestampAsBase62Str, getActivityVisStr } from "/f42/utility/utility-functions";
import HMTgtSrvListMsgReader from "/f42/hack-man/classes/HMTgtSrvListMsgReader.class";

const AT_IS_DEBUG = false;
const AT_LEV_MULTI = 0.75;

interface AT_OpVarsInterface {
  tgtSrvListMsgReader: HMTgtSrvListMsgReader,
  userHackLev: number,
  userMaxHackPorts: number,
  reqHackLevel: number,
  reqHackPorts: number,
  minSrvMoney: number;
  targetList: string[];
  dBugStr: string[];
}

/**
 * @param {NS} ns
 * @version 5
 */
export async function main(ns: NS): Promise<void>{
  // make sure not already running
  vaildateSingleton(ns);

  const scriptTitle = "AutoTargeter:v5";
  const scriptDescription = "Finds valid targets and posts them to HackManager";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);

  if (feedback.printHelpAndEnd()) {
    return;
  }

  // init
  const opVars: AT_OpVarsInterface = {
    tgtSrvListMsgReader: new HMTgtSrvListMsgReader(ns),
    userHackLev: 0,
    userMaxHackPorts: 0,
    reqHackLevel: 0,
    reqHackPorts: 0,
    minSrvMoney: 10000000000,
    targetList: [],
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

        feedback.printLineSeparator();
      }
    }

    feedback.printf(getActivityVisStr(feedback.ns, "Waiting "));
    await feedback.ns.sleep(AT_IS_DEBUG ? 20000 : 5000);
  }
}

function vaildateSingleton(ns: NS) {
  for (const psInfo of ns.ps()) {
    if (psInfo.filename == ns.getScriptName() && ns.pid != psInfo.pid) {
      throw new Error("Auto targeter not started, already running; only process can run at a time.\n* Running process not affected.");
    }
  }
}

function isHackManRunning(feedback: FeedbackRenderer, opVars: AT_OpVarsInterface) {
  // peek target list
  const portList = opVars.tgtSrvListMsgReader.peekMessage();

  if (feedback.ns.isRunning("f42/hack-man/hack-manager.js")) {
    feedback.printHiLi("- HackManager running");
    if (portList === false) {
      // port list not loaded yet, wait
      return false;
    }
    else {
      // copy list
      opVars.targetList = portList.targets;
      return true;
    }
  }
  else {
    // not running, clear target list & port
    opVars.targetList = [];

    if (portList !== false) {
      opVars.tgtSrvListMsgReader.popMessage();
      feedback.printErr("- HackManager not started: Clearing port");
    }
    else {
      feedback.printErr("- HackManager not started: Port empty");
    }

    return false;
  }
}

function getUserLevels(feedback:FeedbackRenderer, opVars: AT_OpVarsInterface) {
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

function scanAdjServers(feedback: FeedbackRenderer, baseServer: string, depthCnt: number, opVars: AT_OpVarsInterface) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  const adjServers = feedback.ns.scan(baseServer);

  if (baseServer == "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      const srvHostname = adjServers[i];
      const serverHackLev = feedback.ns.getServerRequiredHackingLevel(srvHostname);
      const serverHackPorts = feedback.ns.getServerNumPortsRequired(srvHostname);
      const srvMaxMoney = feedback.ns.getServerMaxMoney(srvHostname);

      let hasRoot = feedback.ns.hasRootAccess(srvHostname);
      let canHack = false;
      const tgtDBug = [];
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

      if (srvMaxMoney < opVars.minSrvMoney) {
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
        if (opVars.targetList.includes(srvHostname)) {
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

function addTarget(feedback: FeedbackRenderer, target: string): void {
  if (AT_IS_DEBUG) {
    feedback.printf("DEBUG_MODE: Target found, not added: %s", target);
    feedback.ns.tprintf(">>>>>> DEBUG_MODE: Target found, not added: %s", target);
  }
  else {
    feedback.printf("Target found and added: %s", target);
    HackManager.addTargetServer(feedback.ns, target);
  }
}