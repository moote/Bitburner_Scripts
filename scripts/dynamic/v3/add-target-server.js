import F42HackManager from '/scripts/classes/f42-hack-manager-class.js';
import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "AddTargetServer");

  let scriptTitle = "Add Target Server";
  let scriptDescription = "Add a target sever to the HackManager list, or force backup of list with --force-bup";
  let scriptFlags = [
    F42ClFlagDef.getOptStrAny("target", "Target server host name to add"),
    F42ClFlagDef.getOptBool("force-bup", "Force HackManager object write to file"),
    F42ClFlagDef.getOptBool("reset-hack-manager", "Rest the HackManager object, wipes the target server list etc."),
    F42ClFlagDef.getOptBool("clear-actions", "Clear actions and force to reanalyse all targets; outstanding jobs will be dropped"),
    F42ClFlagDef.getOptBool("q", "Quiet mode, no tail or logging to terminal"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  if(feedback.getFlag("q")){
    logger.setQuietMode();
  }
  else{
    feedback.printTitle();
  }

  if(feedback.getFlag("target") == "" && !feedback.getFlag("force-bup") && !feedback.getFlag("reset-hack-manager") && !feedback.getFlag("clear-actions")){
    feedback.addUserDefError("ERROR", "You must set either --target or --force-bup or --reset-hack-manager or --clear-actions");
    feedback.printFlagErrorsAndEnd(true);
  }
  else if(feedback.getFlag("force-bup")){
    F42HackManager.forceSaveHMO(ns);
  }
  else if(feedback.getFlag("reset-hack-manager")){
    F42HackManager.resetHackManagerObject(ns);
  }
  else if(feedback.getFlag("clear-actions")){
    F42HackManager.clearActions(ns);
  }
  else{
    F42HackManager.addTargetServer(ns, feedback.parsedClFlags.target);
  }
}
