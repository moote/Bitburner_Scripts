import { HMCtrlMsg_ADD_TS, HMCtrlMsg_CHANGE_OP_MODE, HMCtrlMsg_CHANGE_TT_MODE, HMCtrlMsg_RM_TS } from '/f42/hack-man/classes/HMCtrlMsg.class';
import F42Logger from '/f42/classes/f42-logger-class';
import F42ClFlagDef from '/f42/classes/f42-cl-flag-def-class';
import { HMOpMode, TgtSrvOpMode } from '/f42/hack-man/classes/enums';

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "HackManager Control Script";
  const logger = new F42Logger(ns, true, true, false, scriptTitle);
  const scriptDescription = "Control functions of a running HackManager";
  const scriptFlags = [
    F42ClFlagDef.getOptStrAny("add-tgt", "Target server host name to add"),
    F42ClFlagDef.getOptStrAny("rm-tgt", "Hostname of target server to remove"),
    F42ClFlagDef.getOptBool("om-hack", "Change opMode to 'hack'"),
    F42ClFlagDef.getOptBool("om-trade-tgt", "Change opMode to 'trade target'"),
    F42ClFlagDef.getOptBool("pause-tt", "Pauses server operation (in TT mode)'"),
    F42ClFlagDef.getOptBool("unpause-tt", "Unauses server operation (in TT mode)'"),
    F42ClFlagDef.getOptBool("tt-grow-max", "Change to grow-max mode and run'"),
    F42ClFlagDef.getOptBool("tt-hack-min", "Change to hack-min mode and run'"),
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
    feedback.printTitle(false);
  }

  if(feedback.getFlag("add-tgt")){
    feedback.print("Adding target server: ", feedback.getFlag("add-tgt"));
    HMCtrlMsg_ADD_TS.staticPush(ns, feedback.getFlag("add-tgt"));
  }
  else if(feedback.getFlag("rm-tgt") ){
    feedback.print("Removing target server: ", feedback.getFlag("rm-tgt"));
    HMCtrlMsg_RM_TS.staticPush(ns, feedback.getFlag("rm-tgt"));
  }
  else if(feedback.getFlag("om-hack") ){
    feedback.print("Changing op mode to : HACK");
    HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.HACK);
  }
  else if(feedback.getFlag("om-trade-tgt") ){
    feedback.print("Changing op mode to : TRADE_TGT");
    HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  }
  // else if(feedback.getFlag("pause-tt") ){
  //   feedback.print("Pause action in TT mode");
  //   HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  // }
  // else if(feedback.getFlag("unpause-tt") ){
  //   feedback.print("Unpause action in TT mode");
  //   HMCtrlMsg_CHANGE_OP_MODE.staticPush(ns, HMOpMode.TRADE_TGT);
  // }
  else if(feedback.getFlag("tt-grow-max") ){
    feedback.print("Change to GROW-MAX TT action");
    HMCtrlMsg_CHANGE_TT_MODE.staticPush(ns, TgtSrvOpMode.MONEY_MAX);
  }
  else if(feedback.getFlag("tt-hack-min") ){
    feedback.print("Change to HACK-MIN TT action");
    HMCtrlMsg_CHANGE_TT_MODE.staticPush(ns, TgtSrvOpMode.MONEY_MIN);
  }
  else{
    feedback.addUserDefErrorAndEnd("ERROR", "You must select an action!");
  }
}
