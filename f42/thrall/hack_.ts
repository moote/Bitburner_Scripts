import { ThrallActionResult } from "./classes/interfaces";

export const RESULT_FLAG = "-THRALL-result";
export const JOB_RESULT_PATH = "scripts/dynamic/v3/thrall/tmp/%d" + RESULT_FLAG + ".txt";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const amount = await ns.hack(ns.args[0]);
  saveActionResult(ns, "hack", amount);
}

export async function saveActionResult(ns: NS, actionType: string, amount: number): void {
  const pathResult = ns.sprintf(JOB_RESULT_PATH, ns.pid);
  const dataResult: ThrallActionResult = {
    type: actionType,
    pid: ns.pid,
    endTs: Date.now(),
    amt: amount,
  };

  ns.write(pathResult, JSON.stringify(dataResult, null, 2), "w");
}