import { saveActionResult } from "/f42/thrall/hack_";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const amount = await ns.grow(ns.args[0] as string, { stock: true });
  // ns.tprintf(">>>>>>>>>> GROW: %s", ns.formatNumber(amount));
  saveActionResult(ns, "grow", amount);
}