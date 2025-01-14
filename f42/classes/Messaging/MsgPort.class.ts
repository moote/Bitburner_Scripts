import { MsgObjData_Interface } from "/f42/classes/helpers/interfaces";

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
  pushMessage(msgObj: MsgObjData_Interface): boolean {
    if (!this.validatePortType(msgObj.portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message port: %d", msgObj.portId));
    }

    return this._doPushMessage(msgObj);
  }

  _doPushMessage(msgObj: MsgObjData_Interface): boolean {
    const mqPortHandle = this.ns.getPortHandle(msgObj.portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", msgObj.portId));
    }

    // this.ns.tprintf("MsgPort._doPushMessage: msgObj.msgId: %s", JSON.stringify(msgObj, null, 2));

    const writeResult = mqPortHandle.tryWrite(msgObj);

    // this.ns.tprintf(">>>>>>>>>>>>>>>>>>> %s", JSON.stringify(writeResult));
    // this.ns.tprintf(">>>>>>>>>>>>>>>>>>> %s", JSON.stringify(writeResult));
    // this.ns.tprintf(">>>>>>>>>>>>>>>>>>> %s", JSON.stringify(this.ns.readPort(7)));

    return writeResult;
  }

  /**
   * Try to pop a message, returns false if empty, if not
   * then the object in the stack ir returned.
   * 
   * Throws exceptions on other errors.
   */
  popMessage(portId: number): MsgObjData_Interface | false {
    if (!this.validatePortType(portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message port: %d", portId));
    }

    const mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    const popResult = mqPortHandle.read();

    // this.ns.tprintf("MsgPort.popMessage: %s", JSON.stringify(popResult, null, 2));

    if (popResult === "NULL PORT DATA") {
      return false;
    }

    return popResult;
  }

  /**
   * Return peek from requested mesage stack port id
   */
  peekMessage(portId: number): MsgObjData_Interface | false {
    if (!this.validatePortType(portId)) {
      throw new Error(this.ns.sprintf("!! Not a valid message port: %d", portId));
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