import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
// import * as f42PortDefs from "/scripts/cfg/port-defs.js";
import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "PeekStack...");
  let scriptTitle = "Peek Message Stack";
  let scriptDescription = "Peek a message stack, defaults to the HackManager control stack";
  let scriptFlags = [
    F42ClFlagDef.getReqIntAny("p", "Target message stack port id"),
    F42ClFlagDef.getOptBool("d", "Dequeue the stack and display each message"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  if (feedback.getFlag("d")) {
    // dequeue
    let title = ns.sprintf("Dequeue Stack: %s", feedback.getFlag("p"));
    logger.tailTitle = title;
    feedback.title = title;
    feedback.printTitle(false);

    let msg;
    
    while(msg = F42MessageStack.popMessage(ns, feedback.getFlag("p"))){
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printLineSeparator();
    }

    feedback.printEnd();
  }
  else {
    // peek
    logger.tailTitle = ns.sprintf("PeekStack: %s", feedback.getFlag("p"));

    while (true) {
      let msg = F42MessageStack.peekMessage(ns, feedback.getFlag("p"));
      ns.setTitle(ns.sprintf("PeekStack %d -> %s", feedback.getFlag("p"), (!msg ? "EMPTY" : "NOT_EMPTY")));
      ns.clearLog();
      feedback.printTitle(false);
      feedback.printf(">> p: %d", feedback.getFlag("p"));
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printf(timestampAsBase62Str());
      feedback.printEnd();
      await ns.sleep(250);
    }
  }
}