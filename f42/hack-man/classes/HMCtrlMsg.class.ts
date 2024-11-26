import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import { Server } from "@ns";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { CtrlMsgAct, HMOpMode, MsgObjType, TgtSrvOpMode } from "/f42/hack-man/classes/enums";
import { CtrlMsgAllowed_Type, HMCtrlMsg_Interface } from "/f42/classes/helpers/interfaces";
import { PORT_HM_CTRL } from "/f42/cfg/port-defs";

const SRV_COMP_FILE_PATH = "/f42/utility/compromise-server.js";

/**
 * Base control message for HackManager
 */
export class HMCtrlMsg extends MsgBase implements HMCtrlMsg_Interface {
  static portId: number = PORT_HM_CTRL;

  #action: CtrlMsgAct;
  #payload: CtrlMsgAllowed_Type;

  static preHydrate(ns: NS, rawObj: HMCtrlMsg_Interface): HMCtrlMsg | false {

    let newMsg: HMCtrlMsg;

    switch (rawObj.action) {
      case CtrlMsgAct.ADD_TS:
        newMsg = new HMCtrlMsg_ADD_TS(ns, rawObj.payload as Server);
        break;
      case CtrlMsgAct.RM_TS:
        newMsg = new HMCtrlMsg_RM_TS(ns, rawObj.payload as string);
        break;
      case CtrlMsgAct.CLEAR_ACTIONS:
        newMsg = new HMCtrlMsg_CLEAR_ACTIONS(ns);
        break;
      case CtrlMsgAct.CHANGE_OP_MODE:
        newMsg = new HMCtrlMsg_CHANGE_OP_MODE(ns, rawObj.payload as HMOpMode);
        break;
      case CtrlMsgAct.CHANGE_TT_MODE:
        newMsg = new HMCtrlMsg_CHANGE_TT_MODE(ns, rawObj.payload as TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN);
        break;
      default:
        throw new Error("HMCtrlMsg.preHydrate: Invalid rawObj.action: " + JSON.stringify(rawObj, null, 2));
    }

    // return
    return newMsg;
  }

  constructor(
    ns: NS,
    action: CtrlMsgAct,
    payload: CtrlMsgAllowed_Type,
  ) {
    super(
      timestampAsBase62Str(),
      HMCtrlMsg.portId,
      new MsgQueue(ns)
    );

    this.#action = action;
    this.#payload = payload;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgQueue {
    return <MsgQueue>super.msgPort;
  }

  get msgType(): MsgObjType {
    return MsgObjType.CTRL;
  }

  get action(): CtrlMsgAct {
    return this.#action;
  }

  get payload(): CtrlMsgAllowed_Type {
    return this.#payload;
  }

  serialize(): HMCtrlMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      action: this.action,
      payload: this.payload,
    };
  }

  // hydrate(rawObj: HMCtrlMsg_Interface): void {
  //   if (
  //     typeof rawObj.action === "undefined"
  //     || typeof rawObj.payload === "undefined"
  //   ) {
  //     throw new Error("CtrlMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
  //   }
  //   else {
  //     this.#action = rawObj.action;
  //     this.#payload = rawObj.payload;
  //   }

  //   // pass down for remainder of fields processing
  //   super.hydrate(rawObj);
  // }
}

/**
 * Add server control message object for HackManager
 */
export class HMCtrlMsg_ADD_TS extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param target Hostname of target
   * @returns Result of push
   */
  static staticPush(ns: NS, target: string): boolean {
    // validate host
    if (!ns.serverExists(target)) {
      throw new Error(ns.sprintf("!! Invalid target server hostname: %s", target));
    }

    if (!ns.hasRootAccess(target)) {
      // no root access, send to compromiser script, which will post back if it is successful
      ns.run(SRV_COMP_FILE_PATH, 1, "--target", target, "--add-tgt-list", true);
      return false;
    }

    const msg = new HMCtrlMsg_ADD_TS(ns, ns.getServer(target));
    return msg.push();
  }

  constructor(ns: NS, payloadServer: Server) {
    super(ns, CtrlMsgAct.ADD_TS, payloadServer);
  }

  get payload(): Server {
    return super.payload as Server;
  }
}

/**
 * Remove server control message object for HackManager
 */
export class HMCtrlMsg_RM_TS extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param target Hostname of target
   * @returns Result of push
   */
  static staticPush(ns: NS, target: string): boolean {
    // validate host exists
    if (!ns.serverExists(target)) {
      throw new Error(ns.sprintf("!! Invalid target server hostname: %s", target));
    }

    // post to queue
    const msg = new HMCtrlMsg_RM_TS(ns, target);
    return msg.push();
  }

  constructor(ns: NS, payloadHostname: string) {
    super(ns, CtrlMsgAct.RM_TS, payloadHostname);
  }

  get payload(): string {
    return super.payload as string;
  }
}

/**
 * Pause/Unpause control message object for HackManager
 * 
 */
export class HMCtrlMsg_TT_PAUSE extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @returns Result of push
   */
  static staticPush(ns: NS, doPause = true): boolean {
    // post to queue
    const msg = new HMCtrlMsg_TT_PAUSE(ns, doPause);
    return msg.push();
  }

  constructor(ns: NS, doPause: boolean) {
    super(ns, CtrlMsgAct.PAUSE, doPause);
  }

  get payload(): boolean {
    return super.payload as boolean;
  }
}

/**
 * Clear actions control message object for HackManager
 * @deprecated
 */
export class HMCtrlMsg_CLEAR_ACTIONS extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @returns Result of push
   */
  static staticPush(ns: NS): boolean {
    // post to queue
    const msg = new HMCtrlMsg_CLEAR_ACTIONS(ns);
    return msg.push();
  }

  constructor(ns: NS) {
    super(ns, CtrlMsgAct.CLEAR_ACTIONS, true);
  }

  /** Always true */
  get payload(): boolean {
    return true;
  }
}

/**
 * Switch operation mode to 'hack' | 'trade_target'
 */
export class HMCtrlMsg_CHANGE_OP_MODE extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @returns Result of push
   */
  static staticPush(ns: NS, newOpMode: HMOpMode): boolean {
    // post to queue
    const msg = new HMCtrlMsg_CHANGE_OP_MODE(ns, newOpMode);
    return msg.push();
  }

  constructor(ns: NS, newOpMode: HMOpMode) {
    super(ns, CtrlMsgAct.CHANGE_OP_MODE, newOpMode);
  }

  get payload(): HMOpMode {
    return super.payload as HMOpMode
  }
}

/**
 * Sets the server action
 */
export class HMCtrlMsg_CHANGE_TT_MODE extends HMCtrlMsg {
  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @returns Result of push
   */
  static staticPush(ns: NS, newMode: TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN): boolean {
    // post to queue
    const msg = new HMCtrlMsg_CHANGE_TT_MODE(ns, newMode);
    return msg.push();
  }

  constructor(ns: NS, newMode: TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN) {
    super(ns, CtrlMsgAct.CHANGE_TT_MODE, newMode);
  }

  get payload(): TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN {
    return super.payload as (TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN);
  }
}
