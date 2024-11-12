import { Server } from "@ns";
import { MsgObjInterface, F42_MSG_STACK_HM_CTRL } from "/f42/cfg/port-defs";

const F42_MSG_ACT_ADD_TS = "add-ts";
const F42_MSG_ACT_RM_TS = "rm-ts";
// const F42_MSG_ACT_CLEAR_ACTIONS = "clear-actions";
// const F42_MSG_ACT_ORDER_66 = "ORDER-66";

/**
 * Base control message for HackManager
 */
class HMCtrlMsg implements MsgObjInterface {
  #portId: F42_MSG_STACK_HM_CTRL;
  #msgId: string;
  #action: string;
  #payload: Server | string | boolean

  constructor(action: string, payload: Server | string | boolean) {
    this.#msgId = timestampAsBase62Str();
    this.#action = action;
    this.#payload = payload;
  }

  get portId(): number {
    return this.#portId;
  }

  get msgId(): string {
    return this.#msgId;
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
  constructor(payloadServer: Server){
    super(F42_MSG_ACT_ADD_TS, payloadServer);
  }
}

/**
 * Remove server control message object for HackManager
 */
export class HMCtrlMsg_RM_TS extends HMCtrlMsg {
  constructor(payloadHostname: string){
    super(F42_MSG_ACT_RM_TS, payloadHostname);
  }
}

// /**
//  * Clear actions control message object for HackManager
//  */
// export class HMCtrlMsg_CLEAR_ACTIONS extends HMCtrlMsg {
//   constructor(){
//     super(F42_MSG_ACT_CLEAR_ACTIONS, true);
//   }
// }