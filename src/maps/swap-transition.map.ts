import type { Input } from "../interfaces/swap-machine.ex.interface";
import {
  AssetTypeEnum,
  MapsNetworkEnum,
} from "../interfaces/swap-machine.in.interface";
import { IntentProcessorService } from "../services/intent-processor.service";
import parseDefuseAsset from "../utils/utils";

/**
 * Function prepares a transaction call data depends on inputs for different intents.
 *
 * @param {Intent} input - Swap parameters within tokenIn, tokenOut, assetIn, assetOut, initiator and rest.
 * @returns {MapCreateIntentResult} - Array with transaction call data.
 *
 * Additional Notes:
 * - Use Near chain ids - mainnet or testnet.
 * - Use EVM chain ids - "1" or other.
 * - Use TON chain ids - "1100" or other.
 * - Use Solana chain ids - mainnet or other.
 */
// biome-ignore lint/suspicious/noExplicitAny: <reason>
export const mapCreateIntentTransactionCall = (input: Input): any => {
  const from = input.assetIn ? parseDefuseAsset(input.assetIn) : null;
  const fromNetworkId =
    `${from?.blockchain}:${from?.network}` as MapsNetworkEnum;
  const to = input.assetOut ? parseDefuseAsset(input.assetOut) : null;
  const toNetworkId = `${to?.blockchain}:${to?.network}` as MapsNetworkEnum;

  switch (fromNetworkId) {
    case MapsNetworkEnum.NearMainnet:
      switch (toNetworkId) {
        case MapsNetworkEnum.NearMainnet:
          return IntentProcessorService.prepareTxSingleChain(input);
        case MapsNetworkEnum.EthBase:
          return IntentProcessorService.prepareTxCrossChain(input);
        case MapsNetworkEnum.BtcMainnet:
          return IntentProcessorService.prepareTxCrossChain(input);
        default:
          return null;
      }
    case MapsNetworkEnum.EthBase:
      return IntentProcessorService.prepareTxCrossChain(input);
    default:
      return null;
  }
};

export const mapAssetKey = (
  type: AssetTypeEnum,
  token: string,
): string | null => {
  switch (type) {
    case AssetTypeEnum.Nep141:
      return `near:mainnet:${token}`;
    default:
      return null;
  }
};
