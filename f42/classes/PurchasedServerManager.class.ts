import F42Base from '/f42/classes/F42Base.class';
import FeedbackRenderer from '/f42/classes/FeedbackRenderer';
import GeneralCfgMsgReader from '/f42/classes/Messaging/GeneralCfgMsgReader';
import { GeneralCfgMsgPSrv_Interface } from '/f42/classes/helpers/interfaces';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';

export enum PSrvOpMode {
  PURCHASE,
  UPGRADE
}

export default class PurchasedServerManager extends F42Base {
  #fbObj: FeedbackRenderer;
  #opMode: PSrvOpMode;
  #cfgReader: GeneralCfgMsgReader;
  #pServCfg!: GeneralCfgMsgPSrv_Interface;
  #hasCfg: boolean;
  #serverLimit!: number;
  #upgradedSrvNames: string[];
  #doLoop: boolean;

  constructor(feedback: FeedbackRenderer, opMode: PSrvOpMode) {
    super(feedback.logger);

    // only one instance can run at a time
    this.vaildateSingleton();

    this.#fbObj = feedback;
    this.#opMode = opMode;
    this.#cfgReader = new GeneralCfgMsgReader(this.ns);
    this.#hasCfg = false;
    this.#doLoop = true;
    this.#upgradedSrvNames = [];
    this.allowedLogFunctions = ["ALL"];
    this.#updateCfg();
  }

  get fbObj(): FeedbackRenderer {
    return this.#fbObj;
  }

  get hasCfg(): boolean {
    return this.#hasCfg;
  }

  async mainLoop(): Promise<void> {
    const lo = this.getLo("mainLoop");

    while (this.#doLoop) {
      // read cfg
      if (this.#updateCfg()) {
        if (this.#opMode === PSrvOpMode.PURCHASE) {
          this.#doLoop = await this.#purchaseServerLoop();
        }
        else {
          this.#doLoop = await this.#upgradeServersLoop();
        }
      }
      else {
        this.ns.clearLog();
        this.fbObj.printTitle();
        this.fbObj.printf("No config waiting...");

        // wait before checking config again
        await this.ns.sleep(5000);
      }
    }

    lo.gFErr("Loop terminated");
  }

  async #purchaseServerLoop(): Promise<boolean> {
    const lo = this.getLo("purchaseServerLoop");

    if (!this.#hasCfg) {
      lo.gFErr("No cfg, exiting.");
      return false;
    }

    // count existing purchased servers
    const psList = this.ns.getPurchasedServers();

