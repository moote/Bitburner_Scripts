import HackUtility from '/scripts/dynamic/f42-hack-utility-class.js';
import { numberToBase62Str, getRandomNumberInRange } from "/scripts/utility/utility-functions.js";

const F42_THRALL_SCRIPTS = [
  "scripts/dynamic/v3/thrall/control.js",
  "scripts/dynamic/v3/thrall/weaken_.js",
  "scripts/dynamic/v3/thrall/grow_.js",
  "scripts/dynamic/v3/thrall/hack_.js",
];

/**
 * @param {NS} ns
 * 
 * Purchase servers up to limit, check purchased servers are at the latest RAM
 * target, and check servers are running optimum number of threads
 */
export async function main(ns) {
  // int hack payload object
  const hackUtil = new HackUtility(ns, true);

  // init local config settings
  let doPurchase = true;

  // Continuously try to purchase servers until we've reached the maximum
  // amount of servers; then check servers are at max RAM, upgrading where needed
  var doLoop = true;

  // tail
  ns.tail();

  switch (ns.args[0]) {
    case "help":
      renderError(ns, "");
      return;
    case "purchase":
      doPurchase = true;
      break;
    case "upgrade":
      doPurchase = false;
      break;
    default:
      renderError(ns, "You must supply one arg of: purchase | upgrade | help");
      return;
  }

  while (doLoop) {
    // update cfg
    hackUtil.cfg.checkConfig();

    if (hackUtil.cfg.hasConfig) {
      if (doPurchase) {
        doLoop = await purchaseServerLoop(hackUtil);
      }
      else {
        doLoop = await upgradeServersLoop(hackUtil);
      }
    }
    else {
      // wait before checking config again
      await ns.sleep(getRandomSleepTime(hackUtil));
    }
  }
}

async function purchaseServerLoop(hackUtil) {
  // count existing purchased servers
  let psList = hackUtil.ns.getPurchasedServers();

  hackUtil.ns.printf("Purchased server count: %d", psList.length);
  hackUtil.ns.printf("Purchased server RAM target: %d", hackUtil.cfg.psRamTargetGb);

  if (psList.length < hackUtil.ns.getPurchasedServerLimit()) {
    // try to buy server
    tryPurchaseServer(hackUtil);

    if (hackUtil.cfg.psDebugMode) {
      // set false for debug; exit after one iteration
      return false;
    }

    // wait for next iteration of loop
    await hackUtil.ns.sleep(getRandomSleepTime(hackUtil));
  }
  else {
    if (hackUtil.cfg.psDebugMode) {
      // set false for debug; exit after one iteration
      return false;
    }

    // server limit reached, wait a long time (1 hour) before running again
    await hackUtil.ns.sleep(1000 * 60 * 60);
  }

  return true;
}

function tryPurchaseServer(hackUtil) {
  hackUtil.ns.print("Attempt server purchase...");

  // get server cost
  let serverCost = hackUtil.ns.getPurchasedServerCost(hackUtil.cfg.psRamTargetGb);

  // Check if we have enough money to purchase a server
  if (hackUtil.ns.getServerMoneyAvailable("home") > serverCost) {
    // purchase
    let hostname = generateHostname(hackUtil);
    hostname = hackUtil.ns.purchaseServer(hostname, hackUtil.cfg.psRamTargetGb);

    // kill, update, and restart script
    // callRestartScript(hackUtil, hostname);
    // >> now controlled by thrall/infector.js

    // log
    hackUtil.ns.printf("Server purchased: %s", hostname);
  }
  else {
    // log
    hackUtil.ns.printf("Server not purchased insufficient funds (< %d)", serverCost);
  }
}

async function upgradeServersLoop(hackUtil) {
  // count existing purchased servers
  let psList = hackUtil.ns.getPurchasedServers();

  hackUtil.ns.printf("upgradeServersLoop >>>>>>>>>>>>>>>>>");
  hackUtil.ns.printf("Purchased server count: %d", psList.length);
  hackUtil.ns.printf("Purchased server RAM target: %d", hackUtil.cfg.psRamTargetGb);

  if (psList.length == 0) {
    return true;
  }

  // try to upgrade servers
  await updgradeServers(psList, hackUtil);

  if (hackUtil.cfg.psDebugMode) {
    // set false for debug; exit after one iteration
    return false;
  }
  else {
    // wait for next iteration of loop
    await hackUtil.ns.sleep(getRandomSleepTime(hackUtil));

    return true;
  }
}

