import MsgBase from "/f42/classes/MsgBase.class";
import MsgQueue from "/f42/classes/MsgQueue.class";
import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { Server } from "@ns";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";

const MSG_ACT_ADD_TS = "add-ts";
const MSG_ACT_RM_TS = "rm-ts";
const MSG_ACT_CLEAR_ACTIONS = "clear-actions";
const MSG_ACT_ORDER_66 = "ORDER-66";

const SRV_COMP_FILE_PATH = "/f42/utility/compromise-server.js";

interface HMCtrlMsg_Interface {
  action: string,
  payload: Server | string | boolean,
}

/**
 * Base control message for HackManager
 */
export class HMCtrlMsg extends MsgBase implements HMCtrlMsg_Interface {
  static portId: number = PORT_HM_CTRL;
  static ACT_ADD_TS: string = MSG_ACT_ADD_TS;
  static ACT_RM_TS: string = MSG_ACT_RM_TS;
  static ACT_CLEAR_ACTIONS: string = MSG_ACT_CLEAR_ACTIONS;
  static ACT_ORDER_66: string = MSG_ACT_ORDER_66;

  #action: string;
  #payload: Server | string | boolean;

  static preHydrate(ns: NS, rawObj: HMCtrlMsg_Interface): HMCtrlMsg | boolean {
    if (!rawObj) {
      return false;
    }
    else if (
      typeof rawObj.action === "undefined"
      || typeof rawObj.payload === "undefined"
    ) {
      throw new Error("CtrlMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      let newMsg: HMCtrlMsg;

      switch (rawObj.action) {
        case MSG_ACT_ADD_TS:
          newMsg = new HMCtrlMsg_ADD_TS(ns, {});
          break;
        case MSG_ACT_RM_TS:
          newMsg = new HMCtrlMsg_RM_TS(ns, "");
          break;
        case MSG_ACT_CLEAR_ACTIONS:
          newMsg = new HMCtrlMsg_CLEAR_ACTIONS(ns);
          break;
        default:
          throw new Error("HMCtrlMsg.preHydrate: Invalid rawObj.action: " + JSON.stringify(rawObj, null, 2));
      }

      // do hydration & return
      newMsg.hydrate(rawObj);
      return newMsg;
    }
  }

  constructor(ns: NS, action: string, payload: Server | string | boolean) {
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
    return super.msgPort;
  }

  get action(): string {
    return this.#action;
  }

  get payload(): Server | string | boolean {
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

  hydrate(rawObj: HMCtrlMsg_Interface): HMCtrlMsg {
    if (
      typeof rawObj.action === "undefined"
      || typeof rawObj.payload === "undefined"
    ) {
      throw new Error("CtrlMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#action = rawObj.action;
      this.#payload = rawObj.payload;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
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
      ns.run(SRV_COMP_FILE_PATH, 1, target, true);
      return false;
    }

    const msg = new HMCtrlMsg_ADD_TS(ns, ns.getServer(target));
    return msg.push();
  }

  constructor(ns: NS, payloadServer: Server) {
    super(ns, MSG_ACT_ADD_TS, payloadServer);
  }

  get payload(): Server {
    return super.payload;
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
    super(ns, MSG_ACT_RM_TS, payloadHostname);
  }

  get payload(): string {
    return super.payload;
  }
}

/**
 * Clear actions control message object for HackManager
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
    const msg = new HMCtrlMsg_RM_TS(ns);
    return msg.push();
  }

  constructor(ns: NS) {
    super(ns, F42_MSG_ACT_CLEAR_ACTIONS, true);
  }

  get payload(): boolean {
    return true;
  }
}