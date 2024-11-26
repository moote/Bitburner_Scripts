import Period from "/f42/stonks/classes/stats/Period.class";
import {
  Position_Interface, PositionAsk_Interface,
  PositionBid_Interface, PositionType
} from "/f42/stonks/classes/stats/interfaces";

abstract class Position {
  #period: Period;
  #hi = 0;
  #lo = -1;
  #hiLoDiff = 0;
  #mean = 0;
  #variance = 0;
  #stdDev = 0;
  #prices: number[] = [];

  constructor(period: Period) {
    this.#period = period;
  }

  get ns(): NS { return this.#period.ns }

  get trend(): number {
    if(this.#prices.length === 0) return 0;
    return this.newestPrice - this.oldestPrice;
  }

  get trendPE(): number {
    return ((this.trend / this.newestPrice) * 100);
  }

  get trendPS(): number {
    return ((this.trend / this.oldestPrice) * 100);
  }

  get trendOffset(): number {
    const trendStep = this.trend / (this.#prices.length - 1);
    let trendAmt = 0;
    let trendOffset = 0;

    for(const price of this.#prices){
      trendOffset += (price - trendAmt);
      trendAmt += trendStep;
    }

    return trendOffset;
  }

  get extraTravel(): number {
    return 0;
  }

  /**
   * 
   * @returns The newest price
   */
  get newestPrice(): number {
    if(this.#prices.length === 0) return 0;
    return this.#prices[0];
  }

  /**
   * 
   * @returns The oldest price
   */
  get oldestPrice(): number {
    if(this.#prices.length === 0) return 0;
    return this.#prices[this.#prices.length - 1];
  }

  startUpdate(): void {
    this.#hi = 0;
    this.#lo = -1;
    this.#hiLoDiff = 0;
    this.#mean = 0;
    this.#variance = 0;
    this.#stdDev = 0;
    this.#prices = [];
  }

  addPrice(price: number): void {
    this.testHi(price);
    this.testLo(price);
    this.#prices.push(price);
  }

  protected testHi(price: number): boolean {
    if (price > this.#hi) {
      this.#hi = price;
      return true;
    }
    return false;
  }

  protected testLo(price: number): boolean {
    if (this.#lo === -1 || price < this.#lo) {
      this.#lo = price;
      return true;
    }
    return false;
  }

  endUpdate(): void {
    this.#calcMean();
    this.#hiLoDiff = this.#hi - this.#lo;
  }

  serialize(): Position_Interface {
    return {
      price: this.newestPrice,
      hi: this.#float4Disp(this.#hi),
      lo: this.#float4Disp(this.#lo),
      hiLoDiff: this.#float4Disp(this.#hiLoDiff),
      mean: this.#float4Disp(this.#mean),
      variance: this.#float4Disp(this.#variance),
      stdDev: this.#float4Disp(this.#stdDev),
      trend: this.#float4Disp(this.trend),
      trendPS: this.#float4Disp(this.trendPS),
      trendPE: this.#float4Disp(this.trendPE),
      trendOffset: this.#float4Disp(this.trendOffset),
      extraTravel: this.#float4Disp(this.extraTravel),
      prices: JSON.stringify(this.#prices),
    };
  }

  #float4Disp(displayNum: number): number {
    return parseFloat(displayNum.toFixed(3));
  }

  #calcMean(): void {
    this.#mean = this.#prices.reduce(
      (sum, price) => sum + price / this.#prices.length,
      0
    );

    this.#calcStdDev();
  }

  #calcStdDev(): void {
    this.#variance = this.#prices.reduce(
      (sum, price) => sum + Math.pow(price - this.#mean, 2) / this.#prices.length,
      0
    );
    this.#stdDev = Math.sqrt(this.#variance);
  }
}

export class AskPosition extends Position {
  get type(): PositionType.ASK {
    return PositionType.ASK;
  }

  addPrice(price: number): void {
    // this.ns.printf("AskPosition.addPrice()");
    super.addPrice(price);
  }

  protected testHi(price: number): boolean {
    if (super.testHi(price)) {
      // this.ns.printf("AskPosition.testHi(): new hi: %d", price);
      return true;
    }
    return false;
  }

  protected testLo(price: number): boolean {
    if (super.testLo(price)) {
      // this.ns.printf("AskPosition.testLo(): new lo: %d", price);
      return true;
    }
    return false;
  }

  endUpdate(): void {
    // this.ns.printf("AskPosition.endUpdate");
    super.endUpdate();
  }

  serialize(): PositionAsk_Interface {
    return {
      type: this.type,
      ...super.serialize(),
    };
  }
}

export class BidPosition extends Position {
  get type(): PositionType.BID {
    return PositionType.BID;
  }

  serialize(): PositionBid_Interface {
    return {
      type: this.type,
      ...super.serialize(),
    };
  }
}