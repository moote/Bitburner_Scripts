import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgSocket from "/f42/classes/Messaging/MsgSocket.class";
import { PORT_HM_TARGETS } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { HMTgtSrvListMsg_Interface } from "/f42/classes/helpers/interfaces";
import { MsgObjType } from "/f42/hack-man/classes/enums";

/**
 * TargetServer list socket message for HackManager
 */
export default class HMTgtSrvListMsg extends MsgBase implements HMTgtSrvListMsg_Interface {
  static portId: number = PORT_HM_TARGETS;

  #targets: string[];

  static preHydrate(ns: NS, rawObj: HMTgtSrvListMsg_Interface): HMTgtSrvListMsg | false {
    if (!rawObj) {
      return false;
    }

    // do hydration & return
    const newMsg = new HMTgtSrvListMsg(ns, []);
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
  static staticPush(ns: NS, targets: string[]): boolean {
    const msg = new HMTgtSrvListMsg(ns, targets);
    return msg.push();
  }

  constructor(ns: NS, targets: string[]) {
    super(
      timestampAsBase62Str(),
      HMTgtSrvListMsg.portId,
      new MsgSocket(ns)
    );

    this.#targets = targets;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgSocket {
    return super.msgPort;
  }

  get msgType() : MsgObjType {
    return MsgObjType.TS_LIST;
  }

  get targets(): string[] {
    return this.#targets;
  }

  serialize(): HMTgtSrvListMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      targets: this.#targets,
    };
  }

  hydrate(rawObj: HMTgtSrvListMsg_Interface): void {
    if (
      typeof rawObj.targets === "undefined"
    ) {
      throw new Error("HMTgtSrvListMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#targets = rawObj.targets;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
