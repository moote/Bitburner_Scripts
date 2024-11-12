/** @param {NS} ns */
export async function main(ns) {
  ns.exec("/scripts/purchased-servers/fab42-purchase-servers.js");
  ns.exec("/scripts/purchased-servers/fab42-update-servers.js");
}