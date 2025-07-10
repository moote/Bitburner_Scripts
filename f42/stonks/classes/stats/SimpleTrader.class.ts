// import { NS } from '@ns'
import F42Base from '/f42/classes/F42Base.class';
import { ForecastState, StonkLedgerLine_Interface, TrendState, TradeType, StonkPeriod, PositionType, TraderOpMode } from '/f42/stonks/classes/stats/interfaces';
import StonkSymbol from '/f42/stonks/classes/stats/StonkSymbol.class';

export default class SimpleTrader extends F42Base {
  readonly stonkSym: StonkSymbol;
  readonly #TRADE_LEDGER: string;
  readonly #TEST_TRADE_LEDGER: string;
  readonly #LEDGER_VERSION = 5;
  readonly OP_MODE: TraderOpMode;
  #startBalance = 0;
  #balance = 0;
  #sharesHeld = 0;
  #tradeCnt = 0;

  #trendStateAsk: TrendState;
  #trendStateBid: TrendState;
  #fcastState: ForecastState;

  constructor(stonkSym: StonkSymbol, startBalance: number, opMode: TraderOpMode = TraderOpMode.TEST) {
    super(stonkSym.feedback.logger);
    this.stonkSym = stonkSym;
    this.#TRADE_LEDGER = `/f42/stonks/trades/${this.symbol}-trade-ledger.txt`;
    this.#TEST_TRADE_LEDGER = `/f42/stonks/trades/${this.symbol}-TEST-trade-ledger.txt`;
    this.OP_MODE = opMode;
    this.#sharesHeld = this.getPosition()[0];
    this.#loadBalanceFromLedger(startBalance);

    this.#trendStateAsk = TrendState.UNKNOWN;
    this.#trendStateBid = TrendState.UNKNOWN;
    this.#fcastState = ForecastState.UNCERTAIN;
    
    this.allowedLogFunctions = ["ALL"];
    this.doLoglVar = true;
  }

