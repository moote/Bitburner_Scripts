import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import F42PortHandler from "/scripts/classes/f42-port-handler-class.js"
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";
import { F42_PORT_HMO_COPY, F42_PORT_HACK_CFG, F42_HM_TARGETS, F42_HM_STATE, F42_THRALL_SRV_WORKING_LOG, F42_ORDER_66 } from "/scripts/cfg/port-defs.js";

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "CfgPortUtil", true);
  let scriptTitle = "CfgPortUtil";
  let scriptDescription = "View / clear config ports";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("hm-copy", "View the HackManager copy port (NOT IMPLEMENTED)"),
    F42ClFlagDef.getOptBool("hack-cfg", "View the HackManager state view port"),
    F42ClFlagDef.getOptBool("hm-targets", "View the HackManager target list port"),
    F42ClFlagDef.getOptBool("hm-state", "View the HackManager state view port"),
    F42ClFlagDef.getOptBool("thrall-wip", "Thrall working log (NOT IPLEMENTED)"),
    F42ClFlagDef.getOptBool("order-66", "View the order 66 broadcast port"),
    F42ClFlagDef.getOptBool("d", "Dequeue the specified port (NOT IMPLEMENTED)"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let portHandler = new F42PortHandler(ns, logger);
  let pHandle;
  let portDesc = "";
  let portId = 0;
  let didClear = false;

  if (feedback.getFlag("hm-copy")) {
    pHandle = portHandler.getPortHandle(F42_PORT_HMO_COPY.id, false, F42_PORT_HMO_COPY.key);
    portDesc = "F42_PORT_HMO_COPY";
    portId = F42_PORT_HMO_COPY.id;
  }
  else if (feedback.getFlag("hack-cfg")) {
    pHandle = portHandler.getPortHandle(F42_PORT_HACK_CFG.id, false, F42_PORT_HACK_CFG.key);
    portDesc = "F42_PORT_HACK_CFG";
    portId = F42_PORT_HACK_CFG.id;
  }
  else if (feedback.getFlag("hm-targets")) {
    pHandle = portHandler.getPortHandle(F42_HM_TARGETS.id, false, F42_HM_TARGETS.key);
    portDesc = "F42_HM_TARGETS";
    portId = F42_HM_TARGETS.id;
  }
  else if (feedback.getFlag("hm-state")) {
    pHandle = portHandler.getPortHandle(F42_HM_STATE.id, false, F42_HM_STATE.key);
    portDesc = "F42_HM_STATE";
    portId = F42_HM_STATE.id;
  }
  else if (feedback.getFlag("thrall-wip")) {
    pHandle = portHandler.getPortHandle(F42_THRALL_SRV_WORKING_LOG.id, false, F42_THRALL_SRV_WORKING_LOG.key);
    portDesc = "F42_THRALL_SRV_WORKING_LOG";
    portId = F42_THRALL_SRV_WORKING_LOG.id;
  }
  else if (feedback.getFlag("order-66")) {
    pHandle = portHandler.getPortHandle(F42_ORDER_66.id, false, F42_ORDER_66.key);
    portDesc = "F42_ORDER_66";
    portId = F42_ORDER_66.id;
  }
  else {
    // show help
    feedback.addUserDefErrorAndEnd("ERROR", "You must specify a port");
    return;
  }

  if (feedback.getFlag("d")) {
    // clear
    pHandle.clear();
    didClear = true;
  }

  // peek
  logger.tailTitle = ns.sprintf("PeekStack: %s", feedback.getFlag("p"));

  while (true) {
    let pData = pHandle.peek();
    logger.tailTitle = (ns.sprintf("PeekPort: %s(%d) -> %s", portDesc, portId, (!pData ? "EMPTY" : "NOT_EMPTY")));
    ns.clearLog();
    feedback.printTitle(false);
    if(didClear){
      feedback.printHiLi(">> PORT CLEARED");
    }
    feedback.printf(">> p: %d", portId);
    feedback.printf(">> data: %s", JSON.stringify(pData, null, 2));
    feedback.printf(timestampAsBase62Str());
    feedback.printEnd();
    await ns.sleep(250);
  }
}
