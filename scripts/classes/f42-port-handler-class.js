import F42Base from '/scripts/classes/f42-base-class.js';
import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";
import * as f42PortDefs from "/scripts/cfg/port-defs.js";

/**
 * Handle port connection, maintainance etc.
 */
export default class F42PortHandler extends F42Base {
  #portHandles = {};
  #maxPortLength = -1;
  #maxPortLengthTestPortKey = f42PortDefs.F42_RES_PORTS[f42PortDefs.F42_PORT_MAX_PORT_LENGTH_TEST].accessKey;

  constructor(ns, logger) {
    super(ns, logger);
    this.log("constructor", "Init");

    // this also sets if first call
    this.getMaxPortLength(true);
  }

  getPortHandle(portId, saveIfNotFound = false, accessKey = "") {
    let fnN = "getPortHandle";
    this.log(fnN, super.ns.sprintf("%d", portId));

    // protect message stacks
    if (F42MessageStack.validateStack(portId)) {
      let error = super.ns.sprintf("!! Port %d is a message stack, access using F42MessageStack", portId);
      this.log(fnN, error);
      throw new Error(error);
    }

    // protect reserved ports
    if (!this.#checkReservedPortAccess(portId, accessKey)) {
      let error = super.ns.sprintf("!! Port %d is reserved: %s", portId, f42PortDefs.F42_RES_PORTS[portId].name);
      this.log(fnN, error);
      throw new Error(error);
    }

    // see if we have handle already
    if (this.#portHandleExists(portId)) {
      // we have handle already
      this.log(fnN, super.ns.sprintf("PortHandle exists in portHandles: %d", portId));
    }
    else {
      this.log(fnN, super.ns.sprintf("PortHandle not in portHandles: %d", portId));

      // dont have it already, try to get a new handle
      let tmpHandle = F42PortHandle.f42PHFactory(super.ns, this.logger, portId);

      if (tmpHandle) {
        if (saveIfNotFound) {
          // add to list
          this.#portHandles[portId] = tmpHandle;
          this.log(fnN, super.ns.sprintf("Got PortHandle and added to portHandles: %d", portId));
        }
        else {
          // do not add to list, return tmpHandle
          this.log(fnN, super.ns.sprintf("Got PortHandle NOT added to portHandles: %d", portId));
          return tmpHandle;
        }
      }
      else {
        this.log(fnN, super.ns.sprintf("!! Failed to get PortHandle: %d", portId));
        return false;
      }
    }

    // if we're here, port exists in list, return
    return this.#portHandles[portId];
  }

  #portHandleExists(portId) {
    let fnN = "portHandleExists";
    this.log(fnN, super.ns.sprintf("%d", portId));
    return (portId in this.#portHandles);
  }

  #checkReservedPortAccess(portId, accessKey) {
    if (!(portId in f42PortDefs.F42_RES_PORTS)) {
      // not a reserved port
      return true;
    }

    // reserved port, test access key
    return (f42PortDefs.F42_RES_PORTS[portId].accessKey === accessKey);
  }

  getMaxPortLength(forceReCalc = false) {
    let fnN = "getMaxPortLength";
    this.log(fnN, super.ns.sprintf("forceReCalc: %s", forceReCalc));

    if (this.#maxPortLength !== -1 && !forceReCalc) {
      this.log(fnN, super.ns.sprintf("load from var: %d", this.#maxPortLength));
      return this.#maxPortLength;
    }

    let maxPort = this.getPortHandle(f42PortDefs.F42_PORT_MAX_PORT_LENGTH_TEST, true, this.#maxPortLengthTestPortKey);

    if (!maxPort) {
      throw new Error("!! F42PortHandler.verifyMaxPortLength -> Can't get handle to max port length port (1)");
    }

    if (!maxPort.empty() && !forceReCalc) {
      this.#maxPortLength = maxPort.peek();
      this.log(fnN, super.ns.sprintf("load from port: %d", this.#maxPortLength));
      return this.#maxPortLength;
    }

    // make sure port is clear
    maxPort.clear();

    // init counter
    let cnt = 0;

    // add elements until full
    while (!maxPort.full()) {
      maxPort.write(cnt);
      cnt++;
    }

    // clear the port
    maxPort.clear();

    // save counter value to port and var
    maxPort.write(cnt);
    this.#maxPortLength = cnt;
    this.log(fnN, super.ns.sprintf("calculated value: %d", this.#maxPortLength));

    // return
    return cnt;
  }
}

class F42PortHandle extends F42Base {
  f42PortHandle = true;
  #portId;
  #portHandle;

  static f42PHFactory(ns, logger, portId) {
    let ph = ns.getPortHandle(portId);

    if (ph) {
      return new F42PortHandle(ns, logger, portId, ph)
    }
    else {
      return false;
    }
  }

  constructor(ns, logger, portId, portHandle) {
    super(ns, logger);
    this.#portId = portId;
    this.#portHandle = portHandle;
  }

  get portId() {
    let fnN = "get portId";
    this.log(fnN, "");
    return this.#portId;
  }

  toString() {
    return (`--------
>> F42PortHandle: ${this.#portId}
--------
- Is Empty? ${this.empty() ? "YES" : "NO"}
- Is Full? ${this.full() ? "YES" : "NO"}
- First Element: ${JSON.stringify(this.peek())}
- Timestamp: ${timestampAsBase62Str()}
--------`);
  }

  write(value) {
    let fnN = "write";
    this.log(fnN, JSON.stringify(value));
    return this.#portHandle.tryWrite(value);
  }

  read() {
    this.log("read");
    let result = this.#portHandle.read();

    if (result === "NULL PORT DATA") {
      return false;
    }

    return result;
  }

  peek() {
    this.log("peek");
    let result = this.#portHandle.peek();

    if (result === "NULL PORT DATA") {
      return false;
    }

    return result;
  }

  nextWrite() {
    this.log("nextWrite");
    return this.#portHandle.nextWrite();
  }

  full() {
    this.log("full");
    return this.#portHandle.full();
  }

  empty() {
    this.log("empty");
    return this.#portHandle.empty();
  }

  clear() {
    this.log("clear");
    return this.#portHandle.clear();
  }
}