/** @param {NS} ns */
export async function main(ns) {
  let amount = await ns.hack(ns.args[0]);
  saveActionResult(ns, "hack", amount);
}

export const F42_THRALL_ACT_RESULT_PATH = "scripts/dynamic/v2/thrall/tmp/%d-result.js";

export async function saveActionResult(ns, actionType, amount) {
  let pathResult = ns.sprintf(F42_THRALL_ACT_RESULT_PATH, ns.pid);
  let dataResult = {
    type: actionType,
    pid: ns.pid,
    endTs: Date.now(),
    amt: amount,
  };

  ns.write(pathResult, JSON.stringify(dataResult, null, 2), "w");
}