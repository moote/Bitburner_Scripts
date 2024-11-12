import MsgPort from "./MsgPort.class";
import { MSG_QUEUES } from "/f42/cfg/port-defs";

/**
 * Controls comms with ports defined as queues
 */
export default class MsgQueue extends MsgPort {
  constructor(ns: NS){
    super(ns);
  }

  /**
   * Validate that requested port is a message queue
   */
  validatePortType(portId: number): boolean {
    if (MSG_QUEUES.includes(portId)) {
      return true;
    }
    else {
      return false;
    }
  }
}