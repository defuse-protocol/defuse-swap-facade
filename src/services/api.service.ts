import { Buffer } from "buffer";
import { NEAR_RPC, PROTOCOL_ID, SOLVER_RELAY } from "../constants/constants";
import type { QuoteParams } from "../interfaces/swap-machine.ex.interface";
import type {
  HttpResponse,
  IntentDetails,
  NearHttpResponse,
  SolverQuote,
} from "../interfaces/swap-machine.in.interface";
import { HttpService } from "./http.service";

export class ApiService {
  private httpService: HttpService;

  constructor() {
    this.httpService = new HttpService();
  }

  async getIntent(intentId: string): Promise<IntentDetails | null> {
    try {
      const payload = {
        id: "dontcare",
        jsonrpc: "2.0",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: PROTOCOL_ID,
          method_name: "get_intent",
          args_base64: Buffer.from(JSON.stringify({ id: intentId })).toString(
            "base64",
          ),
        },
      };
      const response = await this.httpService.post<
        NearHttpResponse<Uint8Array>
      >(NEAR_RPC, payload);
      if (response?.result?.result) {
        const byteArray = new Uint8Array(response.result.result);
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(byteArray);

        const intentDetails = JSON.parse(jsonString);
        return intentDetails;
      }

      console.error("Unexpected response format:", response);
      return null;
    } catch (error) {
      console.error("Failed to get intent:", error);
      return null;
    }
  }

  async getQuotes(params: QuoteParams): Promise<SolverQuote[]> {
    try {
      const payload = {
        id: "dontcare",
        jsonrpc: "2.0",
        method: "quote",
        params: [
          {
            defuse_asset_identifier_in: params.assetIn,
            defuse_asset_identifier_out: params.assetOut,
            amount_in: params.amountIn,
            intent_type: "dip2",
          },
        ],
      };
      const response = await this.httpService.post<HttpResponse<SolverQuote[]>>(
        SOLVER_RELAY,
        payload,
      );
      if (response?.result?.length > 0) {
        const dataAdapter = response.result.map((quote) => {
          return {
            // biome-ignore lint/suspicious/noExplicitAny: Outdated quote interface
            solverId: (quote as any).solver_id,
            // biome-ignore lint/suspicious/noExplicitAny: Outdated quote interface
            amountOut: (quote as any).amount_out.toString(),
          };
        });
        return dataAdapter as unknown as SolverQuote[];
      }
      console.error("Unexpected response format:", response);
      return [];
    } catch (error) {
      console.error("Failed to get quotes:", error);
      return [];
    }
  }
}
