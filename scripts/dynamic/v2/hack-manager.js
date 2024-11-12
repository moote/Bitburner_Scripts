import F42HackManager from '/scripts/classes/f42-hack-manager-class.js';
import F42Logger from '/scripts/classes/f42-logger-class.js';
// import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';

const F42_HM_DEBUG = false;
const F42_HM_DEBUG_TARGET = "zer0";

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "F42HackManager", true);
  let hackMan = new F42HackManager(ns, logger);

  let scriptTitle = "Hack Manager";
  let scriptDescription = "Manages automated hacking";
  let scriptFlags = [];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  feedback.printTitle();
  
  if(F42_HM_DEBUG){
    // auto set target
    F42HackManager.addTargetServer(ns, F42_HM_DEBUG_TARGET);
  }

  while(true){
    if(F42_HM_DEBUG && hackMan.shouldKill){
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
    await ns.sleep(500);
  }
}