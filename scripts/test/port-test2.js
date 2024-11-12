import F42PortHandler from "/scripts/classes/f42-port-handler-class.js"
import { timestampAsBase62Str, getRandomNumberInRange } from "/scripts/utility/utility-functions.js";

/** @param {NS} ns */
export async function main(ns) {
  let portHandler = new F42PortHandler(ns, true);
  let testHandle = portHandler.getPortHandle(75, true);

  ns.printf(">> Test Handle: \n\n%s", testHandle);

  while(true){

    let diff = testHandle.maxLength - testHandle.length;
    let elementCount = 0;
    let addElements = true;

    if(testHandle.length < (testHandle.maxLength / 2)){ // add elements
      elementCount = getRandomNumberInRange(1, diff);
    }
    else{ //remove elements
      elementCount = getRandomNumberInRange(1, testHandle.length);
      addElements = false;
    }

    ns.printf("%s %d elements", (addElements ? "Add" : "Remove"), elementCount);

    for(let i = 0; i < elementCount; i++){
      if(addElements){
        testHandle.write({dummyData: timestampAsBase62Str()});
      }
      else{
        testHandle.read();
      }
    }

    ns.printf("%s", testHandle);

    await ns.sleep(getRandomNumberInRange(500, 1500));
  }
}