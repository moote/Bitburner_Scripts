import { NS } from '@ns'
import Logger from '/f42/classes/Logger.class';
import { PORT_STONK_TRADE } from '/f42/cfg/port-defs';
import MsgQueueReader from '/f42/classes/Messaging/MsgQueueReader.class';
import { SimpleColSpec_Type, StonkTradeMsg_Interface } from '/f42/classes/helpers/interfaces';
import TableRenderer from '/f42/classes/TableRenderer.class';
import { F42_ANSI_COL_HILI } from '/f42/classes/FeedbackRenderer';

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Stonk Trade Manager";
  const scriptDescription = "Launch traders for all stocks and display stats";
  const logger = new Logger(ns, true, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  flags.addBooleanFlag("k", "Stop all trading scripts");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  let killCnt = 0;
  for (const psInfo of ns.ps()) {
    if (psInfo.filename === "f42/stonks/stonk-trade.js") {
      ns.kill(psInfo.pid);
      killCnt++;
    }
  }

  if (flags.isflagSet("k")) {
    feedback.printHiLi(">> All trade scripts killed (%d)", killCnt);
    return;
  }

  const stockSyms = ns.stock.getSymbols();
  const mqr = new MsgQueueReader(ns, PORT_STONK_TRADE);

  for (const stockSym of stockSyms) {
    ns.run("/f42/stonks/stonk-trade.js", 1, "-s", stockSym, "-m", "-b", 1000000000000);
  }

  const symbolObj: { [key: string]: StonkTradeMsg_Interface } = {};
  const tableRen = new TableRenderer(ns);

  const colSpecs: SimpleColSpec_Type = [
    [10, "Symbol"],
    [10, "OpMode"],
    [10, "Start Bal"],
    [10, "Balance"],
    [10, "Profit"],
    [10, "Shares"],
    [10, "Av. Price"],
    [10, "Pot. Prof"],
    [10, "Trades"],
  ];

  while (true) {
    if (mqr.peekMessage() !== false) {
      while (mqr.peekMessage() !== false) {
        const msg = mqr.popMessage() as StonkTradeMsg_Interface;
        symbolObj[msg.symbol] = msg;
      }

      ns.clearLog();
      feedback.printTitle(false);
      tableRen.newRender();
      tableRen.renderHead(colSpecs);

      let profitTot = 0;
      let potProfitTot = 0;

      Object.values(symbolObj).forEach(msg => {
        tableRen.renderBodyRow(colSpecs, [
          msg.symbol,
          msg.opMode,
          ns.formatNumber(msg.startBalance),
          ns.formatNumber(msg.balance),
          ns.formatNumber(msg.profit),
          ns.formatNumber(msg.shares),
          ns.formatNumber(msg.avPrice),
          ns.formatNumber(msg.potProfit),
          msg.trades,
        ]);

        profitTot += msg.profit;
        potProfitTot += msg.potProfit;
      });

      tableRen.renderSpacerRow(colSpecs, F42_ANSI_COL_HILI);
      tableRen.renderBodyRow(colSpecs, [
        "",
        "",
        "",
        "Profit:",
        ns.formatNumber(profitTot),
        "",
        "Pot Prof:",
        ns.formatNumber(potProfitTot),
        ""
      ], F42_ANSI_COL_HILI);

      feedback.print(tableRen.renderStr);

      ns.setTitle("Stonk Trade Manager: Exposure: " + ns.formatNumber(profitTot + potProfitTot));
    }

    await ns.sleep(1000);
  }
}