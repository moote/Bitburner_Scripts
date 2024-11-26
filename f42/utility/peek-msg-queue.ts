import MsgQueueReader from '/f42/classes/Messaging/MsgQueueReader.class';
import Logger from '/f42/classes/Logger.class';
// import FeedbackRenderer from '/f42/classes/FeedbackRenderer';

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "PeekMsgQ";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const scriptDescription = "Peek a message queue";
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addIntFlag("p", "Target queue port id");
  flags.addBooleanFlag("d", "Dequeue the queue specified by '-p'");

  // validate and check for help request / flag errors
  if (feedback.printHelpAndEnd()) {
    // stop further execution
    return;
  }

  logger.setTailSize(300, 240);

  const mqr = new MsgQueueReader(ns, flags.getFlagNumber("p"));
  let isInitialResize = true;

  if (flags.getFlagBoolean("d")) {
    // dequeue
    const title = ns.sprintf("Dequeue Stack: %s", flags.getFlagNumber("p"));
    logger.tailTitle = title;
    feedback.title = title;
    feedback.printTitle(false);

    let msg = mqr.popMessage();

    while(msg){
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printLineSeparator();
      msg = mqr.popMessage();
    }

    feedback.printEnd();
  }
  else {
    // peek
    logger.tailTitle = ns.sprintf("PeekQ: %s", flags.getFlagNumber("p"));
    
    ns.resizeTail(200, 400);
    while (true) {
      const msg = mqr.peekMessage();
      ns.setTitle(ns.sprintf("PeekQ %d -> %s", flags.getFlagNumber("p"), (!msg ? "EMPTY" : "NOT_EMPTY")));
      ns.clearLog();

      if(isInitialResize){
        isInitialResize = false;
        ns.resizeTail(200, 400);
      }
      
      feedback.printTitle(false);
      feedback.printf(">> p: %d", flags.getFlagNumber("p"));
      feedback.printf(">> message: %s", JSON.stringify(msg, null, 2));
      feedback.printEnd();
      await ns.sleep(250);
    }
  }
}