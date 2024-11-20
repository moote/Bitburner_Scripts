import HackManager from "/f42/hack-man/classes/HackManager.class";
import Logger from "/f42/classes/Logger.class";
import { HMCtrlMsg_ADD_TS } from "/f42/hack-man/classes/HMCtrlMsg.class";
// import F42ClFlagDef from "/f42/classes/f42-cl-flag-def-class";

const F42_HM_DEBUG = true;
const F42_HM_DEBUG_TARGET: string[] = [
  // "foodnstuff",
  // "nectar-net",
  // "sigma-cosmetics",
  // "joesguns",
  // "hong-fang-tea",
  // -----------
  // "max-hardware",
  // "phantasy",
  // "iron-gym",
  // "zer0",
  // "silver-helix",
  // "the-hub",
  // "johnson-ortho",
  // "omega-net",
];

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "HackManager:V6";
  const scriptDescription = "Manages automated hacking";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);

  // help requested / flag errors
  if (feedback.printHelpAndEnd()) {
    return;
  }

  const hackMan = HackManager.factory(logger);

  feedback.printTitle();
  feedback.print("- Run from: " + ns.getScriptName());

  if (F42_HM_DEBUG) {
    feedback.printHiLi("- DEBUG MODE");
    // auto set target
    for (const target of F42_HM_DEBUG_TARGET) {
      feedback.printHiLi("- DEBUG MODE: ADDING TARGET: %s", target);
      HMCtrlMsg_ADD_TS.staticPush(ns, target);
      await ns.sleep(250);
    }
  }
  else {
    // start the auto targeter
    ns.run("f42/utility/auto-targeter.js");
    feedback.printf("- Starting auto targeter");

    // start thrall
    ns.run("f42/thrall/infector.js");
    feedback.printf("- Starting thrall infector");

    // pause
    await ns.sleep(1000);
  }

  while (true) {
    hackMan.mainLoop();
    await ns.sleep(1500);
  }
}