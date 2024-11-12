import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
import * as f42PortDefs from "/scripts/cfg/port-defs.js";
import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, true, false, true, "MsgStackManipulate");

  let scriptTitle = "Message Stack Manipulate";
  let scriptDescription = "Pop / Clear a message stack";
  let scriptFlags = [
    F42ClFlagDef.getReqIntAny("port-id", "Target message stack port id"),
    F42ClFlagDef.getOptBool("pop-stack", "Target message stack port id"),
    F42ClFlagDef.getOptBool("clear-stack", "Target message stack port id"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  if (!feedback.parsedClFlags["pop-stack"] && !feedback.parsedClFlags["clear-stack"]) {
    feedback.addUserDefError("ERROR", "You must set either --pop-stack or --clear-stack");
    feedback.printFlagErrorsAndEnd(true);
    return;
  }

  if (feedback.parsedClFlags["pop-stack"]) {
    // pop
    try {
      const popResult = F42MessageStack.popMessage(ns, feedback.parsedClFlags["port-id"]);
      if (false !== popResult) {
        feedback.printf(
          "%d popped: %s",
          feedback.parsedClFlags["port-id"],
          JSON.stringify(popResult, null, 2)
        );
      }
      else {
        feedback.printErr("!! Could not pop %d, stack empty", feedback.parsedClFlags["port-id"]);
      }
    }
    catch (e) {
      feedback.printErr("!! Could not pop %d: %s", feedback.parsedClFlags["port-id"], e.message);
    }
  }
  else {
    // clear
    feedback.printErr("!! STACK CLEAR IS NOT IMPLEMENTED YET");
  }

  feedback.printEnd();
}