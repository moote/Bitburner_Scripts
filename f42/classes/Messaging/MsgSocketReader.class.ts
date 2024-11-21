import { GeneralCfgMsg_Interface, HMStateMsg_Interface, HMTgtSrvListMsg_Interface, MsgObjData_Interface } from "/f42/classes/helpers/interfaces";
import MsgSocket from "/f42/classes/Messaging/MsgSocket.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";

export type MsgScktAcceptedMsg_Type = GeneralCfgMsg_Interface | HMTgtSrvListMsg_Interface | HMStateMsg_Interface;

/**
 * A message queue that is fixed to one port,
 * used for reaing incoming messages
 */
export default class MsgSocketReader extends MsgSocket {
  #portId: number;

  constructor(ns: NS, portId: number | string) {
    super(ns);

    if (typeof portId === "string") {
      portId = parseInt(portId);
    }

    this.#portId = portId;
  }

  isHMStateMsg_Interface(msg: MsgObjData_Interface): msg is HMStateMsg_Interface {
    return msg.msgType === MsgObjType.HM_STATE;
  }

  isHMTgtSrvListMsg_Interface(msg: MsgObjData_Interface): msg is HMTgtSrvListMsg_Interface {
    return msg.msgType === MsgObjType.TS_LIST;
  }

  isGeneralCfgMsg_Interface(msg: MsgObjData_Interface): msg is GeneralCfgMsg_Interface {
    return msg.msgType === MsgObjType.GENERAL_CFG;
  }

  /**
   * @deprecated This is a read only queue; do not use
   */
  pushMessage(msgObj: MsgScktAcceptedMsg_Type): boolean {
    throw new Error("This queue is for reading only! " + msgObj.msgId);
  }

  popMessage(): MsgScktAcceptedMsg_Type | false {
    return this.#testMsg(super.popMessage(this.#portId));
  }

  peekMessage(): MsgScktAcceptedMsg_Type | false {
    return this.#testMsg(super.peekMessage(this.#portId));
  }

  #testMsg(msg: MsgObjData_Interface | false): MsgScktAcceptedMsg_Type | false {
    if(msg === false){
      return false;
    }
    else if (
      this.isHMStateMsg_Interface(msg)
      || this.isHMTgtSrvListMsg_Interface(msg)
      || this.isGeneralCfgMsg_Interface(msg)
    ) {
      return msg;
    }
    else {
      return false;
    }
  }
}