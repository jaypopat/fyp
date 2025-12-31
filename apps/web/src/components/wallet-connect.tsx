import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { anvil } from "wagmi/chains";
import { Button } from "./ui/button";

const isDevelopment = process.env.NODE_ENV !== "production";

export function WalletConnect() {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const isAnvil = chainId === anvil.id;

	if (!isDevelopment) {
		return (
			<ConnectButton.Custom>
				{({
					account,
					chain,
					openAccountModal,
					openChainModal,
					openConnectModal,
					mounted,
				}) => {
					const ready = mounted;
					const connected = ready && account && chain;

					return (
						<div
							{...(!ready && {
								"aria-hidden": true,
								style: {
									opacity: 0,
									pointerEvents: "none",
									userSelect: "none",
								},
							})}
						>
							{(() => {
								if (!connected) {
									return (
										<Button
											onClick={openConnectModal}
											size="sm"
											variant="outline"
										>
											Connect Wallet
										</Button>
									);
								}

								if (chain.unsupported) {
									return (
										<Button
											onClick={openChainModal}
											size="sm"
											variant="destructive"
										>
											Wrong network
										</Button>
									);
								}

								return (
									<div className="flex items-center gap-2">
										<Button
											onClick={openChainModal}
											size="sm"
											variant="outline"
											className="h-8 w-8 p-0"
											aria-label="Switch network"
										>
											{chain.hasIcon && (
												<div
													className="h-4 w-4 overflow-hidden rounded-full border border-border"
													style={{ background: chain.iconBackground }}
												>
													{chain.iconUrl && (
														<img
															alt={chain.name ?? "Chain icon"}
															src={chain.iconUrl}
															className="h-4 w-4"
														/>
													)}
												</div>
											)}
										</Button>

										<Button
											onClick={openAccountModal}
											size="sm"
											variant="outline"
											className="gap-2 font-mono"
										>
											<span className="text-xs">{account.displayName}</span>
										</Button>
									</div>
								);
							})()}
						</div>
					);
				}}
			</ConnectButton.Custom>
		);
	}

	// For development, show simple display-only status
	if (!isConnected || !address) {
		return (
			<Button size="sm" variant="outline" disabled>
				Not Connected
			</Button>
		);
	}

	const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

	return (
		<div className="flex items-center gap-2">
			<Button
				size="sm"
				variant={isAnvil ? "outline" : "destructive"}
				disabled
				className="h-8"
			>
				<span className="text-xs">
					{isAnvil ? "📦 Anvil" : "❌ Wrong Network"}
				</span>
			</Button>
			<Button size="sm" variant="outline" disabled className="font-mono">
				<span className="text-xs">{shortAddress}</span>
			</Button>
		</div>
	);
}
