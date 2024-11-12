/**
 * @param {NS} ns
 * @version 1.0
 * 
 * Show the route to conncet to specified server
 */
export async function main(ns) {
  ns.tprintf("\n--------------------------");
  ns.tprintf("Route to Server");

  let targetHostname = "";
  let pathArr = [];

  if (ns.args.length == 1) {
    if (ns.args[0] == "help") {
      renderError(ns, "");
      return;
    }

    targetHostname = ns.args[0];
  }
  else {
    renderError(ns, "You must enter a hostname");
    return;
  }

  // recursively scan all servers
  if(scanAdjServers(ns, targetHostname, "home", -1, pathArr)){
    ns.tprintf("Server found:");
  }
  else{
    ns.tprintf("Server not found:");
  }

  // render the path
  ns.tprintf("\n\n%s\n\n", pathArr.join(" >> "));
  ns.tprintf("END");
}

function scanAdjServers(ns, targetHostname, currHostname, currDepth, pathArr) {
  // inc depth
  currDepth++;

  // add to path
  pathArr.push(currHostname);

  // init index for loop, start at 1 as 0 is previous host in chain
  let i = 1;

  if (currHostname == "home") {
    // for home there is no previous host, so start at 0
    i = 0;
  }
  else if (currHostname == targetHostname) {
    // host found return up chain
    return true;
  }

  // get adjacent servers
  let adjServers = ns.scan(currHostname);

  if (currHostname = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      // scan recursively
      if (scanAdjServers(ns, targetHostname, adjServers[i], currDepth, pathArr) === true) {
        // host found return up chain
        return true;
      }
    }
  }

  // if we got here path not found; remove 
  // this host from path and return false
  pathArr.pop();
  return false;
}

function renderError(ns, errorMsg) {
  ns.tprintf("Usage: run fab42-route-to-srv.js [hostname / help]");
  ns.tprintf("- hostname / help: the host to sniff the route to; if this is 'help' display this info");

  if (errorMsg != "") {
    ns.tprintf("!! %s !!", errorMsg);
  }
}