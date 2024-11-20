import { PORT_COMPLETED_JOBS } from "/f42/cfg/port-defs";
import MsgQueueReader, { MsgQAcceptedMsg_Type } from "/f42/classes/Messaging/MsgQueueReader.class";
import HMJobMsg from "/f42/hack-man/classes/HMJobMsg.class";
import { HMJobMsg_Interface } from "/f42/classes/helpers/interfaces";
import { MsgObjType } from "/f42/hack-man/classes/enums";

export class HMCompJobQReader extends MsgQueueReader {
  constructor(ns: NS) {
    super(ns, PORT_COMPLETED_JOBS);
  }

  #validateMsg(msg: MsgQAcceptedMsg_Type | boolean): HMJobMsg | false {
    if ((typeof msg !== "boolean") && this.isHMJobMsg_Interface(msg)) {
      return HMJobMsg.preHydrate(this.ns, msg);
    }
    else {
      return false;
    }
  }

  popMessage(): HMJobMsg | false {
    return this.#validateMsg(super.popMessage());
  }

  peekMessage(): HMJobMsg | false {
    return this.#validateMsg(super.peekMessage());
  }
}