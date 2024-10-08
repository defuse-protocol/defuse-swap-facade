import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import { v4 as uuidv4 } from "uuid";
import type { ParseDefuseAssetResult } from "../interfaces/swap-machine.in.interface";

export async function sleep(timeout: number) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

export function sha256(msg: string) {
  return SHA256(msg).toString(Hex);
}

export function generateIntentId(): string {
  return sha256(uuidv4());
}

export default function parseDefuseAsset(
  defuseAssetId: string,
): ParseDefuseAssetResult {
  try {
    const [blockchain, network, contractId] = defuseAssetId.split(":");
    return {
      blockchain: blockchain as string,
      network: network as string,
      contractId: contractId as string,
    };
  } catch (e) {
    console.error("Failed to parse defuse asset id", e);
    return null;
  }
}
