import F42HackManager from '/scripts/classes/f42-hack-manager-class.js';

/** @param {NS} ns */
export async function main(ns) {
  const data = ns.flags([
    ['target', ""], // a default number means this flag is a number
    ['help', false], // a default boolean means this flag is a boolean
  ]);
  // ns.tprint(data);

  if (data.help) {
    renderError(ns, false);
    return false;
  }
  else if(data.target === ""){
     renderError(ns, "You must supply a target");
    return false;
  }

  F42HackManager.removeTargetServer(ns, data.target);
}

/**
 * Error render function
 */
function renderError(ns, errorMsg = false) {

  ns.tprintf("\n\Remove target server:");
  ns.tprintf("Usage: run /scripts/dynamic/v2/rm-target-server.js --target [target] --help");
  ns.tprintf("--target: the target server");
  ns.tprintf("--help (optional): display this help text");
  ns.tprintf("--------------------------\n\n");

  if (errorMsg !== false) {
    ns.tprintf("!! %s !!", errorMsg);
  }
}