import { saveActionResult } from "scripts/dynamic/v3/thrall/hack_.js";

/** @param {NS} ns */
export async function main(ns) {
  let amount = await ns.weaken(ns.args[0]);
  saveActionResult(ns, "weaken", amount);
}