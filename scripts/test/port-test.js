import F42PortHandler from "/scripts/classes/f42-port-handler-class.js"
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/** @param {NS} ns */
export async function main(ns) {
  let portHandler = new F42PortHandler(ns, true);
  let testHandle = portHandler.getPortHandle(75, true);

  while(true){
    ns.printf(">> Test Handle: \n\n%s", testHandle);
    await ns.sleep(1000);
  }
}

function portReadWriteTest(ns)
{
  let portHandler = new F42PortHandler(ns);

  let f42Ph = portHandler.getPortHandle(101, true);

  f42Ph.clear();

  for(let i = 0; i < 30; i++){
    f42Ph.write({index: i, dummy_data: timestampAsBase62Str()});
  }

  ns.tprintf("%s", f42Ph);

  for(let i = 0; i < 30; i++){
    f42Ph.write({index: i, dummy_data: timestampAsBase62Str()});
  }

  ns.tprintf("%s", f42Ph);

  for(let i = 0; i < 15; i++){
    f42Ph.read();
  }

  ns.tprintf("%s", f42Ph);

  f42Ph.clear();
}

/**
 * See how many ports there are...
 * 
 * Lots apparently :)
 */
function countPorts(ns)
{
  // see how many ports there are...
  const portIndexMax = 2048;

  for(let i = 1; i <= portIndexMax; i++){
    let portHandle = ns.getPortHandle(i);

    if(portHandle){
      ns.tprintf("Port found: %d", i);
    }
  }
}