  get symbol(): string { return this.stonkSym.symbol }
  get sharesHeld(): number { return this.#sharesHeld }
  get startBalance(): number { return this.#startBalance }
  get balance(): number { return this.#balance }
  get profit(): number { return this.#balance - this.#startBalance }
  get tradeCnt(): number { return this.#tradeCnt }
  get avSharePrice(): number { return this.ns.stock.getPosition(this.symbol)[1] }
  get potShareProfit(): number { return this.ns.stock.getSaleGain(this.symbol, this.#sharesHeld, "Long") }

  tick(): void {
    this.clearLoglVar();

    if(this.stonkSym.isPeriodPrimed(StonkPeriod.ONE_MIN)){
      this.#determineTrendState(PositionType.ASK);
      this.#determineTrendState(PositionType.BID);
      this.#determineFcastState();
      this.#testBuyCondition();
    }
  }

  #determineTrendState(positionType: PositionType): void {
    // ask
    const currTrendVal = this.stonkSym.getPeriodTrend(StonkPeriod.ONE_MIN, positionType);
    let currTrendState = TrendState.UNKNOWN;
    
    if (currTrendVal >= 1) {
      currTrendState = TrendState.RISING;

    }
    else if (currTrendVal <= -1) {
      currTrendState = TrendState.FALLING;
    }

    if (currTrendState !== TrendState.UNKNOWN) {
      if (positionType === PositionType.ASK) {
        this.#trendStateAsk = currTrendState;
      }
      else {
        this.#trendStateBid = currTrendState;
      }
    }
  }

  #determineFcastState(): void {
    if (this.stonkSym.fcast >= 0.6) {
      this.#fcastState = ForecastState.RISING;
    }
    else if (this.stonkSym.fcast <= 0.4) {
      this.#fcastState = ForecastState.FALLING;
    }
    else {
      this.#fcastState = ForecastState.UNCERTAIN;
    }
  }

  #testBuyCondition(): void {
    const lo = this.getLo("testBuyCondition");

    if (this.#sharesHeld > 0){
      this.#testSellCondition();
    }else if (
      this.#fcastState === ForecastState.RISING
      && this.#trendStateAsk === TrendState.RISING
    ) {
      lo.g("Trigger buy stock");
      this.#buyStock();
    }
  }

  #testSellCondition(): void {
    const lo = this.getLo("testSellCondition");

    if (this.#sharesHeld === 0) return;

    if (
      this.#fcastState === ForecastState.FALLING
      && this.#trendStateBid === TrendState.FALLING
    ) {
      lo.g("Trigger sell stock");
      this.#sellStock();
    }
  }

  #buyStock(): void {
    const lo = this.getLo("buyStock");

    // get price
    const askPrice = this.ns.stock.getAskPrice(this.symbol);
    lo.g("askPrice: %d", askPrice);

    // calc num shares
    // const availBalance = (this.#balance - 100000) * 0.95;
    const availBalance = this.#balance;
    let numShares = Math.floor(availBalance / askPrice);

    lo.g("availBalance: %d", availBalance);
    lo.g("numShares: %d", numShares);

    if (numShares <= 0) {
      lo.g("Can't afford shares, exiting");
      return;
    }

    let cost = this.ns.stock.getPurchaseCost(this.symbol, numShares, "Long");

    lo.g("initial cost: %d", cost);

    let adjustLoopCnt = 0;

    while (cost > availBalance) {
      const diff = cost - availBalance;
      numShares -= (Math.ceil(diff / askPrice));
      cost = this.ns.stock.getPurchaseCost(this.symbol, numShares, "Long");

      lo.g("ADJUST (%d):", adjustLoopCnt);
      lo.g("diff: %d", diff);
      lo.g("numShares: %d", numShares);
      lo.g("cost: %d", cost);

      adjustLoopCnt++;

      if (adjustLoopCnt >= 10) {
        throw new Error("Stuck in adjust loop: " + adjustLoopCnt);
      }
    }

    const pricePaid = this.#doBuyStock(numShares);
    lo.g("pricePaid: %d", pricePaid);

    if (pricePaid > 0) {
      this.#balance -= cost;
      lo.g("balance: %d", this.#balance);

      this.#sharesHeld = numShares;
      this.#tradeCnt++;

      const tradeResult = this.#getEmptyLedgerLine(TradeType.BUY);
      tradeResult.sharePrice = pricePaid;
      tradeResult.numShares = numShares;
      tradeResult.totCost = 0 - cost;
      tradeResult.fees = cost - (numShares * pricePaid);
      tradeResult.sharePrice = pricePaid;
      this.#writeToLedger(tradeResult);
    }
    else {
      lo.g("TRADE_FAIL");
      this.#writeToLedger(this.#getEmptyLedgerLine(TradeType.BUY_FAIL));
    }
  }

  #doBuyStock(numShares: number): number {
    if (this.OP_MODE === TraderOpMode.TEST) {
      return this.ns.stock.getAskPrice(this.symbol);
    }
    else { // LIVE
      return this.ns.stock.buyStock(this.symbol, numShares);
    }
  }

  #sellStock(): void {
    const lo = this.getLo("sellStock");

    let sellPrice = 0;
    const numShares = this.#sharesHeld;
    const saleGain = this.ns.stock.getSaleGain(this.symbol, numShares, "Long");

    if (this.OP_MODE === TraderOpMode.TEST) {
      sellPrice = this.ns.stock.getBidPrice(this.symbol);
    }
    else { // LIVE
      sellPrice = this.ns.stock.sellStock(this.symbol, numShares);
    }

    this.#balance += saleGain;
    this.#sharesHeld = 0;
    this.#tradeCnt++;

    lo.g(
      "Sold %d shares @ %d for %d: Balance: %d",
      numShares,
      sellPrice,
      saleGain,
      this.#balance
    );

    const tradeResult = this.#getEmptyLedgerLine(TradeType.SELL);
      tradeResult.sharePrice = sellPrice;
      tradeResult.numShares = numShares;
      tradeResult.totCost = saleGain;
      tradeResult.fees = saleGain - (numShares * sellPrice);
      tradeResult.sharePrice = sellPrice;
      this.#writeToLedger(tradeResult);

  }

  creditBalance(amount: number): void {
    this.#balance += amount;
    this.#startBalance += amount;
    const ledgerLine = this.#getEmptyLedgerLine(TradeType.CREDIT);
    ledgerLine.credDeb = amount;
    this.#writeToLedger(ledgerLine);
  }

  debitBalance(amount: number): void {
    this.#balance -= amount;
    this.#startBalance -= amount;
    const ledgerLine = this.#getEmptyLedgerLine(TradeType.DEBIT);
    ledgerLine.credDeb = 0 - amount;
    this.#writeToLedger(ledgerLine);
  }

  getPosition(): [number, number, number, number] {
    // const lo = this.getLo("getPosition");

    const currPosition = this.ns.stock.getPosition(this.symbol);
    // lo.g(JSON.stringify(currPosition));
    // lo.g("Potential sale: %s", this.ns.formatNumber(this.ns.stock.getSaleGain(this.symbol, currPosition[0], "Long")));
    return currPosition;
  }

  #getEmptyLedgerLine(tradeType: TradeType): StonkLedgerLine_Interface {
    const now = Date.now();
    return {
      ts: now,
      date: new Date(now).toString(),
      type: tradeType,
      typeStr: TradeType[tradeType],
      symbol: this.symbol,
      sharePrice: 0,
      numShares: 0,
      totCost: 0,
      fees: 0,
      credDeb: 0,
      balance: this.#balance,
      version: this.#LEDGER_VERSION,
      opMode: this.OP_MODE,
      opModeStr: TraderOpMode[this.OP_MODE],
    };
  }

  get #ledgerPath(): string {
    if (this.OP_MODE === TraderOpMode.TEST) {
      return this.#TEST_TRADE_LEDGER;
    }
    else {
      return this.#TRADE_LEDGER;
    }
  }

