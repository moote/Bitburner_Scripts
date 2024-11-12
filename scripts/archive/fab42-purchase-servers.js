import HackPayload from '/scripts/dynamic/f42-hack-payload-class.js';
import { numberToBase62Str } from "/scripts/utility/utility-functions.js";

/**
 * @param {NS} ns
 * 
 * Purchase servers to limit at the RAM
 * target specified in /cfg/purchased-servers.txt
 */
export async function main(ns) {
  // int hack payload object
  const hackPayloadObj = new HackPayload(ns, true);

  // init local config settings
  let ramTargetGb = 0;
  let debugMode = false;

  // Continuously try to purchase servers until we've reached the maximum
  // amount of servers; then check servers are at max RAM, upgrading where needed
  var doLoop = true;

  // tail
  ns.tail();

  while (doLoop) {
    // count existing purchased servers
    let purchasedServers = ns.getPurchasedServers();
    let pSrvCnt = purchasedServers.length;

    ns.printf("Purchased server count: %d", pSrvCnt);
    ns.printf("Purchased server RAM target: %d", ramTargetGb);

    if (pSrvCnt < ns.getPurchasedServerLimit()) {
      // try to buy server
      tryPurchaseServer(ns, ramTargetGb);

      // wait 4 secs for next iteration of loop
      await ns.sleep(4000);
    }
    else{
      // server limit reached, wait a long time (1 hour) before running again
      await ns.sleep(1000 * 60 * 60);
    }
    
    if (F42_DEBUG) {
      // set false for debug; exit after one iteration
      doLoop = false;
    }
  }
}

function tryPurchaseServer(ns, ramTargetGb) {
  ns.print("Attempt server purchase...");

  // get server cost
  let serverCost = ns.getPurchasedServerCost(ramTargetGb);

  // Check if we have enough money to purchase a server
  if (ns.getServerMoneyAvailable("home") > serverCost) {
    // purchase
    let hostname = generateHostname(ns, ramTargetGb);
    hostname = ns.purchaseServer(hostname, ramTargetGb);

    // kill, update, and restart script
    callRestartScript(ns, hostname);

    // log
    ns.printf("Server purchased: %s", hostname);
  }
  else {
    // log
    ns.printf("Server not purchased insufficient funds (< %d)", serverCost);
  }
}

function generateHostname(ns, ramTargetGb) {
  return ns.sprintf("f42-%s-%s", ns.formatRam(ramTargetGb, 0), Date.now().toBase62Str());
}

async function callRestartScript(ns, hostname) {
  ns.exec("/scripts/fab42-restart-server-script.js", "home", 1, hostname, hackScriptPath);
}
