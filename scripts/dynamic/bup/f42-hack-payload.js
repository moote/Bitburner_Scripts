/** f42-infect-run.js auto bup: Mon Nov 11 2024 14:52:29 GMT-0800 (Pacific Standard Time) */

import HackConfig from '/scripts/dynamic/f42-hack-cfg-class.js';
import { F42_PAYLOAD_VER, F42_PAYLOAD_FILES, F42_PAYLOAD_FINGERPRINT_PATH, isFingerprintMatch } from "/scripts/utility/payload-fingerprint.js";

/**
 * @param {NS} ns
 * 
 * Assumes target server already compromised using:
 * fab42-srv-compromise.js
 */
export async function main(ns) {
  // int hack payload object
  const hackConfig = new HackConfig(ns, false);

  // test to see if need to save new fingerprint
  if (!isFingerprintMatch(ns)) {
    let thisScript = ns.getRunningScript();
    let scriptFingerprint = {
      host: ns.getHostname(),
      pid: parseInt(thisScript.pid),
      totalRam: (thisScript.ramUsage * thisScript.threads),
      ver: F42_PAYLOAD_VER,
      threads: thisScript.threads,
      payload: F42_PAYLOAD_FILES
    };

    ns.write(
      F42_PAYLOAD_FINGERPRINT_PATH,
      JSON.stringify(scriptFingerprint, null, 2),
      "w"
    );
  }

  // check for 'force' arg
  if (ns.args.length == 1) {
    switch (ns.args[0]) {
      case "weaken":
        await runForceWeaken(hackConfig);
        break;
      case "grow":
        await runForceGrow(hackConfig);
        break;
      case "hack":
        await runForceHack(hackConfig);
        break;
      default:
        renderError(ns, "!! Force argument can only be: weaken | grow | hack !!" + " >> " + ns.args[0]);
        return;
    }
  } else if (ns.args.length > 1) {
    renderError(ns, "!! Too many arguments !!");
    return;
  }
  else {
    await runBasicOptimised(hackConfig);
  }
}

async function runBasicOptimised(hackConfig) {
  while (true) {
    // check for update
    hackConfig.checkConfig();

    if (hackConfig.hasConfig) {
      if (hackConfig.ns.getServerSecurityLevel(hackConfig.target) > hackConfig.securityMaxLimit) {
        // If the server's security level is above our threshold, weaken it
        await hackConfig.ns.weaken(hackConfig.target);
      } else if (hackConfig.ns.getServerMoneyAvailable(hackConfig.target) < hackConfig.moneyMinLimit) {
        // If the server's money is less than our threshold, grow it
        await hackConfig.ns.grow(hackConfig.target);
      } else {
        // Otherwise, hack it
        await hackConfig.ns.hack(hackConfig.target);
      }
    }
    else {
      await hackConfig.ns.sleep(hackConfig.generalSleepTime);
    }
  }
}

async function runForceWeaken(hackConfig) {
  while (true) {
    // check for update
    hackConfig.checkConfig();

    if (hackConfig.hasConfig) {
      if (hackConfig.ns.getServerSecurityLevel(hackConfig.target) > hackConfig.securityMaxLimit) {
        // If the server's security level is above our threshold, weaken it
        await hackConfig.ns.weaken(hackConfig.target);
      } else {
        // Otherwise, wait
        await hackConfig.ns.sleep(3000);
      }
    }
    else {
      await hackConfig.ns.sleep(3000);
    }
  }
}

async function runForceGrow(hackConfig) {
  while (true) {
    // check for update
    hackConfig.checkConfig();

    if (hackConfig.hasConfig) {
      if (hackConfig.ns.getServerMoneyAvailable(hackConfig.target) < hackConfig.moneyMinLimit) {
        // If the server's money is less than our threshold, grow it
        await hackConfig.ns.grow(hackConfig.target);
      } else {
        // Otherwise, wait
        await hackConfig.ns.sleep(hackConfig.generalSleepTime);
      }
    }
    else {
      await hackConfig.ns.sleep(hackConfig.generalSleepTime);
    }
  }
}

async function runForceHack(hackConfig) {
  while (true) {
    // check for update
    hackConfig.checkConfig();

    if (hackConfig.hasConfig) {
      if (hackConfig.ns.getServerMoneyAvailable(hackConfig.target) >= hackConfig.moneyMinLimit) {
        // If the server's money is gt/eq our threshold, hack it
        await hackConfig.ns.hack(hackConfig.target);
      } else {
        // Otherwise, wait
        await hackConfig.ns.sleep(hackConfig.generalSleepTime);
      }
    }
    else {
      await hackConfig.ns.sleep(hackConfig.generalSleepTime);
    }
  }
}

function renderError(ns, errorMsg) {
  ns.tprintf("Usage: run /dynamic/f42-hack-payload.js [force?]");
  ns.tprintf("- force (optional): only run one operation, must be one of following: weaken | grow | hack");
  ns.tprintf(errorMsg);
}
