import StonkSymbol from '/f42/stonks/classes/stats/StonkSymbol.class';

export default class TickData {
  readonly ts: number; // timestamp
  readonly ask: number; // my buy price
  readonly mean: number;
  readonly bid: number; // my sell price
  readonly spread: number;

  constructor(stonkSym: StonkSymbol){
    this.ts = Date.now();
    this.ask = stonkSym.ns.stock.getAskPrice(stonkSym.symbol)
    this.mean = stonkSym.ns.stock.getPrice(stonkSym.symbol)
    this.bid = stonkSym.ns.stock.getBidPrice(stonkSym.symbol)
    this.spread = this.ask - this.bid;
  }
}