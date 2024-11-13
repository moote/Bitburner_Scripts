import { MsgSocketReader } from '/f42/classes/MsgSocketReader.class';
import F42Logger from '/f42/classes/f42-logger-class';
import F42ClFlagDef from '/f42/classes/f42-cl-flag-def-class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "PeekMsgSckt";
  const logger = new F42Logger(ns, false, false, true, scriptTitle, true);
  const scriptDescription = "Peek a message socket";
  const scriptFlags = [
    F42ClFlagDef.getReqIntAny("p", "Target socket port id"),
    F42ClFlagDef.getOptBool("d", "Clear the socket"),
  ];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  logger.setTailSize(300, 240);

  const msr = new MsgSocketReader(ns, feedback.getFlag("p"));
  let isInitialResize = true;

  if (feedback.getFlag("d")) {
    // dequeue
    const title = ns.sprintf("Clear socket: %s", feedback.getFlag("p"));
    logger.tailTitle = title;
    feedback.title = title;
    feedback.printTitle(false);

    let msg = msr.popMessage();

    while(msg){
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printLineSeparator();
      msg = msr.popMessage();
    }

    feedback.printEnd();
  }
  else {
    // peek
    logger.tailTitle = ns.sprintf("PeekSckt: %s", feedback.getFlag("p"));
    
    ns.resizeTail(200, 400);
    while (true) {
      const msg = msr.peekMessage();
      ns.setTitle(ns.sprintf("PeekSckt %d -> %s", feedback.getFlag("p"), (!msg ? "EMPTY" : "NOT_EMPTY")));
      ns.clearLog();

      if(isInitialResize){
        isInitialResize = false;
        ns.resizeTail(200, 400);
      }
      
      feedback.printTitle(false);
      feedback.printf(">> p: %d", feedback.getFlag("p"));
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printf(timestampAsBase62Str());
      feedback.printEnd();
      await ns.sleep(250);
    }
  }
}