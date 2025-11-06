import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { anvil, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
	appName: "ZKFair",
	projectId: "970301b3ba64c343cbf202f7ac0c4ffd",
	chains: [anvil, sepolia],
	ssr: false,
	transports: {
		[anvil.id]: http("http://127.0.0.1:8545"),
		[sepolia.id]: http(),
	},
});
