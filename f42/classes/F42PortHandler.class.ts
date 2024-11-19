import { NetscriptPort } from "@ns";
import F42Logger from "/f42/classes/f42-logger-class";
import F42Base from "/f42/classes/F42Base.class";
import MessageStack, { MsgObjData_Interface } from "/f42/classes/MessageStack.class";
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import * as f42PortDefs from "f42/cfg/port-defs";

/**
 * Handle port connection, maintainance etc.
 * 
 */
export default class F42PortHandler extends F42Base {
  #portHandles = {};
  #maxPortLength = -1;
  #maxPortLengthTestPortKey = f42PortDefs.F42_RES_PORTS[f42PortDefs.F42_PORT_MAX_PORT_LENGTH_TEST].accessKey;

  constructor(logger: F42Logger) {
    super(logger);
    this.log("constructor", "Init");

    // this also sets if first call
    this.getMaxPortLength(true);
  }

  getPortHandle(portId: number, saveIfNotFound = false, accessKey = ""): F42PortHandle {
    const fnN = "getPortHandle";
    this.log(fnN, super.ns.sprintf("%d", portId));

    // protect message stacks
    if (MessageStack.validateStack(portId)) {
      const error = super.ns.sprintf("!! Port %d is a message stack, access using MessageStack", portId);
      this.log(fnN, error);
      throw new Error(error);
    }

    // protect reserved ports
    if (!this.#checkReservedPortAccess(portId, accessKey)) {
      const error = super.ns.sprintf("!! Port %d is reserved: %s", portId, f42PortDefs.F42_RES_PORTS[portId].name);
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
      const tmpHandle = F42PortHandle.f42PHFactory(super.ns, this.logger, portId);

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

  #portHandleExists(portId: number): F42PortHandle {
    const fnN = "portHandleExists";
    this.log(fnN, super.ns.sprintf("%d", portId));
    return (portId in this.#portHandles);
  }

  #checkReservedPortAccess(portId: number, accessKey: string): boolean {
    if (!(portId in f42PortDefs.F42_RES_PORTS)) {
      // not a reserved port
      return true;
    }

    // reserved port, test access key
    return (f42PortDefs.F42_RES_PORTS[portId].accessKey === accessKey);
  }

  getMaxPortLength(forceReCalc = false): number {
    const fnN = "getMaxPortLength";
    this.log(fnN, super.ns.sprintf("forceReCalc: %s", forceReCalc));

    if (this.#maxPortLength !== -1 && !forceReCalc) {
      this.log(fnN, super.ns.sprintf("load from var: %d", this.#maxPortLength));
      return this.#maxPortLength;
    }

    const maxPort = this.getPortHandle(f42PortDefs.F42_PORT_MAX_PORT_LENGTH_TEST, true, this.#maxPortLengthTestPortKey);

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

export class F42PortHandle extends F42Base {
  #portId: number;
  #nsPortHandle: NetscriptPort;

  static f42PHFactory(logger: F42Logger, portId: number): F42PortHandle {
    const ph = ns.getPortHandle(portId);

    if (ph) {
      return new F42PortHandle(logger, portId, ph)
    }
    else {
      return false;
    }
  }

  constructor(logger: F42Logger, portId: number, nsPortHandle: NetscriptPort) {
    super(ns, logger);
    this.#portId = portId;
    this.#nsPortHandle = nsPortHandle;
  }

  get portId(): numnber {
    const fnN = "get portId";
    this.log(fnN, "");
    return this.#portId;
  }

  toString(): string {
    return (`--------
>> F42PortHandle: ${this.#portId}
--------
- Is Empty? ${this.empty() ? "YES" : "NO"}
- Is Full? ${this.full() ? "YES" : "NO"}
- First Element: ${JSON.stringify(this.peek())}
- Timestamp: ${timestampAsBase62Str()}
--------`);
  }

  write(value: MsgObjData_Interface): boolean {
    const fnN = "write";
    this.log(fnN, JSON.stringify(value));
    return this.#nsPortHandle.tryWrite(value);
  }

  read(): MsgObjData_Interface | boolean {
    this.log("read");
    const result = this.#nsPortHandle.read();

    if (result === "NULL PORT DATA") {
      return false;
    }

    return result;
  }

  peek(): MsgObjData_Interface | boolean {
    this.log("peek");
    const result = this.#nsPortHandle.peek();

    if (result === "NULL PORT DATA") {
      return false;
    }

    return result;
  }

  nextWrite(): Promise<void> {
    this.log("nextWrite");
    return this.#nsPortHandle.nextWrite();
  }

  full(): boolean {
    this.log("full");
    return this.#nsPortHandle.full();
  }

  empty(): boolean {
    this.log("empty");
    return this.#nsPortHandle.empty();
  }

  clear(): void {
    this.log("clear");
    return this.#nsPortHandle.clear();
  }
}