import F42Base from '/scripts/classes/f42-base-class.js';

export default class F42LogTestClass extends F42Base {
  constructor(ns, logger) {
    super(ns, logger);
  }

  logTest() {
    let fnN = "logTest";
    this.log(fnN, "");

    // try feedback from class
    // this.feedback(">> %s test feedback from a class: %s %d", fnN, "testing", 999);

    // should throw error:
    // this.logger.doFeedback("xxx", " test illegal feedback from class: %s %d", "testing", 42);

    let loopCnt = 10;

    while (loopCnt > 0) {
      this.log(fnN, "Looping: %d", loopCnt);
      loopCnt--;
    }

    this.log(fnN, "End Test: as test number: %d", 999);
  }
}