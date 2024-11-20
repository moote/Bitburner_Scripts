import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import { Server } from "@ns";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { CtrlMsgAct, HMOpMode, MsgObjType, TgtSrvOpMode } from "/f42/hack-man/classes/enums";
import { HMCtrlMsg_Interface, HMCtrlMsgPayload_Interface } from "/f42/classes/helpers/interfaces";
import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { getEmpty_HMCtrlMsg, getEmpty_Server } from "/f42/classes/helpers/empty-object-getters";

const SRV_COMP_FILE_PATH = "/f42/utility/compromise-server.js";

/**
 * Base control message for HackManager
 */
export class HMCtrlMsg extends MsgBase implements HMCtrlMsg_Interface {
  static portId: number = PORT_HM_CTRL;

  #action: CtrlMsgAct;

  static preHydrate(ns: NS, rawObj: HMCtrlMsg_Interface): HMCtrlMsg | false {

    let newMsg: HMCtrlMsg;

    switch (rawObj.action) {
      case CtrlMsgAct.ADD_TS:
        newMsg = new HMCtrlMsg_ADD_TS(ns, getEmpty_Server());
        break;
      case CtrlMsgAct.RM_TS:
        newMsg = new HMCtrlMsg_RM_TS(ns, "");
        break;
      case CtrlMsgAct.CLEAR_ACTIONS:
        newMsg = new HMCtrlMsg_CLEAR_ACTIONS(ns);
        break;
      case CtrlMsgAct.CHANGE_OP_MODE:
        newMsg = new HMCtrlMsg_CHANGE_OP_MODE(ns, HMOpMode.HACK);
        break;
      case CtrlMsgAct.CHANGE_TT_MODE:
        newMsg = new HMCtrlMsg_CHANGE_TT_MODE(ns, TgtSrvOpMode.MONEY_MAX);
        break;
      default:
        throw new Error("HMCtrlMsg.preHydrate: Invalid rawObj.action: " + JSON.stringify(rawObj, null, 2));
    }

    // do hydration & return
    newMsg.hydrate(rawObj);
    return newMsg;
  }

  constructor(
    ns: NS,
    action: CtrlMsgAct,
  ) {
    super(
      timestampAsBase62Str(),
      HMCtrlMsg.portId,
      new MsgQueue(ns)
    );

    this.#action = action;
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

  serialize(): HMCtrlMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      action: this.action,
    };
  }

  hydrate(rawObj: HMCtrlMsg_Interface): void {
    if (typeof rawObj.action === "undefined") {
      throw new Error("CtrlMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#action = rawObj.action;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}

/**
 * Add server control message object for HackManager
 */
export class HMCtrlMsg_ADD_TS extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
  #payload: Server;

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
    super(ns, CtrlMsgAct.ADD_TS);

    this.#payload = payloadServer;
  }

  get payload(): Server {
    return this.#payload;
  }
}

/**
 * Remove server control message object for HackManager
 */
export class HMCtrlMsg_RM_TS extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
  #payload: string;

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
    super(ns, CtrlMsgAct.RM_TS);

    this.#payload = payloadHostname;
  }

  get payload(): string {
    return this.#payload;
  }
}

/**
 * Pause/Unpause control message object for HackManager
 * 
 */
export class HMCtrlMsg_TT_PAUSE extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
  #payload: boolean;

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
    super(ns, CtrlMsgAct.PAUSE);

    this.#payload = doPause;
  }

  get payload(): boolean {
    return this.#payload;
  }
}

/**
 * Clear actions control message object for HackManager
 * @deprecated
 */
export class HMCtrlMsg_CLEAR_ACTIONS extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
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
    super(ns, CtrlMsgAct.CLEAR_ACTIONS);
  }

  /** Always true */
  get payload(): boolean {
    return true;
  }
}

/**
 * Switch operation mode to 'hack' | 'trade_target'
 */
export class HMCtrlMsg_CHANGE_OP_MODE extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
  #payload: HMOpMode;

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
    super(ns, CtrlMsgAct.CHANGE_OP_MODE);

    this.#payload = newOpMode;
  }

  get payload(): HMOpMode {
    return this.#payload;
  }
}

/**
 * Sets the server action
 */
export class HMCtrlMsg_CHANGE_TT_MODE extends HMCtrlMsg implements HMCtrlMsgPayload_Interface {
  #payload: TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN;

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
    super(ns, CtrlMsgAct.CHANGE_TT_MODE);

    this.#payload = newMode;
  }

  get payload(): TgtSrvOpMode.MONEY_MAX | TgtSrvOpMode.MONEY_MIN {
    return this.#payload;
  }
}
