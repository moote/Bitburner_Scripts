import { NS } from '@ns'
import { default as StatsSymbol } from './classes/stats/StonkSymbol.class';
import Logger from '/f42/classes/Logger.class';
// import SimpleTrader from '/f42/stonks/classes/stats/SimpleTrader.class';

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Stonk Test";
  const scriptDescription = "Stonk trading testing";
  const logger = new Logger(ns, true, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  flags.addStringFlag("s", "Stonk symbol", true);
  flags.addBooleanFlag("d", "Run in debug mode, no trading");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  // await ns.stock.nextUpdate();
  // const stckSym = "WDS";
  // const numShares = 100;
  // let balance = 500000;

  // const tradePurchCost = ns.stock.getPurchaseCost(stckSym, 100, "Long");
  // const sharePurchCost = ns.stock.buyStock(stckSym, 100);
  // const sharePurchCostTot = sharePurchCost * numShares;
  // const tradePurchDiff = tradePurchCost - sharePurchCostTot;
  // balance -= tradePurchCost;

  // ns.clearLog();
  // feedback.print(">> stckSym: ", stckSym);
  // feedback.print(">> ask: ", ns.stock.getAskPrice(stckSym).toFixed(4));
  // feedback.print(">> numShares: ", numShares);
  // feedback.print(">> tradePurchCost: ", tradePurchCost.toFixed(4));
  // feedback.print(">> sharePurchCost: ", sharePurchCost.toFixed(4));
  // feedback.print(">> sharePurchCostTot: ", sharePurchCostTot.toFixed(4));
  // feedback.print(">> tradePurchDiff: ", tradePurchDiff.toFixed(4));
  // feedback.printHiLi(">> balance: %s", balance.toFixed(4));

  // feedback.printLineSeparator();

  // const tradeSaleGain = ns.stock.getSaleGain(stckSym, 100, "Long");
  // const shareSaleGain = ns.stock.sellStock(stckSym, 100);
  // const shareSaleGainTot = shareSaleGain * numShares;
  // const tradeSaleDiff = tradeSaleGain - shareSaleGainTot;
  // balance += tradeSaleGain;

  // feedback.print(">> stckSym: ", stckSym);
  // feedback.print(">> bid: ", ns.stock.getBidPrice(stckSym).toFixed(4));
  // feedback.print(">> numShares: ", numShares);
  // feedback.print(">> tradeSaleGain: ", tradeSaleGain.toFixed(4));
  // feedback.print(">> shareSaleGain: ", shareSaleGain.toFixed(4));
  // feedback.print(">> shareSaleGainTot: ", shareSaleGainTot.toFixed(4));
  // feedback.print(">> tradeSaleDiff: ", tradeSaleDiff.toFixed(4));
  // feedback.printHiLi(">> balance: %s", balance.toFixed(4));

  // ns.tprintf(JSON.stringify(ns.stock.getSymbols(), null, 2));
  // ns.tprintf(JSON.stringify(ns.stock.getSymbols().length, null, 2));
  // ns.printf(JSON.stringify(ns.stock.getConstants(), null, 2));

  // const stockSyms = ns.stock.getSymbols();
  // const stockSyms = [
  //   "WDS",
  //   "NTLK",
  //   "AERO",
  //   "OMTK",
  // ];

  const stonkSym = new StatsSymbol(
    feedback,
    flags.getFlagString("s"),
    true,
    false, // postToQ
    1000000,
    true
  );
  // const stonkSym = new StatsSymbol(feedback, "WDS", true, true);
  // const trader = stonkSym.trader;

  await stonkSym.stonkWatch();
  // await trader.testTrade();
}