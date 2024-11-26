import FeedbackRenderer from '/f42/classes/FeedbackRenderer';
import Logger from '/f42/classes/Logger.class';
import { NS, Server } from '@ns'

export async function main(ns : NS) : Promise<void> {
  const scriptTitle = "Watch Server";
  const scriptDescription = "Show live stats on specified server";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  
  flags.addStringFlag("target", "Target to watch", true);
  flags.addBooleanFlag("no-loop", "Run once");

  if(feedback.printHelpAndEnd()){
    return;
  }

  feedback.printTitle();

  const targetHostname = flags.getFlagString("target");
  const noLoop = flags.getFlagBoolean('no-loop');

  if (!ns.serverExists(targetHostname)) {
    feedback.addUserDefErrorAndEnd("target", "Invalid hostname: %s", targetHostname)
    return;
  }

  // check for noloop
  if (noLoop) {
    // start noloop
    watchServerNoLoop(feedback, targetHostname);
  }
  else {
    // start loop
    await watchServerLoop(feedback, targetHostname);
  }
}

/**
 * The watch noloop
 */
function watchServerNoLoop(feedback: FeedbackRenderer, hostname: string) {
  // get server object
  const serverObj = feedback.ns.getServer(hostname);

  // render
  renderServer(feedback, serverObj);
}

/**
 * The watch loop
 */
async function watchServerLoop(feedback: FeedbackRenderer, hostname: string) {
  while (true) {
    // render
    watchServerNoLoop(feedback, hostname);

    // wait
    await feedback.ns.sleep(250);
  }
}

let undef: string;

/**
 * Render to terminal function 
 */
function renderServer(feedback: FeedbackRenderer, serverObj: Server) {
  feedback.ns.clearLog();
  feedback.printTitle();
  feedback.printf(">> %s", serverObj.hostname);
  feedback.printf("   - Money max: %s", feedback.ns.formatNumber(<number>serverObj.moneyMax, 2));
  feedback.printf("   - Money avail: %s", feedback.ns.formatNumber(<number>serverObj.moneyAvailable, 2));
  feedback.printf("   - Curr hack difficulty: %s", feedback.ns.formatNumber(<number>serverObj.hackDifficulty, 2));
  feedback.printf("   - Min hack difficulty: %s", feedback.ns.formatNumber(<number>serverObj.minDifficulty, 2));
  feedback.printf("   - Base hack difficulty: %s", feedback.ns.formatNumber(<number>serverObj.baseDifficulty, 2));
  feedback.printf("   - Server growth: %s", serverObj.serverGrowth);
  feedback.printf("   - Hack lev: %s", serverObj.requiredHackingSkill);
  feedback.printf("   - Hack ports: %s", serverObj.numOpenPortsRequired);
  feedback.printf("   - Ports open: %s", serverObj.openPortCount);
  feedback.printf("   - Has backdoor: %s", serverObj.backdoorInstalled);
  feedback.printf("   - Org Name: %s", serverObj.organizationName);
  feedback.printf("   - Player owned: %s", serverObj.purchasedByPlayer);
  feedback.printEnd();
}