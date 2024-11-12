import { MsgObjInterface } from "/f42/cfg/port-defs";

/**
 * The base message port class; separate queue/socket classes
 * override this.
 */
export default class MsgPort {
  #ns: NS;

  constructor(ns: NS) {
    this.#ns = ns;
  }

  get ns(): NS {
    return this.#ns;
  }

  /**
   * Try to push a message, returns false if full, if not
   * then the object is inserted in the stack and 'true' returned
   * 
   * Throws exceptions on other errors.
   */
  pushMessage(msgObj: MsgObjInterface): boolean {
    if (!this.validatePortType(msgObj.portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message stack port: %d", msgObj.portId));
    }

    return MessagePort.doPushMessage(ns, msgObj);
  }

  _doPushMessage(msgObj: MsgObjInterface): boolean {
    const mqPortHandle = this.ns.getPortHandle(msgObj.portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", msgObj.portId));
    }

    return mqPortHandle.tryWrite(msgObj);
  }

  /**
   * Try to pop a message, returns false if empty, if not
   * then the object in the stack ir returned.
   * 
   * Throws exceptions on other errors.
   */
  popMessage(portId: number): MsgObjInterface | boolean {
    if (!this.validatePortType(portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    const mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    const popResult = mqPortHandle.read();

    if (popResult === "NULL PORT DATA") {
      return false;
    }

    return popResult;
  }

  /**
   * Return peek from requested mesage stack port id
   */
  peekMessage(portId: number): MsgObjInterface | boolean {
    if (!this.validatePortType(portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    const mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    const peekResult = mqPortHandle.peek();

    if (peekResult === "NULL PORT DATA") {
      return false;
    }

    return peekResult;
  }

  /**
   * Validate that requested port is a message
   * socket/queue depending on what class has extended this
   * 
   * MUST BE OVERRIDDEN
   */
  validatePortType(portId: number): boolean {
    throw new Error("You must override MessagePort.validateType() " + portId);
    return false;
  }
}