import Logger from '/f42/classes/Logger.class';
import { HMCtrlMsg_ADD_TS } from '/f42/hack-man/classes/HMCtrlMsg.class';

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "AddTargetServer";
  const scriptDescription = "Add a target sever to the HackManager list";
  const logger = new Logger(ns, false, false, true, scriptTitle);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  flags.addStringFlag("target", "Target server host name to add", true);
  flags.addBooleanFlag("q", "Quiet mode, no tail or logging to terminal");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  if (flags.getFlagBoolean("q")) {
    logger.setQuietMode();
  }
  else {
    feedback.printTitle();
  }

  HMCtrlMsg_ADD_TS.staticPush(ns, flags.getFlagString("target"));
}
