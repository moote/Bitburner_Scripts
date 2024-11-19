import { PORT_COMPLETED_JOBS } from "/f42/cfg/port-defs";
import { MsgQAcceptedMsg_Type, MsgQueueReader } from "/f42/classes/MsgQueueReader.class";
import HMJobMsg from "./HMJobMsg.class";
import { HMJobMsg_Interface } from "/f42/classes/helpers/interfaces";
import { MsgObjType } from "/f42/hack-man/classes/enums";

export class HMCompJobQReader extends MsgQueueReader {
  constructor(ns: NS){
    super(ns, PORT_COMPLETED_JOBS);
  }

  #isHMJobMsg_Interface(msg: MsgQAcceptedMsg_Type): msg is HMJobMsg_Interface {
    return msg.msgType === MsgObjType.JOB;
  }

  #validateMsg(msg: MsgQAcceptedMsg_Type | boolean): HMJobMsg | false {
    if((typeof msg !== "boolean") && this.#isHMJobMsg_Interface(msg)){
      return HMJobMsg.preHydrate(this.ns, msg);
    }
    else{
      return false;
    }
  }

  popMessage(): HMJobMsg | boolean {
    return this.#validateMsg(super.popMessage());
  }

  peekMessage(): HMJobMsg | boolean {
    return this.#validateMsg(super.peekMessage());
  }
}