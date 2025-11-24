import { SDK } from "@zkfair/sdk";
import type { Hex } from "./types";

export const sdk = new SDK({
	privateKey: process.env.PRIVATE_KEY as Hex,
});
