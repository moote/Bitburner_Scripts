/**
 * Convert decimal number to base62 string
 * 
 * @param currVal The decimal number to convert
 * @returns Base62 string representation of the number
 */
export function numberToBase62Str(currVal: number): string {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  if (currVal === 0) {
    return 0;
  }

  let strArr = [];

  while (currVal > 0) {
    strArr = [charset[currVal % charset.length], ...strArr];
    currVal = Math.floor(currVal / charset.length);
  }

  return strArr.join("");
}

export function numberToBase42Str(currVal: number): string {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";

  if (currVal === 0) {
    return 0;
  }

  let strArr = [];

  while (currVal > 0) {
    strArr = [charset[currVal % charset.length], ...strArr];
    currVal = Math.floor(currVal / charset.length);
  }

  return strArr.join("");
}

export function randomBase62Str(): string {
  return numberToBase62Str(Math.floor(Math.random() * 10000000));
}

/**
 * @param modifier Optional modifier to multiply timestamp by to get variation: range 0.1 - 1
 * @returns Base62 string representation of the current Unix timestamp
 */
export function timestampAsBase62Str(modifier = 1): string {
  return numberToBase62Str((Date.now() * modifier));
}

/**
 * Get pseudo random number in inclusive range defined buy min & max
 * 
 * @param min Inclusive range minimum
 * @param max Inclusive range maximum
 * @returns The rnd number
 */
export function getRandomNumberInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @param ns Bitburner NS
 * @param prefix A string to prefix the icon with
 * @returns An activity indicator string
 */
export function getActivityVisStr(ns: NS, prefix = ""): string {
  return ns.sprintf("%s%s", prefix, ((Math.floor(Date.now() / 1000) % 2) == 0 ? "<>" : "><"));
}