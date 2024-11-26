import { PORT_STONK_TRADE } from "/f42/cfg/port-defs";
import { getEmpty_StonkTradeMsg } from "/f42/classes/helpers/empty-object-getters";
import { StonkTradeMsg_Interface } from "/f42/classes/helpers/interfaces";
import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";

export default class StonkTradeMsg extends MsgBase implements StonkTradeMsg_Interface {
  static portId: number = PORT_STONK_TRADE;

  #symbol: string;
  #opMode: string;
  #startBalance: number;
  #balance: number;
  #profit: number;
  #shares: number;
  #avPrice: number;
  #potProfit: number;
  #trades: number;

  static preHydrate(ns: NS, rawObj: StonkTradeMsg_Interface): StonkTradeMsg | false {
    // do hydration & return
    const newMsg = new StonkTradeMsg(ns, getEmpty_StonkTradeMsg());
    newMsg.hydrate(rawObj);
    return newMsg;
  }

  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param msgIntObj An object implementing GeneralCfgMsg_Interface
   * @returns Result of push
   */
  static staticPush(ns: NS, msgIntObj: StonkTradeMsg_Interface): boolean {
    const msg = new StonkTradeMsg(ns, msgIntObj);
    return msg.push();
  }

  constructor(ns: NS, rawObj: StonkTradeMsg_Interface) {
    super(
      timestampAsBase62Str(),
      StonkTradeMsg.portId,
      new MsgQueue(ns)
    );

    this.#symbol = rawObj.symbol;
    this.#opMode = rawObj.opMode;
    this.#startBalance = rawObj.startBalance;
    this.#balance = rawObj.balance;
    this.#profit = rawObj.profit;
    this.#shares = rawObj.shares;
    this.#avPrice = rawObj.avPrice;
    this.#potProfit = rawObj.potProfit;
    this.#trades = rawObj.trades;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgQueue {
    return <MsgQueue>super.msgPort;
  }

  get msgType(): MsgObjType {
    return MsgObjType.STONK_TRADE;
  }
  
  get symbol(): string {
    return this.#symbol;
  }
  
  get opMode(): string {
    return this.#opMode;
  }
  
  get startBalance(): number {
    return this.#startBalance;
  }
  
  get balance(): number {
    return this.#balance;
  }
  
  get profit(): number {
    return this.#profit;
  }
  
  get shares(): number {
    return this.#shares;
  }
  
  get avPrice(): number {
    return this.#avPrice;
  }
  
  get potProfit(): number {
    return this.#potProfit;
  }
  
  get trades(): number {
    return this.#trades;
  }

  serialize(): StonkTradeMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      symbol: this.#symbol,
      opMode: this.#opMode,
      startBalance: this.#startBalance,
      balance: this.#balance,
      profit: this.#profit,
      shares: this.#shares,
      avPrice: this.#avPrice,
      potProfit: this.#potProfit,
      trades: this.#trades,
    };
  }

  hydrate(rawObj: StonkTradeMsg_Interface): void {
    if (
      typeof rawObj.symbol === "undefined"
      || typeof rawObj.opMode === "undefined"
      || typeof rawObj.startBalance === "undefined"
      || typeof rawObj.balance === "undefined"
      || typeof rawObj.profit === "undefined"
      || typeof rawObj.shares === "undefined"
      || typeof rawObj.avPrice === "undefined"
      || typeof rawObj.potProfit === "undefined"
      || typeof rawObj.trades === "undefined"
    ) {
      throw new Error("StonkTradeMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#symbol = rawObj.symbol;
      this.#opMode = rawObj.opMode;
      this.#startBalance = rawObj.startBalance;
      this.#balance = rawObj.balance;
      this.#profit = rawObj.profit;
      this.#shares = rawObj.shares;
      this.#avPrice = rawObj.avPrice;
      this.#potProfit = rawObj.potProfit;
      this.#trades = rawObj.trades;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}