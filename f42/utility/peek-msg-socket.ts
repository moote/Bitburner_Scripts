import { MsgSocketReader } from '/f42/classes/MsgSocketReader.class';
import Logger from '/f42/classes/Logger.class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "PeekMsgSckt";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const scriptDescription = "Peek a message socket";
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);

  feedback.flagValidator.addIntFlag("p", "The port number of the socket you want to watch", true);
  feedback.flagValidator.addBooleanFlag("d", "Dequeue the socket specified with '-p'");

  // validate and check for help request / flag errors
  if (feedback.printHelpAndEnd()) {
    // stop further execution
    return false;
  }

  ns.tprint("STOP STOP STOP");
  return;

  const flags = feedback.flagValidator;

  logger.setTailSize(300, 240);

  const msr = new MsgSocketReader(ns, flags.getFlagNumber("p"));
  let isInitialResize = true;

  if (flags.getFlag("d")) {
    // dequeue
    const title = ns.sprintf("Clear socket: %s", flags.getFlag("p"));
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