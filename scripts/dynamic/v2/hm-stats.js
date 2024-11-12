import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42PortHandler from '/scripts/classes/f42-port-handler-class.js';
// import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import { F42_HM_STATS } from "/scripts/cfg/port-defs.js";
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "HackManager Stats", true);
  let scriptTitle = "Hack Manager";
  let scriptDescription = "Displays content of HM stats port";
  let scriptFlags = [];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let portHandler = new F42PortHandler(ns, logger);
  let statsPh = portHandler.getPortHandle(F42_HM_STATS.id, false, F42_HM_STATS.key);
  let statsData;

  while(true){
    ns.clearLog();
    feedback.printTitle();
    feedback.printf(JSON.stringify(statsPh.peek(), null, 2));
    feedback.printf(timestampAsBase62Str());

    await ns.sleep(750);
  }
}