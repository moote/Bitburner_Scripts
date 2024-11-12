import { saveActionResult } from "/f42/thrall/hack_";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const amount = await ns.weaken(ns.args[0]);
  saveActionResult(ns, "weaken", amount);
}