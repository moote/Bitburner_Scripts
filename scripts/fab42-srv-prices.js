/** @param {NS} ns */
export async function main(ns) {
  ns.tprintf(">> Purchase server limit: %d", ns.getPurchasedServerLimit());
  let i = 4;
  while(i <= 524288){
    ns.tprintf(">> %s (%d) server: %s", ns.formatRam(i), i, ns.formatNumber(ns.getPurchasedServerCost(i), 2));
    // await ns.sleep(100);
    i = i * 2;
  }
}