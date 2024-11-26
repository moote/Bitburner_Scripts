import Period from "/f42/stonks/classes/stats/Period.class";
import TickDataQ from "/f42/stonks/classes/stats/TickDataQ.class";
import { PositionType, StonkPeriod, Symbol_Interface, TraderOpMode } from "/f42/stonks/classes/stats/interfaces";
import { NS } from "@ns";
import SimpleTrader from "/f42/stonks/classes/stats/SimpleTrader.class";
import { shortTimeFormat } from "/f42/utility/utility-functions";
import StonkTradeMsg from "/f42/stonks/classes/StonkTradeMsg.class";
import { getEmpty_StonkTradeMsg } from "/f42/classes/helpers/empty-object-getters";
import TableRenderer from "/f42/classes/TableRenderer.class";
import FeedbackRenderer from "/f42/classes/FeedbackRenderer";
import { SimpleColSpec_Type } from "/f42/classes/helpers/interfaces";

export default class StonkSymbol {
  readonly #DEBUG: boolean;
  readonly #initTs: number;
  readonly feedback: FeedbackRenderer;
  readonly ns: NS;
  readonly symbol: string;
  readonly dataQ: TickDataQ;
  #calcTimeMsec: number;
  readonly periods: Map<number, Period>;
  readonly fcastHist: number[];
  readonly #fcastHistLimit: number;
  #volatility: number;
  #trader?: SimpleTrader;
  #postToQ = false;
  #tableRenderer: TableRenderer;

  constructor(feedback: FeedbackRenderer, symbol: string, withTrader = false, postToQ = false, startTradeBalance = 1000000, debug = false) {
    this.#DEBUG = debug;
    this.#initTs = Date.now();
    this.feedback = feedback;
    this.ns = feedback.ns;
    this.symbol = symbol;
    this.#postToQ = postToQ;
    this.dataQ = new TickDataQ(this, StonkPeriod.ONE_HOUR);
    this.#calcTimeMsec = 0;
    this.periods = new Map<number, Period>();
    this.#initPeriodStatMap();
    this.fcastHist = [];
    this.#fcastHistLimit = 10;
    this.#volatility = 0;
    this.#tableRenderer = new TableRenderer(this.ns);

    if (withTrader) {
      this.addTrader(startTradeBalance);
    }

    this.ns.tail();
  }

  get runningFor(): string {
    return shortTimeFormat(this.ns, Date.now() - this.#initTs);
  }

  get trader(): SimpleTrader | undefined {
    return this.#trader;
  }

  get fcast(): number {
    return this.fcastHist[0];
  }

  set postToQ(val: boolean) {
    this.#postToQ = val;
  }

  isPeriodPrimed(period: StonkPeriod,): boolean {
    const tgtPeriod = this.periods.get(Number(period));

    if (typeof tgtPeriod === "undefined") {
      return false;
    }
    else {
      return tgtPeriod.isPrimed;
    }
  }

  getPeriodTrend(period: StonkPeriod, positionType: PositionType): number {
    const tgtPeriod = this.periods.get(Number(period));

    if (typeof tgtPeriod === "undefined") {
      return 0;
    }
    else {
      return tgtPeriod.getPositionTrend(positionType);
    }
  }

  async stonkWatch(): Promise<void> {
    // this.ns.printf("StonkSymbol.stonkWatch");

    while (true) {
      await this.ns.stock.nextUpdate();
      const updateTs = Date.now();

      // add latest tick data
      this.dataQ.tick(updateTs);

      // forecast history
      this.#addFcastHist();

      // other
      this.#volatility = this.ns.stock.getVolatility(this.symbol) * 100;

      // trading
      if (this.#trader) {
        this.#trader.tick();
        // this.#trader.testTrade();
      }

      // push to socket
      // TODO

      // calc time taken to compile data
      this.#calcTimeMsec = Date.now() - updateTs;

      this.#render();
    }
  }

  /**
   * 
   * @param startTradeBalance Requested balance to use if no ledger entry found
   * @returns The created trader
   */
  addTrader(startTradeBalance: number): SimpleTrader {
    if (typeof this.#trader === "undefined") {
      this.#trader = new SimpleTrader(this, startTradeBalance, this.#DEBUG ? TraderOpMode.TEST : TraderOpMode.LIVE);
    }

    return this.#trader;
  }

  serialize(): Symbol_Interface {
    const stats: Symbol_Interface = {
      symbol: this.symbol,
      runningFor: this.runningFor,
      dQLength: this.dataQ.length,
      dQTimeSpan: this.dataQ.timeSpan,
      calcTime: this.ns.tFormat(this.#calcTimeMsec, true),
      volatility: this.#volatility,
      fcastHist: this.fcastHist,
      periods: {},
    };

    this.periods.forEach((period, key) => {
      stats.periods[key] = period.serialize();
    });

    return stats;
  }

  #initPeriodStatMap(): void {
    for (const key in StonkPeriod) {
      const numKey = Number(key);
      if (!isNaN(numKey)) {
        this.periods.set(numKey, new Period(this, numKey));
      }
    }
  }

  #addFcastHist(): void {
    this.fcastHist.unshift(this.ns.stock.getForecast(this.symbol));

    // maintain history limit
    if (this.fcastHist.length > this.#fcastHistLimit) {
      this.fcastHist.pop();
    }
  }