async function updgradeServers(psList, hackUtil) {
  hackUtil.ns.print("Attempt server upgrades... START");

  // get full server cost
  let targetServerCost = hackUtil.ns.getPurchasedServerCost(hackUtil.cfg.psRamTargetGb);

  // loop server list and upgrade all servers we can afford
  for (const hostname of psList) {
    if (hackUtil.ns.serverExists(hostname)) {
      let serverObj = hackUtil.ns.getServer(hostname);

      hackUtil.ns.printf("Testing server: %s (%s)", hostname, hackUtil.ns.formatRam(serverObj.maxRam));

      if (serverObj.maxRam < hackUtil.cfg.psRamTargetGb || hackUtil.cfg.psDebugMode) {
        // get current server cost & diff to upgrade
        let currServerCost = hackUtil.ns.getPurchasedServerCost(serverObj.maxRam);
        let targetServerCostDiff = targetServerCost - currServerCost;

        if (hackUtil.ns.getServerMoneyAvailable("home") > targetServerCostDiff) {
          // do upgrade
          let isUpgraded = true;

          if (!hackUtil.cfg.psDebugMode) {
            hackUtil.ns.printf(">> Upgrading %s (%s)", serverObj.hostname, hackUtil.ns.formatRam(hackUtil.cfg.psRamTargetGb));
            isUpgraded = hackUtil.ns.upgradePurchasedServer(serverObj.hostname, hackUtil.cfg.psRamTargetGb);
          }

          if (isUpgraded) {
            let newHostname = generateHostname(hackUtil);

            // set new hostname
            if (hackUtil.ns.renamePurchasedServer(serverObj.hostname, newHostname)) {
              hackUtil.ns.printf(
                "Server upgraded and renamed: %s (%s) >> %s (%s)",
                serverObj.hostname,
                hackUtil.ns.formatRam(serverObj.maxRam),
                newHostname,
                hackUtil.ns.formatRam(hackUtil.cfg.psRamTargetGb)
              );

              // kill, update, and restart script
              // >> not needed for thrall as new RAM will be automatically used
            }
            else {
              hackUtil.ns.printf(
                "Server upgraded, !!rename failed!!: %s (%s) >> %s (%s)",
                serverObj.hostname,
                hackUtil.ns.formatRam(serverObj.maxRam),
                newHostname,
                hackUtil.ns.formatRam(hackUtil.cfg.psRamTargetGb)
              );
            }
          }
          else {
            hackUtil.ns.printf(
              "Server upgraded failed: %s (%s)",
              serverObj.hostname,
              hackUtil.ns.formatRam(serverObj.maxRam)
            );
          }
        }
      }
    }
    else {
      hackUtil.ns.printf("Server does not exist: (%s)", hostname);
    }

    // pause to prevent naming collisions
    await hackUtil.ns.sleep(100);
  }

  hackUtil.ns.print("Attempt server upgrades... END");
}

function generateHostname(hackUtil) {
  return hackUtil.ns.sprintf(
    "f42-%s-%s",
    hackUtil.ns.formatRam(hackUtil.cfg.psRamTargetGb, 0),
    numberToBase62Str(Date.now())
  );
}

/**
 * Thrall  file install / control now done by /thrall/infector.js
 * 
 * @deprecated
 */
async function callRestartScript(hackUtil, hostname) {
  // use the launcher to start the script
  // hackUtil.scriptLauncher.restartScript(hostname, 0, 1, F42_THRALL_SCRIPTS);
}

function getRandomSleepTime(hackUtil)
{
  return getRandomNumberInRange(hackUtil.cfg.psMinSleepMillis, hackUtil.cfg.psMaxSleepMillis);
}

/**
 * Error render function
 */
function renderError(ns, errorMsg = false) {
  ns.printf("\n--------------------------");
  ns.printf("Purchase / Upgrade Servers");
  ns.printf("--------------------------");
  ns.printf("Usage: run fab42-purchase-servers.js [purchase | upgrade | help?]");
  ns.printf("- purchase | upgrade | help (optional): purchase/upgrade the action to run; if this is 'help', display this usage info");
  ns.printf("--------------------------\n\n");

  if (errorMsg !== false) {
    ns.printf("!! %s !!", errorMsg);
  }
}
