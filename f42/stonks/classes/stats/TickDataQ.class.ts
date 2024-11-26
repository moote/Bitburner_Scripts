import StonkSymbol from '/f42/stonks/classes/stats/StonkSymbol.class';
import TickData from '/f42/stonks/classes/stats/TickData.class';
import { shortTimeFormat } from '/f42/utility/utility-functions';

export default class TickDataQ {
  #stonkSym: StonkSymbol;
  readonly q: TickData[];
  #cutoffMSec: number;

  constructor(stonkSym: StonkSymbol, cutoffMSec: number) {
    this.#stonkSym = stonkSym;
    this.q = [];
    this.#cutoffMSec = cutoffMSec;
  }

  [Symbol.iterator](): Iterator<TickData> {
    return this.q.values();
  }

  tick(updateTs: number): void {
    // push new TickData to front
    this.q.unshift(new TickData(this.#stonkSym));

    // check queue length
    // pop data that is too old
    this.#removeOldData(updateTs);

    // trigger update on all periods
    this.#stonkSym.periods.forEach(period => {
      period.tick(updateTs, this);
    });
  }

  #removeOldData(updateTs: number): boolean {
    let didPop = false;

    if (this.length > 1 && typeof this.#oldestEle !== "undefined") {
      const cutoffTs = updateTs - this.#cutoffMSec;

      while (this.#oldestEle.ts < cutoffTs) {
        this.q.pop();
        didPop = true;
      }
    }

    return didPop;
  }

  get length(): number { return this.q.length; }

  get timeSpan(): string {
    if (this.length <= 1) return "0";
    // can confidently cast here as Q length has been checked
    const timeSpanTs = (<TickData>this.#newestEle).ts - (<TickData>this.#oldestEle).ts;
    return shortTimeFormat(this.#stonkSym.ns, timeSpanTs);
  }

  get #newestEle(): TickData | undefined {
    if (this.length === 0) return undefined;
    return this.q[0];
  }

  get #oldestEle(): TickData | undefined {
    if (this.length === 0) return undefined;
    return this.q[this.length - 1];
  }
}