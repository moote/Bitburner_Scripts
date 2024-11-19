import { F42_RES_PORTS, MsgObjData_Interface } from "/f42/cfg/port-defs";

export default class MessageQueue {
  /**
   * Try to push a message, returns false if full, if not
   * then the object is inserted in the stack and 'true' returned
   * 
   * Throws exceptions on other errors.
   */
  static pushMessage(ns: NS, msgObj: MsgObjData_Interface): boolean {
    if (!F42MessageStack.validateStack(msgObj.portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", msgObj.portId));
    }

    const mqPortHandle = ns.getPortHandle(msgObj.portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", msgObj.portId));
    }

    return mqPortHandle.tryWrite(msgObj);
  }

  /**
   * Try to pop a message, returns false if empty, if not
   * then the object in the stack ir returned.
   * 
   * Throws exceptions on other errors.
   */
  static popMessage(ns: NS, portId: number): MsgObjData_Interface | boolean {
    if (!F42MessageStack.validateStack(portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    const mqPortHandle = ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
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
  static peekMessage(ns: NS, portId: number): MsgObjData_Interface | boolean {
    if (!F42MessageStack.validateStack(portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    const mqPortHandle = ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
    }

    const peekResult = mqPortHandle.peek();

    if (peekResult === "NULL PORT DATA") {
      return false;
    }

    return peekResult;
  }

  /**
   * Validate that requested port is a message stack
   */
  static validateStack(portId: number): boolean {
    if ((portId in F42_RES_PORTS) && F42_RES_PORTS[portId].isMessageStack) {
      return true;
    }
    else {
      return false;
    }
  }
}