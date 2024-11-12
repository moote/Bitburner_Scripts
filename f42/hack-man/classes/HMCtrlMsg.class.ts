import MsgBase from "/f42/classes/MsgBase.class";
import MsgQueue from "/f42/classes/MsgQueue.class";
import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { Server } from "@ns";

const MSG_ACT_ADD_TS = "add-ts";
const MSG_ACT_RM_TS = "rm-ts";
const MSG_ACT_CLEAR_ACTIONS = "clear-actions";
const MSG_ACT_ORDER_66 = "ORDER-66";

const SRV_COMP_FILE_PATH = "/f42/utility/compromise-server.ts";

/**
 * Base control message for HackManager
 */
export class HMCtrlMsg extends MsgBase {
  static portId: number = PORT_HM_CTRL;
  static ACT_ADD_TS: string = MSG_ACT_ADD_TS;
  static ACT_RM_TS: string = MSG_ACT_RM_TS;
  static ACT_CLEAR_ACTIONS: string = MSG_ACT_CLEAR_ACTIONS;
  static ACT_ORDER_66: string = MSG_ACT_ORDER_66;

  #action: string;
  #payload: Server | string | boolean;

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
    return this.#msgPort();
  }

  get action(): string {
    return this.#action;
  }

  get payload(): string {
    return this.#string;
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
  static staticPush(ns: NS, target: string): boolean{
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
  static staticPush(ns: NS): boolean{
    // post to queue
    const msg = new HMCtrlMsg_RM_TS(ns);
    return msg.push();
  }

  constructor(ns: NS) {
    super(ns, F42_MSG_ACT_CLEAR_ACTIONS, true);
  }
}