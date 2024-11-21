import Logger from '/f42/classes/Logger.class';
import PurchasedServerManager, { PSrvOpMode } from '/f42/classes/PurchasedServerManager.class';
import { loadGeneralCfgSocket } from '/f42/utility/general-cfg-loader';
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Purchase / Upgrade Servers";
  const scriptDescription = "Purchase new or upgrade existing servers to settings in general config";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  logger.setTailSize(1000, 400);
  flags.addBooleanFlag("p", "Purchase new servers op mode");
  flags.addBooleanFlag("u", "Upgrade existing servers op mode");
  flags.addBooleanFlag("n", "No config socket load");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  if (!flags.isflagSet("p") && !flags.isflagSet("u")) {
    feedback.addUserDefErrorAndEnd("ERROR", "You must select an op mode -p or -u (purchase or upgrade)");
    return;
  }
  else if(flags.isflagSet("p") && flags.isflagSet("u")){
    feedback.addUserDefErrorAndEnd("ERROR", "You can only select one op mode, -p or -u (purchase or upgrade)");
    return;
  }

  // init local config settings
  const pServOpMode = flags.getFlagBoolean("p") ? PSrvOpMode.PURCHASE : PSrvOpMode.UPGRADE;

  // load cfg
  if(!flags.getFlagBoolean("n")){
    loadGeneralCfgSocket(ns);
  }

  // init & run manager class
  const pSrvMan = new PurchasedServerManager(feedback, pServOpMode);
  await pSrvMan.mainLoop();
}