import { saveActionResult } from "/f42/thrall/hack_";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const amount = await ns.grow(ns.args[0]);
  saveActionResult(ns, "grow", amount);
}