  #render(): void {
    this.#tableRenderer.newRender();

    if (!this.postToQ) {
      this.ns.setTitle(this.ns.sprintf(
        "Stonk Trade: %s %s >> %s %d held",
        this.symbol,
        this.trader?.OP_MODE === TraderOpMode.TEST ? "DEBUG" : "LIVE",
        this.ns.formatNumber(this.trader?.profit || 0, 4),
        this.#trader?.sharesHeld || 0
      ));
      this.ns.clearLog();

      // this.feedback.printTitle(false);
      // this.feedback.printSubTitle(this.symbol);
      this.feedback.printf("> %-16s %12s", "Uptime:", this.runningFor);
      this.feedback.printf("> %-16s %12s", "Queue Length:", this.dataQ.length);
      this.feedback.printf("> %-16s %12s", "Queue Timespan:", this.dataQ.timeSpan);
      this.feedback.printf("> %-16s %12s", "Volatility:", this.#volatility.toFixed(2));
      this.feedback.printf("> %-16s %12s", "Forecast:", this.fcast.toFixed(2));
    }

    let colSpecs: SimpleColSpec_Type = [
      [10, ""],
      [10, ""],
      [10, ""],
      [36, `Ask: ${this.ns.stock.getAskPrice(this.symbol).toFixed(3)}`],
      [36, `Bid: ${this.ns.stock.getBidPrice(this.symbol).toFixed(3)}`],
    ];

    this.#tableRenderer.renderHead(colSpecs);

    colSpecs = [
      [10, ""],
      [10, "Primed?"],
      [10, "Ticks"],
      [10, "Hi"],
      [10, "Lo"],
      [10, "Trend"],
      [10, "Hi"],
      [10, "Lo"],
      [10, "Trend"],
    ];

    this.#tableRenderer.renderHead(colSpecs);
    this.#renderPeriod(StonkPeriod.ONE_MIN, colSpecs);
    this.#renderPeriod(StonkPeriod.ONE_HOUR, colSpecs);
    this.#renderTrader();

    if (!this.postToQ) {
      this.feedback.print(this.#tableRenderer.renderStr);
      this.feedback.printEnd();
    }

    // debug
    if (this.#DEBUG) {
      this.ns.printf(">>>>>> %s", JSON.stringify(this.serialize(), null, 2));
    }
  }

  #renderPeriod(sPeriod: StonkPeriod, colSpecArr: SimpleColSpec_Type): void {
    const period = this.periods.get(Number(sPeriod));

    if (typeof period !== "undefined") {
      const periodData = period.serialize();

      this.#tableRenderer.renderBodyRow(colSpecArr, [
        StonkPeriod[sPeriod],
        periodData.isPrimed ? "Y" : "N",
        periodData.ticks,
        periodData.ask.hi,
        periodData.ask.lo,
        periodData.ask.trend,
        periodData.bid.hi,
        periodData.bid.lo,
        periodData.bid.trend
      ]);
    }
  }

  #renderTrader(): void {
    if (this.trader) {
      const colSpecs: SimpleColSpec_Type = [
        [10, "TRADER >>"],
        [10, "OpMode"],
        [10, "Start Bal"],
        [10, "Balance"],
        [10, "Profit"],
        [10, "Shares"],
        [10, "Av. Price"],
        [10, "Pot. Prof"],
        [10, "Trades"],
      ];

      this.#tableRenderer.renderHead(colSpecs);
      this.#tableRenderer.renderBodyRow(colSpecs, [
        this.symbol,
        TraderOpMode[this.trader.OP_MODE],
        this.ns.formatNumber(this.trader.startBalance),
        this.ns.formatNumber(this.trader.balance),
        this.ns.formatNumber(this.trader.profit),
        this.trader.sharesHeld,
        this.ns.formatNumber(this.trader.avSharePrice),
        this.ns.formatNumber(this.trader.potShareProfit),
        this.trader.tradeCnt,
      ]);

      if (this.#postToQ) {
        // build msg and post
        const msgData = getEmpty_StonkTradeMsg();
        msgData.symbol = this.symbol;
        msgData.opMode = TraderOpMode[this.trader.OP_MODE];
        msgData.startBalance = this.trader.startBalance;
        msgData.balance = this.trader.balance;
        msgData.profit = this.trader.profit;
        msgData.shares = this.trader.sharesHeld;
        msgData.avPrice = this.trader.avSharePrice;
        msgData.potProfit = this.trader.potShareProfit;
        msgData.trades = this.trader.tradeCnt;
        StonkTradeMsg.staticPush(this.ns, msgData);
      }
    }
  }
}