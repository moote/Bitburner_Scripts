import HackManager from "/f42/hack-man/classes/HackManager.class";
import F42Logger from "/f42/classes/f42-logger-class";
import { HMCtrlMsg_ADD_TS } from "/f42/hack-man/classes/HMCtrlMsg.class";
// import F42ClFlagDef from "/f42/classes/f42-cl-flag-def-class";

const F42_HM_DEBUG = true;
const F42_HM_DEBUG_TARGET = [
  "foodnstuff",
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
export async function main(ns: NS): void {
  const scriptTitle = "HackManager:V5";
  const logger = new F42Logger(ns, true, false, true, scriptTitle, true);
  const scriptDescription = "Manages automated hacking";
  const scriptFlags = [];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
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
    if (F42_HM_DEBUG && hackMan.shouldKill) {
      // reset
      hackMan.debugReset();

      // pause to allow reset
      await ns.sleep(1000);

      // dequeue
      // ns.run("scripts/dynamic/v2/peek-msg-stack.js", 1, "-d", "-p", "10");

      // kill
      return;
    }

    hackMan.mainLoop();
    await ns.sleep(250);
  }
}