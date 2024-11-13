import { PORT_COMPLETED_JOBS } from "/f42/cfg/port-defs";
import { MsgQueueReader } from "/f42/classes/MsgQueueReader.class";
import HMJobMsg from "./HMJobMsg.class";

export class HMCompJobQReader extends MsgQueueReader {
  constructor(ns: NS){
    super(ns, PORT_COMPLETED_JOBS);
  }

  popMessage(): HMJobMsg | boolean {
    return HMJobMsg.preHydrate(this.ns, super.popMessage());
  }

  peekMessage(): HMJobMsg | boolean {
    return HMJobMsg.preHydrate(this.ns, super.peekMessage());
  }
}