import MsgPort from "./MsgPort.class";
import { MSG_SOCKETS, PORT_TYPE_SOCKET } from "/f42/cfg/port-defs";

/**
 * Controls comms with ports defined as sockets
 */
export default class MsgSocket extends MsgPort {
  constructor(ns: NS) {
    super(ns);
  }

  get portType(): string {
    return PORT_TYPE_SOCKET;
  }

  /**
   * Overrides MessagePort.pushMessage() so we can ensure only
   * one message ever on socket
   * 
   * @param msgObj 
   */
  pushMessage(msgObj: MsgObjInterface): boolean {
    // validate socket
    if (!this.validatePortType(msgObj.portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid socket port: %d", msgObj.portId));
    }

    // clear
    this.ns.clearPort(msgObj.portId);

    // push message
    this._doPushMessage(msgObj);
  }

  /**
   * Validate that requested port is a message socket
   */
  validatePortType(portId: number): boolean {
    if (MSG_SOCKETS.includes(portId)) {
      return true;
    }
    else {
      return false;
    }
  }
}