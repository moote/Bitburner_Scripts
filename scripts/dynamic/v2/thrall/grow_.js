import { saveActionResult } from "scripts/dynamic/v2/thrall/hack_.js";

/** @param {NS} ns */
export async function main(ns) {
  let amount = await ns.grow(ns.args[0]);
  saveActionResult(ns, "grow", amount);
}