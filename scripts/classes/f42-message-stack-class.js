import { F42_RES_PORTS } from "/scripts/cfg/port-defs.js";

export default class F42MessageStack {
  /**
   * Try to push a message, returns false if full, if not
   * then the object is inserted in the stack and 'true' returned
   * 
   * Throws exceptions on other errors.
   */
  static pushMessage(ns, portId, messageObj) {
    if (!F42MessageStack.validateStack(portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    let mqPortHandle = ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
    }

    return mqPortHandle.tryWrite(messageObj);
  }

  /**
   * Try to pop a message, returns false if empty, if not
   * then the object in the stack ir returned.
   * 
   * Throws exceptions on other errors.
   */
  static popMessage(ns, portId) {
    if (!F42MessageStack.validateStack(portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    let mqPortHandle = ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
    }

    let popResult = mqPortHandle.read();

    if (popResult === "NULL PORT DATA") {
      return false;
    }

    return popResult;
  }

  /**
   * Return peek from requested mesage stack port id
   */
  static peekMessage(ns, portId) {
    if (!F42MessageStack.validateStack(portId)) {
      throw new Error(ns.sprintf("!! Not a valid message stack port: %d", portId));
    }

    let mqPortHandle = ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
    }

    let peekResult = mqPortHandle.peek();

    if (peekResult === "NULL PORT DATA") {
      return false;
    }

    return peekResult;
  }

  /**
   * Validate that requested port is a message stack
   */
  static validateStack(portId) {
    if ((portId in F42_RES_PORTS) && F42_RES_PORTS[portId].isMessageStack) {
      return true;
    }
    else {
      return false;
    }
  }
}