  #writeToLedger(ledgerLine: StonkLedgerLine_Interface): void {
    // get ledger
    const ledger = this.#loadLedger();

    // add data
    ledger.push(ledgerLine);

    // write
    this.ns.write(
      this.#ledgerPath,
      `${JSON.stringify(ledger, null, 2)}`,
      "w"
    );
  }

  /**
   * 
   * @param reqStartBalance Will be used if in test mode, or no ledger start balance found
   * @returns True if loaded from ledger, false if not
   */
  #loadBalanceFromLedger(reqStartBalance: number): boolean {
    const lo = this.getLo("loadBalanceFromLedger");

    if(this.OP_MODE === TraderOpMode.TEST){
      this.#clearLedger();
      this.#balance = reqStartBalance;
      this.#writeToLedger(this.#getEmptyLedgerLine(TradeType.BALANCE));
      lo.g("opMode.TEST: using reqStartBalance: %d", this.#balance);
      return false;
    }

    const ledger = this.#loadLedger();

    if (ledger.length > 0) {
      let lineCnt = 0;
      for(const ledgerLine of ledger){
        switch(ledgerLine.type){
          case TradeType.BALANCE:
            if(lineCnt === 0) {
              this.#balance = ledgerLine.balance;
              this.#startBalance = ledgerLine.balance;
            }
            break;
          case TradeType.BUY:
          case TradeType.SELL:
            this.#balance = ledgerLine.balance;
            this.#tradeCnt++;
            break
          case TradeType.CREDIT:
          case TradeType.DEBIT:
            this.#startBalance += ledgerLine.credDeb;
            this.#balance += ledgerLine.credDeb;
            break;
        }
        lineCnt++;
      }

      lo.g("Loading ledger balance: %d", this.#balance);
      return true;
    }

    // set start balance
    this.#startBalance = reqStartBalance;
    this.#balance = reqStartBalance;
    this.#writeToLedger(this.#getEmptyLedgerLine(TradeType.BALANCE));

    lo.g("Can't load ledger balance");
    return false;
  }

  #loadLedger(): StonkLedgerLine_Interface[] {
    const lo = this.getLo("loadLedger");

    // read & parse
    let ledger: StonkLedgerLine_Interface[];
    try {
      ledger = JSON.parse(this.ns.read(this.#ledgerPath));
      if (!this.#isTradeLedger(ledger)) {
        lo.g("Invalid ledger");
        throw new Error("Invalid ledger");
      }
    }
    catch (e) {
      ledger = [];
    }

    return ledger;
  }

  #clearLedger(): void {
    // write
    this.ns.write(
      this.#ledgerPath,
      `${JSON.stringify([], null, 2)}`,
      "w"
    );
  }

  #isTradeLedger(ledger: unknown): ledger is StonkLedgerLine_Interface[] {
    const lo = this.getLo("isTradeLedger");

    lo.g("isTradeLedger:");
    if (Array.isArray(ledger)) {
      lo.g("isTradeLedger: isArray");
      if (ledger.length === 0) {
        lo.g("isTradeLedger: isArray.length === 0");
        return true;
      }
      else if ("version" in ledger[0]) {
        if (ledger[0].version === this.#LEDGER_VERSION) {
          lo.g("isTradeLedger: version match");
          return true;
        }
        else {
          lo.g("isTradeLedger: wrong version");
          return false;
        }
      }
      else {
        lo.g("isTradeLedger: 'version' missing");
        return false;
      }
    }

    lo.g("isTradeLedger: not array");
    return false;
  }
}