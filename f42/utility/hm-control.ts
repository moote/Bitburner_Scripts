import { HMCtrlMsg_ADD_TS, HMCtrlMsg_CHANGE_OP_MODE, HMCtrlMsg_CHANGE_TT_MODE, HMCtrlMsg_RM_TS } from '/f42/hack-man/classes/HMCtrlMsg.class';
import Logger from '/f42/classes/Logger.class';
import { HMOpMode, TgtSrvOpMode } from '/f42/hack-man/classes/enums';

const DEBUG_MODE = true;

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "HackManager Control Script";
  const scriptDescription = "Control functions of a running HackManager";
  const logger = new Logger(ns, true, true, false, scriptTitle);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addStringFlag("add-tgt", "Target server host name to add");
  flags.addStringFlag("rm-tgt", "Hostname of target server to remove");
  flags.addBooleanFlag("om-hack", "Change opMode to 'hack'");
  flags.addBooleanFlag("om-trade-tgt", "Change opMode to 'trade target'");
  flags.addBooleanFlag("pause-tt", "Pauses server operation (in TT mode)'");
  flags.addBooleanFlag("unpause-tt", "Unauses server operation (in TT mode)'");
  flags.addBooleanFlag("tt-grow-max", "Change to grow-max mode and run'");
  flags.addBooleanFlag("tt-hack-min", "Change to hack-min mode and run'");
  flags.addBooleanFlag("q", "Quiet mode, no tail or logging to terminal");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  if (flags.getFlagBoolean("q")) {
    logger.setQuietMode();
  }
  else {
    feedback.printTitle(false);
  }

  if (flags.isflagSet("add-tgt")) {
    feedback.print("Adding target server: ", flags.getFlagString("add-tgt"));
    if(!DEBUG_MODE) HMCtrlMsg_ADD_TS.staticPush(ns, flags.getFlagString("add-tgt"));
  }
  else if (flags.isflagSet("rm-tgt")) {
    feedback.print("Removing target server: ", flags.getFlagString("rm-tgt"));
    if(!DEBUG_MODE) HMCtrlMsg_RM_TS.staticPush(ns, flags.getFlagString("rm-tgt"));
  }
  else if (flags.getFlagBoolean("om-hack")) {
    feedback.print("Changing op mode to : HACK");
    if(!DEBUG_MODE) HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.HACK);
  }
  else if (flags.getFlagBoolean("om-trade-tgt")) {
    feedback.print("Changing op mode to : TRADE_TGT");
    if(!DEBUG_MODE) HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  }
  else if(flags.getFlagBoolean("pause-tt") ){
    feedback.print("Pause action in TT mode (NOT IMPLEMENTED)");
    // HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  }
  else if(flags.getFlagBoolean("unpause-tt") ){
    feedback.print("Unpause action in TT mode (NOT IMPLEMENTED)");
    // HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  }
  else if (flags.getFlagBoolean("tt-grow-max")) {
    feedback.print("Change to GROW-MAX TT action");
    if(!DEBUG_MODE) HMCtrlMsg_CHANGE_TT_MODE.staticPush(ns, TgtSrvOpMode.MONEY_MAX);
  }
  else if (flags.getFlagBoolean("tt-hack-min")) {
    feedback.print("Change to HACK-MIN TT action");
    if(!DEBUG_MODE) HMCtrlMsg_CHANGE_TT_MODE.staticPush(ns, TgtSrvOpMode.MONEY_MIN);
  }
  else {
    feedback.addUserDefErrorAndEnd("ERROR", "You must select an action!");
  }
}
