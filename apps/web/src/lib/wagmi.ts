import { createConfig, http } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";
import { injected, mock } from "wagmi/connectors";

const isDevelopment = process.env.NODE_ENV !== "production";

export const wagmiConfig = createConfig({
	chains: isDevelopment ? [anvil] : [sepolia],
	connectors: isDevelopment
		? [
				mock({
					accounts: [
						"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
						"0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
						"0x1234567890123456789012345678901234567890",
					],
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
