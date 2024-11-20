import { ThrallActionResult } from "./classes/interfaces";

export const RESULT_FLAG = "-THRALL-result";
export const JOB_RESULT_PATH = "f42/thrall/tmp/%d" + RESULT_FLAG + ".txt";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const amount = await ns.hack(JSON.stringify(ns.args[0]));
  saveActionResult(ns, "hack", amount);
}

export function saveActionResult(ns: NS, actionType: string, amount: number): void {
  const pathResult = ns.sprintf(JOB_RESULT_PATH, ns.pid);
  const dataResult: ThrallActionResult = {
    type: actionType,
    pid: ns.pid,
    endTs: Date.now(),
    amt: amount,
  };

  ns.write(pathResult, JSON.stringify(dataResult, null, 2), "w");
}