import F42HackManager from "/scripts/dynamic/v3/hack-manager-class.js";
import F42Logger from "/scripts/classes/f42-logger-class.js";
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';

const F42_HM_DEBUG = false;
const F42_HM_DEBUG_TARGET = [
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
export async function main(ns) {
  let logger = new F42Logger(ns, true, false, true, "HackManagerV3", true);

  let scriptTitle = "Hack Manager V3";
  let scriptDescription = "Manages automated hacking";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("l", "Load from file"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let hackMan = F42HackManager.factory(ns, logger, feedback.getFlag("l"));

  feedback.printTitle();

  if (F42_HM_DEBUG) {
    // auto set target
    for (const target of F42_HM_DEBUG_TARGET) {
      F42HackManager.addTargetServer(ns, target);
      await ns.sleep(250);
    }
  }
  else {
    // start the auto targeter
    ns.run("scripts/dynamic/v3/auto-targeter.js");
    feedback.printf("- Starting auto targeter");

    // start thrall
    ns.run("/scripts/dynamic/v3/thrall/infector.js");
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