import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
  for(const fPath of ns.ls("home", "f42/")){
    ns.tprintf(fPath);
  }
}