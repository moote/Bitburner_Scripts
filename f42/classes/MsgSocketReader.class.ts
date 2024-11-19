import { HMStateMsg_Interface, HMTgtSrvListMsg_Interface, MsgObjData_Interface } from "/f42/classes/helpers/interfaces";
import MsgSocket from "/f42/classes/MsgSocket.class";

type MsgScktAcceptedMsg_Type = HMTgtSrvListMsg_Interface | HMStateMsg_Interface;

/**
 * A message queue that is fixed to one port,
 * used for reaing incoming messages
 */
export class MsgSocketReader extends MsgSocket {
  #portId: number;

  constructor(ns: NS, portId:number|string){
    super(ns);

    if(typeof portId === "string"){
      portId = parseInt(portId);
    }

    this.#portId = portId;
  }

  /**
   * @deprecated This is a read only queue; do not use
   */
  pushMessage(msgObj: MsgScktAcceptedMsg_Type): boolean {
    throw new Error("This queue is for reading only! " + msgObj.msgId);
  }

  popMessage(): MsgScktAcceptedMsg_Type | boolean {
    return super.popMessage(this.#portId);
  }

  peekMessage(): MsgScktAcceptedMsg_Type | boolean {
    return super.peekMessage(this.#portId);
  }
}