import Logger from "/f42/classes/Logger.class";
import ThrallInfector, { VERSION } from "/f42/thrall/classes/ThrallInfector.class";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Thrall Infector v" + VERSION;
  const scriptDescription = "Thrall infection and execution";
  const logger = new Logger(ns, false, true, false, scriptTitle);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addBooleanFlag("p", "Propagate to uninfected / wrong versioned purchsed servers");
  flags.addBooleanFlag("o66-act", "Activate order 66");
  flags.addBooleanFlag("o66-deact", "Deactivate order 66");
  flags.addBooleanFlag("o66-test", "Show current order 66 status");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  feedback.printTitle(false);

  if (flags.isflagSet("p")) {
    feedback.printSubTitle("Propagating Payload:");
    ThrallInfector.propagateSelf(feedback);
  }
  else if (flags.isflagSet("o66-act")) {
    ThrallInfector.activateOrder66(ns);
    feedback.printSubTitle("ORDER 66 ACTIVATED");
  }
  else if (flags.isflagSet("o66-deact")) {
    ThrallInfector.deActivateOrder66(ns);
    feedback.printSubTitle("ORDER 66 DEACTIVATED");
  }
  else if (flags.isflagSet("o66-test")) {
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

