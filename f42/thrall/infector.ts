import F42Logger from "/f42/classes/f42-logger-class";
import F42ClFlagDef from "/f42/classes/f42-cl-flag-def-class";
import ThrallInfector, { VERSION } from "./classes/ThrallInfector.class"

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "Thrall Infector v" + VERSION;
  const logger = new F42Logger(ns, false, true, false, scriptTitle);
  const scriptDescription = "Thrall infection and execution";
  const scriptFlags = [
    F42ClFlagDef.getOptBool("p", "Propagate to uninfected / wrong versioned purchsed servers"),
    F42ClFlagDef.getOptBool("o66-act", "Activate order 66"),
    F42ClFlagDef.getOptBool("o66-deact", "Deactivate order 66"),
    F42ClFlagDef.getOptBool("o66-test", "Show current order 66 status"),
  ];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  feedback.printTitle(false);

  if (feedback.getFlag("p")) {
    feedback.printSubTitle("Propagating Payload:");
    ThrallInfector.propagateSelf(feedback);
  }
  else if (feedback.getFlag("o66-act")) {
    ThrallInfector.activateOrder66(ns);
    feedback.printSubTitle("ORDER 66 ACTIVATED");
  }
  else if (feedback.getFlag("o66-deact")) {
    ThrallInfector.deActivateOrder66(ns);
    feedback.printSubTitle("ORDER 66 DEACTIVATED");
  }
  else if (feedback.getFlag("o66-test")) {
    if (ThrallInfector.isOrder66Active(ns)) {
      feedback.printSubTitle("ORDER 66 IS ACTIVE");
    }
    else {
      feedback.printSubTitle("ORDER 66 NOT ACTIVE");
    }
  }
  else {
    // issue order66 to stop all processing
    ThrallInfector.activateOrder66(ns);

    // init new infector
    const tInfect = new ThrallInfector(feedback);

    // periodically check o66 status
    while (true) {
      tInfect.checkOrder66();
      await ns.sleep(1000);
    }
  }

  feedback.printEnd();
}

