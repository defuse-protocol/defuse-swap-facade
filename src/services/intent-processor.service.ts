import Ajv from "ajv";
import { MAX_GAS_TRANSACTION, PROTOCOL_ID } from "../constants/constants";
import type {
  Context,
  Input,
  QuoteParams,
  SwapMessageParams,
} from "../interfaces/swap-machine.ex.interface";
import {
  AssetTypeEnum,
  type IntentCreateMsg,
  IntentCreateTypeEnum,
  type PrepareTxCrossChainResult,
  type PrepareTxSingleChainResult,
  type SolverQuote,
  type SubmitIntentResult,
  TransactionMethodEnum,
} from "../interfaces/swap-machine.in.interface";
import {
  mapAssetKey,
  mapCreateIntentTransactionCall,
} from "../maps/swap-transition.map";
import {
  msgSchemaCreateIntentCrossChain,
  msgSchemaCreateIntentSingleChain,
} from "../schemes/json-validaton.schema";
import parseDefuseAsset, { generateIntentId } from "../utils/utils";
import type { ApiService } from "./api.service";

export class IntentProcessorService {
  constructor(private readonly apiService: ApiService) {}

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  static prepareTxSingleChain(intent: any): PrepareTxSingleChainResult | null {
    const from = parseDefuseAsset(intent.assetIn);
    assert(from, "Invalid assetIn");
    const contractIdTokenIn = from.contractId;
    const to = parseDefuseAsset(intent.assetOut);
    assert(to, "Invalid assetOut");
    const contractIdTokenOut = to.contractId;

    const receiverIdIn = from.contractId;
    const unitsSendAmount = intent.amountIn;
    const estimateUnitsBackAmount = intent.amountOut;

    const msg: IntentCreateMsg = {
      type: IntentCreateTypeEnum.Create,
      id: generateIntentId(),
      asset_out: {
        type:
          contractIdTokenOut === AssetTypeEnum.Native
            ? AssetTypeEnum.Native
            : AssetTypeEnum.Nep141,
        token: contractIdTokenOut,
        amount: estimateUnitsBackAmount,
        account: intent?.accountTo
          ? (intent.accountTo ?? "")
          : (intent.accountId ?? ""),
      },
      lockup_until: {
        block_number: intent.lockup ?? 0,
      },
      expiration: {
        block_number: intent.expiration ?? 0,
      },
      referral: intent.referral ?? "",
    };

    const ajv = new Ajv();
    const validate = ajv.compile(msgSchemaCreateIntentSingleChain);
    const isValid = validate(msg);
    if (!isValid) {
      console.log("Validation errors:", validate.errors);
      return null;
    }

    const params = {} as PrepareTxSingleChainResult["actions"][0]["params"];
    if (contractIdTokenIn === AssetTypeEnum.Native) {
      Object.assign(params, {
        methodName: TransactionMethodEnum.NativeOnTransfer,
        args: {
          msg: JSON.stringify(msg),
        },
        gas: MAX_GAS_TRANSACTION,
        deposit: unitsSendAmount,
      });
    } else {
      Object.assign(params, {
        methodName: TransactionMethodEnum.FtTransferCall,
        args: {
          receiver_id: PROTOCOL_ID,
          amount: unitsSendAmount,
          memo: "Execute intent: NEP-141 to NEP-141",
          msg: JSON.stringify(msg),
        },
        gas: MAX_GAS_TRANSACTION,
        deposit: "1",
      });
    }

    return {
      receiverId:
        contractIdTokenIn === AssetTypeEnum.Native ? PROTOCOL_ID : receiverIdIn,
      actions: [
        {
          type: "FunctionCall",
          params,
        },
      ],
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  static prepareTxCrossChain(intent: any): PrepareTxCrossChainResult | null {
    const from = parseDefuseAsset(intent.assetIn);
    assert(from, "Invalid assetIn");
    const contractIdTokenIn = from.contractId;
    const to = parseDefuseAsset(intent.assetOut);
    assert(to, "Invalid assetOut");
    const contractIdTokenOut = to.contractId;

    const receiverIdIn = from.contractId;
    const unitsSendAmount = intent.amountIn;
    const estimateUnitsBackAmount = intent.amountOut;

    const msg: IntentCreateMsg = {
      type: IntentCreateTypeEnum.Create,
      id: generateIntentId(),
      asset_out: {
        type: AssetTypeEnum.CrossChain,
        oracle: intent?.solverId ?? "",
        asset: contractIdTokenOut,
        amount: estimateUnitsBackAmount,
        account: intent.accountTo ?? "",
      },
      lockup_until: {
        block_number: intent.lockup ?? 0,
      },
      expiration: {
        block_number: intent.expiration ?? 0,
      },
      referral: intent.referral ?? "",
    };

    const ajv = new Ajv();
    const validate = ajv.compile(msgSchemaCreateIntentCrossChain);
    const isValid = validate(msg);
    if (!isValid) {
      console.log("Validation errors:", validate.errors);
      throw new Error("Validation schema errors");
    }

    const params = {} as PrepareTxCrossChainResult["actions"][0]["params"];
    if (contractIdTokenIn === AssetTypeEnum.Native) {
      Object.assign(params, {
        methodName: TransactionMethodEnum.NativeOnTransfer,
        args: {
          msg: JSON.stringify(msg),
        },
        gas: MAX_GAS_TRANSACTION,
        deposit: unitsSendAmount,
      });
    } else {
      Object.assign(params, {
        methodName: TransactionMethodEnum.FtTransferCall,
        args: {
          receiver_id: PROTOCOL_ID,
          amount: unitsSendAmount,
          memo: `Execute intent: ${intent.assetIn} to ${intent.assetOut}`,
          msg: JSON.stringify(msg),
        },
        gas: MAX_GAS_TRANSACTION,
        deposit: "1",
      });
    }

    return {
      receiverId:
        contractIdTokenIn === AssetTypeEnum.Native ? PROTOCOL_ID : receiverIdIn,
      actions: [
        {
          type: "FunctionCall",
          params,
        },
      ],
    };
  }

  async fetchQuotes(params: Partial<QuoteParams>): Promise<SolverQuote[]> {
    if (!params.assetIn || !params.assetOut || !params.amountIn) {
      console.warn("Invalid quote parameters");
      return [];
    }
    try {
      const quotes = await this.apiService.getQuotes(params as QuoteParams);
      return quotes;
    } catch (error) {
      console.warn("Error fetching quotes:", error);
      return [];
    }
  }

  async prepareSwapCallData(intent: Input): Promise<SubmitIntentResult> {
    if (!intent.assetIn || !intent.assetOut || !intent.amountIn) {
      throw new Error("Invalid intent parameters");
    }
    const callData = mapCreateIntentTransactionCall(intent);
    if (callData) {
      return callData;
    }
    return null;
  }

  async readTransaction(hash: string): Promise<Context["intent"] | null> {
    return null;
  }

  async fetchIntent(intentId: string): Promise<Context["intent"] | null> {
    const intentDetails = await this.apiService.getIntent(intentId);
    const assetIn =
      intentDetails?.asset_in?.asset ??
      mapAssetKey(
        intentDetails?.asset_in?.type ?? AssetTypeEnum.Unknown,
        intentDetails?.asset_in?.token as string,
      );
    const assetOut =
      intentDetails?.asset_out?.asset ??
      mapAssetKey(
        intentDetails?.asset_out?.type ?? AssetTypeEnum.Unknown,
        intentDetails?.asset_out?.token as string,
      );

    if (!intentDetails || !assetIn || !assetOut) {
      console.log("No intent details found");
      return null;
    }

    return {
      intentId,
      initiator: intentDetails.asset_in.account,
      assetIn,
      assetOut,
      amountIn: intentDetails.asset_in.amount,
      amountOut: intentDetails.asset_out.amount,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  generateMessage(input: any): SwapMessageParams {
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
    const message = "Login with NEAR";
    const recipient = "swap-defuse.near";
    return {
      message,
      recipient,
      nonce: challenge,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  async sendMessage(input: any): Promise<any> {
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
    const message = "Login with NEAR";
    const recipient = "swap-defuse.near";
    return {
      message,
      recipient,
      nonce: challenge,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  async updateIntentState(input: any): Promise<string> {
    return "";
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
