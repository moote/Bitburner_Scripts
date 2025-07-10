import { saveActionResult } from "/f42/thrall/hack_";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const amount = await ns.weaken(ns.args[0] as string, { stock: ns.args[1] == 1 ? true : false });
  saveActionResult(ns, "weaken", amount);
}