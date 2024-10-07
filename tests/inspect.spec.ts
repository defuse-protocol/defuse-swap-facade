import { createBrowserInspector } from "@statelyai/inspect";
import { it } from "vitest";
import { createActor } from "xstate";
import { swapMachine } from "../src";

// This test is used to inspect the swapMachine in the browser
// It does not test anything, but it's useful for debugging
it("passes", () => {
  if (process.env.VITE_INSPECT === "true") {
    const { inspect } = createBrowserInspector();
    const actor = createActor(swapMachine, {
      inspect,
      input: {
        assetIn: "",
        assetOut: "",
        amountIn: "",
      },
    });
    actor.start();
  }
});
