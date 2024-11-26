import { NS } from '@ns'
import { default as StatsSymbol } from './classes/stats/StonkSymbol.class';
import Logger from '/f42/classes/Logger.class';
// import SimpleTrader from '/f42/stonks/classes/stats/SimpleTrader.class';

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Stonk Trade";
  const scriptDescription = "Simple stonk auto-trader";
  const logger = new Logger(ns, true, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  flags.addStringFlag("s", "Stonk symbol", true);
  flags.addIntFlag("b", "Starting balance (int) for trader; only used if no ledger entry found; defaults to 100M.", false, 100000000);
  flags.addIntFlag("c", "+ve number credits balance, -ve debits balance", false, 0);
  flags.addBooleanFlag("m", "Make StonkSymbol post render to queue");
  flags.addBooleanFlag("d", "Run in debug mode, no trading");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  const stonkSym = new StatsSymbol(
    feedback,
    flags.getFlagString("s"),
    true,
    flags.isflagSet("m"), // postToQ
    flags.getFlagNumber("b"),
    flags.getFlagBoolean("d")
  );

  if(flags.getFlagNumber("c") > 0){
    stonkSym.trader?.creditBalance(flags.getFlagNumber("c"));
  }
  else if(flags.getFlagNumber("c") < 0){
    stonkSym.trader?.debitBalance(0 - flags.getFlagNumber("c"));
  }

  if(flags.isflagSet("m")){
    logger.setQuietMode();
  }

  await stonkSym.stonkWatch();
}