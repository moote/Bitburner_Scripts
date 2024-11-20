import { HMCtrlMsg_Interface, HMJobMsg_Interface, MsgObjData_Interface } from "/f42/classes/helpers/interfaces";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";

export type MsgQAcceptedMsg_Type = HMCtrlMsg_Interface | HMJobMsg_Interface;

/**
 * A message queue that is fixed to one port,
 * used for reaing incoming messages
 */
export default class MsgQueueReader extends MsgQueue {
  #portId: number;

  constructor(ns: NS, portId:number){
    super(ns);
    this.#portId = portId;
  }

  isHMJobMsg_Interface(msg: MsgObjData_Interface): msg is HMJobMsg_Interface {
    return msg.msgType === MsgObjType.JOB;
  }

  isHMCtrlMsg_Interface(msg: MsgObjData_Interface): msg is HMCtrlMsg_Interface {
    return msg.msgType === MsgObjType.CTRL;
  }

  /**
   * @deprecated This is a read only queue; do not use
   */
  pushMessage(msgObj: MsgQAcceptedMsg_Type): boolean {
    throw new Error("This queue is for reading only! " + msgObj.msgId);
  }

  popMessage(): MsgQAcceptedMsg_Type | false {
    return this.#testMsg(super.popMessage(this.#portId));
  }

  peekMessage(): MsgQAcceptedMsg_Type | false {
    return this.#testMsg(super.peekMessage(this.#portId));
  }

  #testMsg(msg: MsgObjData_Interface | false): MsgQAcceptedMsg_Type | false {
    if(msg === false){
      return false;
    }
    else if (this.isHMJobMsg_Interface(msg) || this.isHMCtrlMsg_Interface(msg)) {
      return msg;
    }
    else {
      return false;
    }
  }
}