    lo.gF("Purchased server count: %d", psList.length);
    lo.gF("Purchased server RAM target: %d", this.#pServCfg.ramTargetGb);

    if (psList.length < this.#serverLimit) {
      // try to buy server
      await this.#tryPurchaseServer();

      if (this.#pServCfg.debugMode) {
        // set false for debug; exit after one iteration
        return false;
      }

      // wait for next iteration of loop
      await this.ns.sleep(this.#pServCfg.purchaseLoopDelayMS);
      return true;
    }
    else {
      if (this.#pServCfg.debugMode) {
        // set false for debug; exit after one iteration
        return false;
      }

      // server limit reached, exit
      lo.gFHiLi("Server limit reached (%d), exiting", this.#serverLimit);
      return false;
    }

    return true;
  }

  async #tryPurchaseServer(): Promise<void> {
    const lo = this.getLo("tryPurchaseServer");

    // get server cost
    const serverCost = this.ns.getPurchasedServerCost(this.#pServCfg.ramTargetGb);

    // Check if we have enough money to purchase a server
    if (this.ns.getServerMoneyAvailable("home") > serverCost) {
      // purchase
      let hostname = this.#generateHostname();
      hostname = this.ns.purchaseServer(hostname, this.#pServCfg.ramTargetGb);

      // log
      lo.gFHiLi("Server purchased: %s", hostname);
    }
    else {
      // log
      lo.gF("Server not purchased insufficient funds (< %d)", serverCost);
    }
  }

  async #upgradeServersLoop(): Promise<boolean> {
    const lo = this.getLo("upgradeServersLoop");

    if (!this.#hasCfg) {
      lo.gFErr("No cfg, exiting.");
      return false;
    }

    // count existing purchased servers
    const psList = this.ns.getPurchasedServers();

    this.ns.clearLog();
    this.fbObj.printTitle();

    if (psList.length == 0) {
      lo.gFErr("No purchased servers, exiting");
      return false;
    }

    lo.gF("Purchased server count: %d", psList.length);
    lo.gF("Purchased server RAM target: %d", this.#pServCfg.ramTargetGb);
    lo.gF("Servers needing upgrade: %d", this.#pendingUpgrades);

    // try to upgrade servers
    if (this.#pendingUpgrades > 0) {
      this.#upgradedSrvNames = [];
      await this.#updgradeServers(psList);
    }
    else {
      this.fbObj.printSubTitle("Upgraded Servers:");
      this.fbObj.printf(">> %s", JSON.stringify(this.#upgradedSrvNames));
      this.fbObj.printLineSeparator();

      this.fbObj.print(
        "No pending upgrades... ",
        timestampAsBase62Str()
      );
    }

    // wait for next iteration of loop
    await this.ns.sleep(this.#pServCfg.upgradeLoopDelayMS);
    return true;
  }

  get #pendingUpgrades(): number {
    let pendingCnt = 0;

    for(const srvName of this.ns.getPurchasedServers()){
      const pSrv = this.ns.getServer(srvName);

      if(pSrv && pSrv.maxRam < this.#pServCfg.ramTargetGb){
        pendingCnt++;
      }
    }

    return pendingCnt;
  }

  async #updgradeServers(psList: string[]): Promise<void> {
    const lo = this.getLo("updgradeServers");

    // get full server cost
    const targetServerCost = this.ns.getPurchasedServerCost(this.#pServCfg.ramTargetGb);

    // loop server list and upgrade all servers we can afford
    for (const hostname of psList) {
      if (this.ns.serverExists(hostname)) {
        const serverObj = this.ns.getServer(hostname);

        lo.gF("Testing server: %s (%s)", hostname, this.ns.formatRam(serverObj.maxRam));

        if (serverObj.maxRam < this.#pServCfg.ramTargetGb || this.#pServCfg.debugMode) {
          // get current server cost & diff to upgrade
          const currServerCost = this.ns.getPurchasedServerCost(serverObj.maxRam);
          const targetServerCostDiff = targetServerCost - currServerCost;

          lo.g(
            "Can upgrade RAM: %s -> %s >> Checking cost...",
            this.ns.formatRam(serverObj.maxRam),
            this.ns.formatRam(this.#pServCfg.ramTargetGb)
          );

          if (this.ns.getServerMoneyAvailable("home") > targetServerCostDiff) {
            // do upgrade
            let isUpgraded = false;

            if (!this.#pServCfg.debugMode) {
              lo.gFHiLi(
                ">> Upgrading %s (%s)",
                serverObj.hostname,
                this.ns.formatRam(this.#pServCfg.ramTargetGb)
              );
              isUpgraded = this.ns.upgradePurchasedServer(serverObj.hostname, this.#pServCfg.ramTargetGb);
            }

            if (this.#pServCfg.debugMode) {
              this.fbObj.printHiLi(
                "DEBUG MODE: %s (%s) not upgraded",
                serverObj.hostname,
                this.ns.formatRam(this.#pServCfg.ramTargetGb)
              );
              this.#upgradedSrvNames.push(`DEBUG: ${serverObj.hostname}`);
            }
            else if (isUpgraded) {
              const newHostname = this.#generateHostname();

              // set new hostname
              if (this.ns.renamePurchasedServer(serverObj.hostname, newHostname)) {
                lo.gF(
                  "Server upgraded and renamed: %s (%s) >> %s (%s)",
                  serverObj.hostname,
                  this.ns.formatRam(serverObj.maxRam),
                  newHostname,
                  this.ns.formatRam(this.#pServCfg.ramTargetGb)
                );

                this.#upgradedSrvNames.push(newHostname);

                // kill, update, and restart script
                // >> not needed for thrall as new RAM will be automatically used
              }
              else {
                lo.gFErr(
                  "Server upgraded, !!rename failed!!: %s (%s) >> %s (%s)",
                  serverObj.hostname,
                  this.ns.formatRam(serverObj.maxRam),
                  newHostname,
                  this.ns.formatRam(this.#pServCfg.ramTargetGb)
                );
              }
            }
            else {
              lo.gFErr(
                "Server upgraded failed: %s (%s)",
                serverObj.hostname,
                this.ns.formatRam(serverObj.maxRam)
              );
            }
          }
          else {
            lo.gF(
              "Upgrade cancelled, not enough money: %s < %s",
              this.ns.formatNumber(this.ns.getServerMoneyAvailable("home")),
              this.ns.formatNumber(targetServerCostDiff)
            );
          }
        }
        else {
          lo.gF(
            "Upgrade cancelled, target RAM too low: %s >= %s",
            serverObj.maxRam,
            this.#pServCfg.ramTargetGb
          );
        }
      }
      else {
        lo.gFErr("Server does not exist: (%s)", hostname);
      }

      // pause to prevent naming collisions
      lo.g("Waiting...");
      await this.ns.sleep(this.#pServCfg.upgradeLoopDelayMS);
    }

    this.ns.print("Attempt server upgrades... END");
  }

  #updateCfg(): boolean {
    const lo = this.getLo("updateCfg");
    const cfgMsg = this.#cfgReader.peekMessage();

    this.#serverLimit = this.ns.getPurchasedServerLimit();

    if (cfgMsg === false) {
      this.fbObj.printErr("NO CFG???");
      this.#hasCfg = false;
      return false;
    }
    else {
      this.#hasCfg = true;
      this.#pServCfg = cfgMsg.purchasedServers;

      if (this.#pServCfg.serverLimit < this.#serverLimit) {
        this.#serverLimit = this.#pServCfg.serverLimit;
        lo.g(
          "Using cfg server lmiit (%d)",
          this.#pServCfg.serverLimit
        );
      }
      else {
        lo.g(
          "Using global server limit (%d), cfg limit is too high (%d)",
          this.#serverLimit,
          this.#pServCfg.serverLimit
        );
      }

      return true;
    }
  }

  #generateHostname(): string {
    return this.ns.sprintf(
      "f42-%s-%s",
      this.ns.formatRam(this.#pServCfg.ramTargetGb, 0),
      timestampAsBase62Str()
    );
  }
}