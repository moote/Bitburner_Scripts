/**
 * convert number to base62 string
 */
export function numberToBase62Str(currVal) {
  let charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if (currVal === 0) {
    return 0;
  }

  let strArr = [];

  while (currVal > 0) {
    strArr = [charset[currVal % 62], ...strArr];
    currVal = Math.floor(currVal / 62);
  }

  return strArr.join("");
}

export function timestampAsBase62Str(modifier = 1){
  return numberToBase62Str((Date.now() * modifier));
}

export function getRandomNumberInRange(min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getActivityVisStr(ns, prefix = ""){
  return ns.sprintf("%s%s", prefix, ((Math.floor(Date.now() / 1000) % 2) == 0 ? "<>" : "><"));
}