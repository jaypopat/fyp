import {
	type Account,
	encodePacked,
	type Hash,
	type Hex,
	keccak256,
	recoverMessageAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Data required to create a receipt
 */
export interface ReceiptData {
	seqNum: number;
	modelId: number;
	features: number[];
	sensitiveAttr: number;
	prediction: number;
	timestamp: number;
}

/**
 * A signed receipt proving provider committed to specific inference data
 */
export interface SignedReceipt extends ReceiptData {
	/** Hash of all receipt data (deterministic, matches contract encoding) */
	dataHash: Hash;
	/** Hash of features array (for on-chain verification without full features) */
	featuresHash: Hash;
	/** Provider's signature over dataHash */
	providerSignature: Hex;
}

/**
 * Receipt hashes before signing
 */
export interface ReceiptHashes {
	dataHash: Hash;
	featuresHash: Hash;
}

export function createReceiptHashes(data: ReceiptData): ReceiptHashes {
	const featuresHash = keccak256(
		encodePacked(["string"], [JSON.stringify(data.features)]),
	);

	// Creating a deterministic hash of all query data (same encoding as contract)
	const dataHash = keccak256(
		encodePacked(
			["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
			[
				BigInt(data.seqNum),
				BigInt(data.modelId),
				featuresHash,
				BigInt(data.sensitiveAttr),
				BigInt(Math.round(data.prediction * 1e6)), // Scale prediction to int
				BigInt(data.timestamp),
			],
		),
	);

	return { dataHash, featuresHash };
}

/**
 * Sign a receipt data hash with a private key
 *
 * @param dataHash - The hash to sign (from createReceiptHashes)
 * @param privateKey - Provider's private key
 * @returns Signature hex string
 *
 * @example
 * ```typescript
 * const signature = await signReceiptHash(dataHash, "0x...");
 * ```
 */
export async function signReceiptHash(
	dataHash: Hash,
	privateKey: Hex,
): Promise<Hex> {
	const account = privateKeyToAccount(privateKey);
	return await account.signMessage({
		message: { raw: dataHash },
	});
}

/**
 * Sign a receipt data hash with a viem Account
 *
 * @param dataHash - The hash to sign (from createReceiptHashes)
 * @param account - viem Account instance (must have signMessage capability)
 * @returns Signature hex string
 */
export async function signReceiptHashWithAccount(
	dataHash: Hash,
	account: Account,
): Promise<Hex> {
	if (!account.signMessage) {
		throw new Error("Account does not support signMessage");
	}
	return await account.signMessage({
		message: { raw: dataHash },
	});
}

export async function createSignedReceipt(
	data: ReceiptData,
	privateKey: Hex,
): Promise<SignedReceipt> {
	const { dataHash, featuresHash } = createReceiptHashes(data);
	const providerSignature = await signReceiptHash(dataHash, privateKey);

	return {
		...data,
		dataHash,
		featuresHash,
		providerSignature,
	};
}

/**
 * Verify a receipt signature
 *
 * @param receipt - The signed receipt to verify
 * @param expectedSigner - Expected signer address
 * @returns True if signature is valid and from expected signer
 */
export async function verifyReceipt(
	receipt: SignedReceipt,
	expectedSigner: Hex,
): Promise<boolean> {
	// Recompute the data hash to ensure it matches
	const { dataHash } = createReceiptHashes(receipt);

	if (dataHash !== receipt.dataHash) {
		return false;
	}

	try {
		const recoveredAddress = await recoverMessageAddress({
			message: { raw: dataHash },
			signature: receipt.providerSignature,
		});

		return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
	} catch {
		return false;
	}
}
