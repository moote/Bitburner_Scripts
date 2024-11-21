import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgSocket from "/f42/classes/Messaging/MsgSocket.class";
import { PORT_GENERAL_CFG } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { GeneralCfgMsg_Interface, GeneralCfgMsgPSrv_Interface } from "/f42/classes/helpers/interfaces";
import { getEmpty_GeneralCfgMsg } from "/f42/classes/helpers/empty-object-getters";
import { MsgObjType } from "/f42/hack-man/classes/enums";

/**
 * TargetServer list socket message for HackManager
 */
export default class GeneralCfgMsg extends MsgBase implements GeneralCfgMsg_Interface {
  static portId: number = PORT_GENERAL_CFG;

  #purchasedServers: GeneralCfgMsgPSrv_Interface;

  static preHydrate(ns: NS, rawObj: GeneralCfgMsg_Interface): GeneralCfgMsg | false {
    // do hydration & return
    const newMsg = new GeneralCfgMsg(ns, getEmpty_GeneralCfgMsg());
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
  static staticPush(ns: NS, msgIntObj: GeneralCfgMsg_Interface): boolean {
    const msg = new GeneralCfgMsg(ns, msgIntObj);
    return msg.push();
  }

  constructor(ns: NS, msgIntObj: GeneralCfgMsg_Interface) {
    super(
      timestampAsBase62Str(),
      GeneralCfgMsg.portId,
      new MsgSocket(ns)
    );

    this.#purchasedServers = msgIntObj.purchasedServers;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgSocket {
    return <MsgSocket>super.msgPort;
  }

  get msgType(): MsgObjType {
    return MsgObjType.GENERAL_CFG;
  }

  get purchasedServers(): GeneralCfgMsgPSrv_Interface {
    return this.#purchasedServers;
  }

  serialize(): GeneralCfgMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      purchasedServers: this.#purchasedServers,
    };
  }

  hydrate(rawObj: GeneralCfgMsg_Interface): void {
    if (
      typeof rawObj.purchasedServers === "undefined"
    ) {
      throw new Error("GeneralCfgMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.#purchasedServers = rawObj.purchasedServers;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
