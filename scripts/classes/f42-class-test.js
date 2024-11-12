import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';
import F42LogTestClass from '/scripts/classes/f42-log-test-class.js';

/** @param {NS} ns */
export async function main(ns) {
  //ns, writeLog = false, toTerminal = true, doTail = false, tailTitle = false
  let logger = new F42Logger(ns, false, false, true, "tailTitle");

  let scriptTitle = "Logging/Feedback testing";
  let scriptDescription = "Testing the logging, feedback, and flag validation functionality";
  let scriptFlags = [
    // F42ClFlagDef.getReqStrAny("str-r", "String any required"),
    // F42ClFlagDef.getOptStrAny("str-o", "String any optional"),
    // F42ClFlagDef.getReqStrArrAny("str-arr-any-r", "String any arr req"),
    // F42ClFlagDef.getOptStrArrAny("str-arr-any-o", "String any arr opt"),
    // F42ClFlagDef.getReqBool("bool-r", "Boolean req"),
    // F42ClFlagDef.getOptBool("bool-o", "Boolean opt"),
    // F42ClFlagDef.getReqIntAny("int-any-r", "Int any req"),
    // F42ClFlagDef.getOptIntAny("int-any-o", "Int any opt", "6"),
    // F42ClFlagDef.getReqFloatAny("float-any-r", "Float any req"),
    // F42ClFlagDef.getOptFloatAny("float-any-o", "Float any opt", 0),
    // F42ClFlagDef.getReqIntArrAny("int-arr-any-r", "Int arr any req"),
    // F42ClFlagDef.getOptIntArrAny("int-arr-any-o", "Int arr any opt", "5"),
    // F42ClFlagDef.getReqFloatArrAny("float-arr-any-r", "Float arr any req"),
    // F42ClFlagDef.getOptFloatArrAny("float-arr-any-o", "Float arr any opt", "94"),
    // F42ClFlagDef.getReqIntRange("int-rng-r", "Int range req", 6, 88, "0"),
    // F42ClFlagDef.getOptIntRange("int-rng-o", "Int range opt", 1000, 2000, "1000"),
    // F42ClFlagDef.getReqFloatRange("float-rng-r", "Int range req", 1.2, 1.5, "0"),
    // F42ClFlagDef.getOptFloatRange("float-rng-o", "Int range opt", 1.2, 1.5, "0"),
    // F42ClFlagDef.getReqStrMatchOne("str-match-one-r", "String match one req", ["cat", "dog", "mouse"]),
    // F42ClFlagDef.getReqStrMatchOne("str-match-one-o", "String match one opt", ["cat", "dog", "mouse"]),
    // F42ClFlagDef.getReqStrMatchMulti("str-match-multi-r", "String match multi req", 1, 2, ["cat", "dog", "mouse"]),
    // F42ClFlagDef.getOptStrMatchMulti("str-match-multi-o", "String match multi opt", 1, 2, ["cat", "dog", "mouse"]),
    // F42ClFlagDef.getReqIntMatchOne("int-match-one-r", "Int match one req", [1, 3, 4, 6]),
    // F42ClFlagDef.getReqIntMatchOne("int-match-one-o", "Int match one opt", [1, 3, 4, 6]),
    // F42ClFlagDef.getReqIntMatchMulti("int-match-multi-r", "Int match multi req", 2, 4, [1, 3, 4, 6]),
    // F42ClFlagDef.getOptIntMatchMulti("int-match-multi-o", "Int match multi opt", 2, 4, [1, 3, 4, 6]),
    // F42ClFlagDef.getReqFloatMatchOne("float-match-one-r", "Float match one req", [1.5, 3.6, 4.2, 6.9]),
    // F42ClFlagDef.getReqFloatMatchOne("float-match-one-o", "Float match one opt", [1.5, 3.6, 4.2, 6.9]),
    // F42ClFlagDef.getReqFloatMatchMulti("float-match-multi-r", "Float match multi req", 2, 4, [1.5, 3.6, 4.2, 6.9]),
    // F42ClFlagDef.getOptFloatMatchMulti("float-match-multi-o", "Float match multi opt", 2, 4, [1.5, 3.6, 4.2, 6.9]),
  ];

  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  feedback.printTitle();
  feedback.printFlags();

  let testClass = new F42LogTestClass(ns, logger);
  testClass.logTest();
  feedback.printEnd();
}

