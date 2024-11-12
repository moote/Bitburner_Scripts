/**
 * Class that handles starting / restarting a script on a server
 */
export default class ScriptLauncher {
  #hackConfig;
  #ns;
  #writeLog = true;
  #targetServerObj;
  #doRestart = false;
  #ramHeadroom = 0;
  #threadCount = 1;
  #scriptPath = [];
  #scriptExeRam = 0;
  #matchingActiveScriptPids = [];

  /**
   * @param {HackConfig} hackConfig - HackConfig instance from parent HackUtil
   */
  constructor(hackConfig) {
    this.#hackConfig = hackConfig;
    this.#ns = hackConfig.ns;
    this.#log("Init class: ScriptLauncher");
  }

  scriptPathStr(scriptPath = false) {
    let scriptPathStr = this.#scriptPath;

    if (scriptPath !== false) {
      scriptPathStr = scriptPath;
    }

    return this.#ns.sprintf("[%s]", scriptPathStr.join(', '));
  }

  #doRestartStr() {
    return this.#doRestart ? "Restart" : "Run";
  }

  /**
   * Run the requested/target script in available RAM, do not kill any other processes
   * 
   * @param {String} targetHostname - Hostname of the server to start/restart script on
   * @param {boolean} doRestart - Kill all other processes running matching script name (arguments ignored)
   * @param {boolean} ramHeadroom - 
   * @param {number} reqThreadCount - The number of threads to run (default is 0, max threads will be run)
   * @param {array|boolean} scriptPath - Array of strings for scripts, first in array should be main entry script; if empty then use hack config script
   * @return {boolean} True script run
   */
  runScript(targetHostname, ramHeadroom = 0, reqThreadCount = 0, scriptPath) {
    // validation
    return this.#validateAndExecute(targetHostname, false, ramHeadroom, reqThreadCount, scriptPath);
  }

  /**
   * Run the requested/target script in available RAM after killing any other
   * processes with matching filenames (arguments are ignored)
   * 
   * @param {String} targetHostname - Hostname of the server to start/restart script on
   * @param {boolean} doRestart - Kill all other processes running matching script name (arguments ignored)
   * @param {boolean} ramHeadroom - 
   * @param {number} reqThreadCount - The number of threads to run (default is 0, max threads will be run)
   * @param {array} scriptPath - Array of strings for scripts, first in array should be main entry script; if empty then use hack config script
   * @return {boolean} True script restarted
   */
  restartScript(targetHostname, ramHeadroom = 0, reqThreadCount = 0, scriptPath) {
    // validation and execution
    return this.#validateAndExecute(targetHostname, true, ramHeadroom, reqThreadCount, scriptPath);
  }

  /**
   * Perform validation for the requested script run/restart
   * 
   * @param {String} targetHostname - Hostname of the server to start/restart script on
   * @param {boolean} doRestart - If true kill all other processes running matching script name (arguments ignored)
   * @param {boolean} ramHeadroom - The amount of RAM to subtract from available RAM (leave space for other processes)
   * @param {number} reqThreadCount - The number of threads to run (default is 0, max threads will be run)
   * @param {array} scriptPath - Array of strings for scripts, first in array should be main entry script; if empty then use hack config script
   * @return {boolean} True if validation passed and script executed
   */
  #validateAndExecute(targetHostname, doRestart, ramHeadroom, reqThreadCount, scriptPath) {
    if (this.#validateTarget(targetHostname) && this.#validateScriptPath(scriptPath)) {
      this.#doRestart = doRestart;

      if (this.#validateRam(reqThreadCount, ramHeadroom)) {
        // all validation passed, execute
        return this.#doExecScript();
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }
  }

  /**
   * Check target exists, and is compromised
   * 
   * @return {boolean} True if host exists and is compromised
   */
  #validateTarget(targetHostname) {
    if (this.#ns.serverExists(targetHostname)) {
      this.#log(this.#ns.sprintf("Target host (%s) exists", targetHostname));

      // get the server object for target
      this.#targetServerObj = this.#ns.getServer(targetHostname);

      // check it's compromised
      if (this.#targetServerObj.hasAdminRights) {
        this.#log(this.#ns.sprintf("Target host (%s) is compromised", targetHostname));
        return true;
      }
      else {
        this.#log(this.#ns.sprintf("!! Target host (%s) is not compromised", targetHostname));
        return true;
      }
    }
    else {
      this.#log(this.#ns.sprintf("Target host does not exist: %s", targetHostname));
      return false;
    }
  }

  /**
   * If script path defined in constructor, check it exists; otherwise
   * load from hack payload class
   * 
   * @return {boolean} True if valid file
   */
  #validateScriptPath(scriptPath) {
    if (!scriptPath) {
      scriptPath = [];
    }

    // start tail
    if (this.#writeLog) {
      let scriptPathStr = (scriptPath.length == 0 ? "hack-payload" : this.scriptPathStr(scriptPath));
      this.#ns.setTitle(sprintf("%s %s on %s:", this.#doRestartStr(), scriptPathStr, this.#targetServerObj.hostname));
      this.#ns.tail();
    }

    let validateResult = false;

    if (scriptPath.length > 0) {
      validateResult = this.#validateRequestedScriptPath(scriptPath);
    }
    else {
      validateResult = this.#validateHackConfigScriptPath();
    }

    if (validateResult) {
      return true;
    }
    else {
      // reset local vars
      this.#scriptPath = [];
      this.#scriptExeRam = 0;

      return false;
    }
  }

  #validateRequestedScriptPath(scriptPath) {
    // make sure all files exist on home
    for (let aPath of scriptPath) {
      if (!this.#ns.fileExists(aPath)) {
        this.#log(this.#ns.sprintf("!! Requested script non-existant on home: %s", aPath));
        return false;
      }
    }

    // copy to local
    this.#scriptPath = scriptPath;
    this.#scriptExeRam = this.#ns.getScriptRam(this.#scriptPath[0]);

    this.#log(
      this.#ns.sprintf(
        "Using requested script: %s RAM: %s",
        this.#scriptPath,
        this.#ns.formatRam(this.#scriptExeRam)
      )
    );

    return true;
  }

  #validateHackConfigScriptPath() {
    this.#log("No requested script, trying HackPayload...");
    if (this.#hackConfig.hasConfig) {
      // copy to local vars
      this.#scriptPath = this.#hackConfig.hackScriptPath;
      this.#scriptExeRam = this.#hackConfig.hackScriptExeRam;

      this.#log(
        this.#ns.sprintf(
          "Using HackPayload::hackScriptPath: %s RAM: %s",
          this.scriptPathStr(),
          this.#ns.formatRam(this.#scriptExeRam)
        )
      );

      return true;
    }
    else {
      this.#log(
        this.#ns.sprintf(
          "!! HackPayload has no config: %s",
          this.#hackConfig.statusVerbose
        )
      );

      return false;
    }
  }

  /**
   * Copy files if not home; test if files exist, and rm
   * first if they do
   */
  #copyFiles() {
    // if target not home, copy latest version from home
    if (this.#targetServerObj.hostname != "home") {
      if (this.#doRestart) {
        for (let aPath of this.#scriptPath) {
          if (this.#ns.fileExists(aPath, this.#targetServerObj.hostname)) {
            this.#ns.rm(aPath, this.#targetServerObj.hostname);
          }
        }
      }

      let fileCopied = this.#ns.scp(
        this.#scriptPath,
        this.#targetServerObj.hostname
      );

      if (!fileCopied) {
        this.#log(
          this.#ns.sprintf(
            "!! File(s) not copied: home::%s >>> %s",
            this.scriptPathStr(),
            this.#targetServerObj.hostname
          )
        );

        return false;
      }
      else {
        this.#log(
          this.#ns.sprintf(
            "File(s) copied: home::%s >>> %s",
            this.scriptPathStr(),
            this.#targetServerObj.hostname
          )
        );

        return true;
      }
    }
    else {
      return true;
    }
  }

  /**
   * Test available RAM to see if requested number of threads can be run.
   * If restart requested, available RAM accounts for current matching processes
   * 
   * @return {boolean} True if enough RAM to run / restart
   */
  #validateRam(reqThreadCount, ramHeadroom) {
    if (ramHeadroom < 0) {
      this.#log("!! RAM headroom must be a number >= 0");
      return false;
    }

    // save ram headroom
    this.#ramHeadroom = ramHeadroom;

    // calc available ram
    let serverAvailRAM = this.#targetServerObj.maxRam - this.#targetServerObj.ramUsed;

    // add ram that would be freed by killing matching processes
    let runningRam = this.#calcRunningRam();

    this.#log(
      this.#ns.sprintf(
        "Matching processes using %s RAM",
        this.#ns.formatRam(runningRam)
      )
    );

    if (this.#doRestart) {
      serverAvailRAM += runningRam;
    }

    // leave space for other programs
    serverAvailRAM -= this.#ramHeadroom;

    this.#log(
      this.#ns.sprintf(
        "Max RAM: %s",
        this.#ns.formatRam(this.#targetServerObj.maxRam)
      )
    );

    this.#log(
      this.#ns.sprintf(
        "Used RAM: %s",
        this.#ns.formatRam(this.#targetServerObj.ramUsed)
      )
    );

    this.#log(
      this.#ns.sprintf(
        "Running RAM: %s",
        this.#ns.formatRam(runningRam)
      )
    );

    this.#log(
      this.#ns.sprintf(
        "Total available RAM: %s",
        this.#ns.formatRam(serverAvailRAM)
      )
    );

    // calc threads
    let maxFileExeThreads = Math.trunc(serverAvailRAM / this.#scriptExeRam);

    if (maxFileExeThreads <= 0) {
      this.#log(
        this.#ns.sprintf(
          "!! Not enough available RAM (%s) to run any threads (%s per thread)",
          this.#ns.formatRam(serverAvailRAM),
          this.#ns.formatRam(this.#scriptExeRam)
        )
      );

      return false;
    }
    else if (maxFileExeThreads < reqThreadCount) {
      this.#log(
        this.#ns.sprintf(
          "!! Not enough available RAM (%s) to run %d threads (%s per thread): max %d threads",
          this.#ns.formatRam(serverAvailRAM),
          reqThreadCount,
          this.#ns.formatRam(this.#scriptExeRam),
          maxFileExeThreads
        )
      );

      return false;
    }

    // set thread count
    this.#threadCount = (reqThreadCount == 0 ? maxFileExeThreads : reqThreadCount);

    // return success
    return true;
  }

  /**
   * Calculates the total static ram usage of matching processes; also records their
   * pids for later kill if needed
   */
  #calcRunningRam() {
    // init running script ram
    let runningRam = 0;

    // clear the pid list 
    this.#matchingActiveScriptPids.length = 0;

    // get process list
    //  [{"filename":"scripts/fab42-simple-hack.js","threads":853,"args":[],"pid":31,"temporary":false}]
    let processList = this.#ns.ps(this.#targetServerObj.hostname);

    // look for all matching processes and get static RAM usage
    for (const processObj of processList) {
      if (processObj.filename == this.#scriptPath[0]) {
        // // get script info and calc total static ram for all threads
        let runningScriptObj = this.#ns.getRunningScript(processObj.pid, this.#targetServerObj.hostname);
        runningRam += (runningScriptObj.ramUsage * runningScriptObj.threads);

        // runningRam += (this.#hackConfig.hackScriptExeRam * processObj.threads);

        // save pid of matching process
        this.#matchingActiveScriptPids.push(processObj.pid);
      }
    }

    return runningRam;
  }

  /**
   * Run the file
   */
  #doExecScript() {
    if (this.#doRestart) {
      // kill matching processes if restart requested
      this.#killMatchingProcesses();
    }

    // copy files
    this.#copyFiles();

    // run the script
    this.#ns.exec(this.#scriptPath[0], this.#targetServerObj.hostname, this.#threadCount);
  }

  /**
   * Kill all processes on target host that have matching filename; arguments are ignored
   */
  #killMatchingProcesses() {
    // kill all matching pids
    for (const pid of this.#matchingActiveScriptPids) {
      this.#log(
        this.#ns.sprintf(
          "Killing PID:%d on %s",
          pid,
          this.#targetServerObj.hostname
        )
      );

      this.#ns.kill(pid);
    }
  }

  #log(msg) {
    if (this.#writeLog) {
      this.#ns.print(msg);
    }
  }
}