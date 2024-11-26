import StonkSymbol from "f42/stonks/classes/stats/StonkSymbol.class";
import { Period_Interface, PositionType, StonkPeriod } from "/f42/stonks/classes/stats/interfaces";
import { AskPosition, BidPosition } from "f42/stonks/classes/stats/Position.class";
import TickDataQ from "/f42/stonks/classes/stats/TickDataQ.class";

export default class Period {
  #stonkSymbol: StonkSymbol;
  readonly period: StonkPeriod;
  #ask: AskPosition;
  #bid: BidPosition;
  #ticks: number;
  #isPrimed: boolean;

  constructor(stonkSymbol: StonkSymbol, period: StonkPeriod) {
    this.#stonkSymbol = stonkSymbol;
    this.period = period;
    this.#ask = new AskPosition(this);
    this.#bid = new BidPosition(this);
    this.#ticks = 0;
    this.#isPrimed = false;
  }

  get ns(): NS { return this.#stonkSymbol.ns }
  get periodStr(): string { return StonkPeriod[this.period] }
  get isPrimed(): boolean { return this.#isPrimed }

  tick(updateTs: number, dataQ: TickDataQ): void {
    // this.ns.printf("Period.tick()");
    const currCutoffTs = updateTs - this.period;
    this.#ticks = 0;

    // clear the positions
    this.#ask.startUpdate();
    this.#bid.startUpdate();

    for(const tickData of dataQ){
      if (tickData.ts >= currCutoffTs) {
        this.#ask.addPrice(tickData.ask);
        this.#bid.addPrice(tickData.bid);
        this.#ticks++;
      }
      else{
        // reached end of time range; stop reading Q
        this.#isPrimed = true;
        break;
      }
    }

    // reached end of time range / Q; calc totals
    this.#ask.endUpdate();
    this.#bid.endUpdate();
  }

  getPositionTrend(position: PositionType): number {
    if(position === PositionType.ASK){
      return this.#ask.trend;
    }
    else{
      return this.#bid.trend;
    }
  }

  serialize(): Period_Interface {
    // this.ns.printf("Period.serialize()");
    return {
      period: this.period,
      periodStr: this.periodStr,
      ask: this.#ask.serialize(),
      bid: this.#bid.serialize(),
      isPrimed: this.#isPrimed,
      ticks: this.#ticks,
    };
  }
}