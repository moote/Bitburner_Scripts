import { HMCtrlMsg_ADD_TS } from '/f42/hack-man/classes/HMCtrlMsg.class';
import F42Logger from '/f42/classes/f42-logger-class';
import F42ClFlagDef from '/f42/classes/f42-cl-flag-def-class';

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "AddTargetServer";
  const logger = new F42Logger(ns, false, false, true, scriptTitle);
  const scriptDescription = "Add a target sever to the HackManager list";
  const scriptFlags = [
    F42ClFlagDef.getOptStrAny("target", "Target server host name to add"),
    // F42ClFlagDef.getOptBool("clear-actions", "Clear actions and force to reanalyse all targets; outstanding jobs will be dropped"),
    F42ClFlagDef.getOptBool("q", "Quiet mode, no tail or logging to terminal"),
  ];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  if (feedback.getFlag("q")) {
    logger.setQuietMode();
  }
  else {
    feedback.printTitle();
  }

  // if(feedback.getFlag("target") == "" && !feedback.getFlag("clear-actions")){
  if (feedback.getFlag("target") == "" && !feedback.getFlag("clear-actions")) {
    feedback.addUserDefError("ERROR", "You must set either --target or --force-bup or --clear-actions");
    feedback.printFlagErrorsAndEnd(true);
  }
  // else if(feedback.getFlag("clear-actions")){
  //   HackManager.clearActions(ns);
  // }
  else {
    HMCtrlMsg_ADD_TS.staticPush(ns, feedback.parsedClFlags.target);
  }
}
