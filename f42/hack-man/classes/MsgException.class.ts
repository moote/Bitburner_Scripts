export class ReceivedMessageException extends Error{
  constructor(errMsg: string){
    super(errMsg);
  }
}

/**
 * Throw when message is matched target, but has an invalid action type
 */
export class MsgErrorInvalidActionType extends ReceivedMessageException{
  constructor(errMsg: string){
    super(errMsg);
  }
}

/**
 * Throw when message is matched to job, but no matching
 * message in job
 */
export class MsgErrorInvalidJob extends ReceivedMessageException{
  constructor(errMsg: string){
    super(errMsg);
  }
}

/**
 * Throw when message is matched to job, but no matching
 * message in job
 */
export class MsgErrorInvalidMsg extends ReceivedMessageException{
  constructor(errMsg: string){
    super(errMsg);
  }
}

/**
 * Throw when message is matched to job and message,
 * but the status is wrong
 */
export class MsgErrorBadStatus extends ReceivedMessageException{
  constructor(errMsg: string){
    super(errMsg);
  }
}

/**
 * Throw when message is matched to job and message,
 * but the status is wrong
 */
export class MsgErrorDuplicate extends ReceivedMessageException{
  constructor(errMsg: string){
    super(errMsg);
  }
}
