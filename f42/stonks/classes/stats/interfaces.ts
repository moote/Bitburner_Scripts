// \\\\\\\\\\\\\\\\\\\\
// TYPES / ENUMS
// ////////////////////

export enum StonkPeriod {
  // TEN_SEC = 10000,
  // THIRTY_SEC = 30000,
  ONE_MIN = 60000,
  // FIVE_MIN = StonkPeriod.ONE_MIN * 5,
  // TEN_MIN = StonkPeriod.ONE_MIN * 10,
  // THIRTY_MIN = StonkPeriod.ONE_MIN * 30,
  ONE_HOUR = StonkPeriod.ONE_MIN * 60,
}

export enum PositionType {
  ASK,
  BID
}

export type PeriodList_Type = { [key: number]: Period_Interface };

export enum TradeType {
  BALANCE, // record balance to ledger
  BUY, // share purchase
  SELL, // share sale 
  CREDIT, // credit balance
  DEBIT, // debit balance
  BUY_FAIL, // trade failed
  SELL_FAIL, // trade failed
}

export enum TraderOpMode {
  TEST,
  LIVE
}

export enum TrendState {
  UNKNOWN,
  FALLING,
  RISING
}

export enum ForecastState {
  UNCERTAIN,
  FALLING,
  RISING
}

// \\\\\\\\\\\\\\\\\\\\
// CLASS SERIALIZE INTERFACES
// ////////////////////

export interface Symbol_Interface {
  symbol: string;
  runningFor: string;
  dQLength: number;
  dQTimeSpan: string;
  calcTime: string;
  volatility: number;
  fcastHist: number[];
  periods: PeriodList_Type;
}

export interface Period_Interface {
  period: StonkPeriod;
  periodStr: string;
  ask: PositionAsk_Interface;
  bid: PositionBid_Interface;
  isPrimed: boolean;
  ticks: number;
}

export interface Position_Interface {
  price: number;
  hi: number;
  lo: number;
  hiLoDiff: number;
  mean: number;
  variance: number;
  stdDev: number;
  trend: number; // diff from start price to end price
  trendPS: number; // trend as % of start price
  trendPE: number; // trend as % of end price
  trendOffset: number; // a measure of the deviation from the average trend line
  extraTravel: number; // a measure of volatility; a sum of +ve and -ve movement
  prices: string;
}

export interface PositionAsk_Interface extends Position_Interface {
  type: PositionType.ASK;
}

export interface PositionBid_Interface extends Position_Interface {
  type: PositionType.BID;
}

export interface StonkLedgerLine_Interface {
  ts: number;
  date: string;
  type: TradeType;
  typeStr: string;
  symbol: string;
  sharePrice: number;
  numShares: number;
  totCost: number;
  fees: number;
  credDeb: number;
  balance: number;
  version: number;
  opMode: TraderOpMode;
  opModeStr: string;
}
