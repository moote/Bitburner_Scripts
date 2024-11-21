import FeedbackRenderer from '/f42/classes/FeedbackRenderer';
import Logger from '/f42/classes/Logger.class';
import { NS, Server } from '@ns'

const HACK_LEV_DIVISOR = 2;
const DEFAULT_NUM_SERVERS = 3;

export interface FindRichestOpVars_Interface {
  reqMaxHackLevel: number;
  reqMaxHackPorts: number;
  topServerArr: Server[];
  topServerCnt: number;
  showDebug: boolean;
}

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Find Richest Servers";
  const scriptDescription = "Finds most profitable hackable servers";
  const logger = new Logger(ns, false, true, false, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addIntFlag("max-lev", "Max server hack level; defaults to 50% of your level", false, (ns.getHackingLevel() / HACK_LEV_DIVISOR));
  flags.addIntFlag("max-ports", "Max number of server ports to hack; defaults to the total ports you can open", false, -1);
  flags.addIntFlag("num-servers", "Number of server results to show; defaults to " + DEFAULT_NUM_SERVERS, false, DEFAULT_NUM_SERVERS);
  flags.addBooleanFlag("debug", "Turn on verbose logging");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  const opVars: FindRichestOpVars_Interface = {
    reqMaxHackLevel: flags.getFlagNumber("max-lev"),
    reqMaxHackPorts: flags.getFlagNumber("max-ports"),
    topServerArr: [],
    topServerCnt: flags.getFlagNumber("num-servers"),
    showDebug: flags.getFlagBoolean("debug")
  };

  feedback.printTitle();

  // get user hack level
  const userHackLev = ns.getHackingLevel();

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

  // set defaluts / test reauested values
  const hackLevDefault = opVars.reqMaxHackLevel === userHackLev;
  let hackPortsDefault = false;

  if (opVars.reqMaxHackLevel > userHackLev) {
    feedback.addUserDefErrorAndEnd("max-lev", "Your requested hack level (%d) is greater than your hack level (%d)", opVars.reqMaxHackLevel, userHackLev);
    return;
  }

  if (opVars.reqMaxHackPorts == -1) {
    opVars.reqMaxHackPorts = userMaxHackPorts;
    hackPortsDefault = true;
  }
  else if (opVars.reqMaxHackPorts > userMaxHackPorts) {
    feedback.addUserDefErrorAndEnd("max-ports", "You requested severs with %d ports, but you can only hack %d", opVars.reqMaxHackPorts, userMaxHackPorts);
    return;
  }

  // ns.tprintf(">> %s", JSON.stringify(opVars));

  feedback.printf("- Your hack level is: %d", userHackLev);
  feedback.printf("- You can hack %d ports", userMaxHackPorts);
  feedback.printLineSeparator();
  feedback.printf("Target conditions:");
  feedback.printf("- Find most valuable server");
  feedback.printf("- Max server hack lev: %d%s", opVars.reqMaxHackLevel, (hackLevDefault ? " (default)" : " (user defined)"));
  feedback.printf("- Max server hack ports: %d%s", opVars.reqMaxHackPorts, (hackPortsDefault ? " (default)" : " (user defined)"));
  feedback.printSubTitle("Top %d servers:", opVars.topServerCnt);

  // recursivly scan all severs
  scanAdjServers(feedback, "home", opVars);

  // render list
  for(let i =0; i < opVars.topServerArr.length; i++){
    renderServerList(feedback, opVars.topServerArr[i], i);
  }

  feedback.printEnd();
}

function scanAdjServers(feedback: FeedbackRenderer, baseServer: string, opVars: FindRichestOpVars_Interface) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }

  const adjServers = feedback.ns.scan(baseServer);

  if (baseServer === "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      const serverHostName = adjServers[i];
      const currServerObj = feedback.ns.getServer(serverHostName);

      // test server is viable
      if (
        <number>currServerObj.requiredHackingSkill <= opVars.reqMaxHackLevel
        && <number>currServerObj.numOpenPortsRequired <= opVars.reqMaxHackPorts
      ) {
        // server viable
        let serverAdded = false;

        for (let topIdx = 0; topIdx < opVars.topServerArr.length; topIdx++) {
          const topServerObj = opVars.topServerArr[topIdx];

          if (opVars.showDebug) {
            feedback.ns.printf(
              "Compare %s (%s) <> %s (%s) @ idx %d",
              currServerObj.hostname,
              feedback.ns.formatNumber(<number>currServerObj.moneyMax, 2),
              topServerObj.hostname,
              feedback.ns.formatNumber(<number>topServerObj.moneyMax, 2),
              topIdx
            );
          }

          if (<number>currServerObj.moneyMax >= <number>topServerObj.moneyMax) {
            opVars.topServerArr.splice(topIdx, 0, currServerObj);

            if (opVars.showDebug) {
              feedback.ns.printf(
                "Inserting %s (%s) at idx %d",
                currServerObj.hostname,
                feedback.ns.formatNumber(<number>currServerObj.moneyMax, 2),
                topIdx
              );
            }

            if (opVars.topServerArr.length > opVars.topServerCnt) {
              if (opVars.showDebug) {
                feedback.ns.printf(
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
            feedback.ns.printf(
              "Server list not full pushing %s (%d) to idx %d",
              currServerObj.hostname,
              <number>currServerObj.moneyMax,
              opVars.topServerArr.length - 1
            );
          }
        }
      }

      if (opVars.showDebug) {
        // opVars.topServerArr.forEach(renderServerList, ns);
      }

      // scan recursively
      scanAdjServers(feedback, serverHostName, opVars);
    }
  }
}

/**
 * "this" is the feedback instance
 * 
 * @param serverObj 
 * @param idx 
 */
function renderServerList(feedback: FeedbackRenderer, serverObj: Server, idx: number): void {
  feedback.printHiLi("%d >> %s", (idx + 1), serverObj.hostname);
  feedback.printf("   - Money max: %s", feedback.ns.formatNumber(<number>serverObj.moneyMax, 2));
  feedback.printf("   - Org Name: %s", serverObj.organizationName);
  feedback.printf("   - Money avail: %s", feedback.ns.formatNumber(<number>serverObj.moneyAvailable, 2));
  feedback.printf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  feedback.printf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  feedback.printf("   - Ports open: %s", serverObj.openPortCount);
  feedback.printf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  feedback.printf("   - Curr hack difficulty: %s", serverObj.hackDifficulty);
  feedback.printf("   - Min hack difficulty: %s", serverObj.minDifficulty);
  feedback.printf("   - Base hack difficulty: %s", serverObj.baseDifficulty);
  feedback.printf("   - Server growth: %s", serverObj.serverGrowth);
  feedback.printf("   - Player owned: %s", serverObj.purchasedByPlayer);
}