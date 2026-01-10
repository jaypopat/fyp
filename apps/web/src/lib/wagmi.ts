import { createConfig, http } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";
import { injected, mock } from "wagmi/connectors";
import { config } from "@/config";

const isDevelopment_anvil = config.chain == anvil;

// Anvil's first test account (publicly known, only for local dev)
const ANVIL_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

export const wagmiConfig = createConfig({
	chains: isDevelopment_anvil ? [anvil] : [sepolia],
	connectors: isDevelopment_anvil
		? [
				mock({
					accounts: [ANVIL_ACCOUNT],
					features: {
						reconnect: true,
					},
				}),
			]
		: [injected()],
	transports: {
		[anvil.id]: http("http://127.0.0.1:8545", {
			batch: false,
			retryCount: 1,
		}),
		[sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com", {
			batch: false,
			retryCount: 3,
		}),
	},
});
