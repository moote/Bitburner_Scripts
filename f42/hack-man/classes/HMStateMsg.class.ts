import MsgBase from "/f42/classes/MsgBase.class";
import MsgSocket from "/f42/classes/MsgSocket.class";
import { PORT_HM_STATE } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { HMState_Interface, HMStateMsg_Interface } from "/f42/classes/helpers/interfaces";
import { getEmpty_HMState_Interface } from "/f42/classes/helpers/empty-object-getters";
import { MsgObjType } from "/f42/hack-man/classes/enums";

/**
 * TargetServer list socket message for HackManager
 */
export class HMStateMsg extends MsgBase implements HMStateMsg_Interface {
  static portId: number = PORT_HM_STATE;

  #state: HMState_Interface;

  static preHydrate(ns: NS, rawObj: HMStateMsg_Interface): HMStateMsg | false {
    if (!rawObj) {
      return false;
    }

    // do hydration & return
    const newMsg = new HMStateMsg(ns, getEmpty_HMState_Interface());
    newMsg.hydrate(rawObj);
    return newMsg;
  }

  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param target Array of target hostnames
   * @returns Result of push
   */
  static staticPush(ns: NS, state: HMState_Interface): boolean {
    const msg = new HMStateMsg(ns, state);
    return msg.push();
  }

  constructor(ns: NS, state: HMState_Interface) {
    super(
      timestampAsBase62Str(),
      HMStateMsg.portId,
      new MsgSocket(ns)
    );

    this.#state = state;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgSocket {
    return super.msgPort;
  }

  get msgType() : MsgObjType {
    return MsgObjType.HM_STATE;
  }

  get state(): HMState_Interface {
    return this.#state;
  }

  serialize(): HMStateMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      state: this.#state,
    };
  }

  hydrate(rawObj: HMStateMsg_Interface): void {
    if (
      typeof rawObj.state === "undefined"
    ) {
      throw new Error("HMTgtSrvListMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#state = rawObj.state;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
