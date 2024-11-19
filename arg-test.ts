import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
  const flags = ns.flags([
    ["s", "a_string"],
    ["n", 0],
    ["b", false],
    ["a", []],
  ]);

  // for(const flag of flags){
  //   if(typeof flags[flag] === "string"){

  //   }
  //   else if(typeof flags[flag] === "number"){

  //   }
  // }

  ns.tprintf("\n\nFlags:\n%s", JSON.stringify(flags, null, 2));
  ns.tprint("typeof s: ", typeof flags.s, " >> ", flags.s);
  ns.tprint("typeof n: ", typeof flags.n, " >> ", flags.n);
  ns.tprint("typeof b: ", typeof flags.b, " >> ", flags.b);

  const numTest = flags.n;
  const strNumTest = numTest.toString();

  if(numTest === null){
    ns.tprint("n not a valid number");
  }
  else if(strNumTest.indexOf('.') >= 0){
    ns.tprint("n is float >> '.' at: ", strNumTest.indexOf('.'));
  }
  else{
    ns.tprint("n is int >> . at: ", strNumTest.indexOf('.'));
  }
}