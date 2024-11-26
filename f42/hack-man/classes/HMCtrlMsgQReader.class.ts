import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import MsgQueueReader, { MsgQAcceptedMsg_Type } from "/f42/classes/Messaging/MsgQueueReader.class";
import { HMCtrlMsg } from "/f42/hack-man/classes/HMCtrlMsg.class";

export class HMCtrlMsgQReader extends MsgQueueReader {
  constructor(ns: NS) {
    super(ns, PORT_HM_CTRL);
  }

  #validateMsg(msg: MsgQAcceptedMsg_Type | false): HMCtrlMsg | false {
    if (msg !== false && this.isHMCtrlMsg_Interface(msg)) {
      return HMCtrlMsg.preHydrate(this.ns, msg);
    }
    else {
      return false;
    }
  }

  /**
   * Pops a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  popMessage(): HMCtrlMsg | false {
    return this.#validateMsg(super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  peekMessage(): HMCtrlMsg | false {
    return this.#validateMsg(super.peekMessage());
  }
}