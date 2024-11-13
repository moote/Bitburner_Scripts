import MsgPort from "./MsgPort.class";
import { MSG_QUEUES, PORT_TYPE_QUEUE } from "/f42/cfg/port-defs";

/**
 * Controls comms with ports defined as queues
 */
export default class MsgQueue extends MsgPort {
  constructor(ns: NS){
    super(ns);
    this
  }

  get portType(): string {
    return PORT_TYPE_QUEUE;
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
