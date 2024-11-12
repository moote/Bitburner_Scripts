export interface ThrallJob {
    msgId: number,
    target: string,
    actionType: string,
    threads: number,
    msgAcceptedTs: number,
    isAccepted: false,
    result: {
        actionedBy: "",
        startTs: number,
        startAmt: number,
        pid: number,
    }
}

export interface ThrallJobAction {
    path: string,
    ram: number,
    startAmt: number,
}

export interface ThrallActionResult {
    type: string,
    pid: number,
    endTs: number,
    amt: number,
}