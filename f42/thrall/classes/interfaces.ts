export interface ThrallJob {
    msgId: number,
    target: string,
    actionType: string,
    threads: number,
    result: {
        pid: number;
        actionedBy: string;
        startTs: number;
        endTs: number;
        startAmt: number;
        endAmt: number;
        amt: number;
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