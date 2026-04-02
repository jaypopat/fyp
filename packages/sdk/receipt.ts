import {
	type Account,
	encodePacked,
	type Hash,
	type Hex,
	keccak256,
	recoverMessageAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { HashSchema } from "./artifacts";

export const ReceiptDataSchema = z.object({
	seqNum: z.number().int(),
	modelId: z.number().int(),
	features: z.array(z.number()),
	sensitiveAttr: z.number().int(),
	prediction: z.number(),
	timestamp: z.number(),
});
export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

const HexSchema = z.string().startsWith("0x") as z.ZodType<Hex>;

export const SignedReceiptSchema = ReceiptDataSchema.extend({
	dataHash: HashSchema,
	featuresHash: HashSchema,
	providerSignature: HexSchema,
});
export type SignedReceipt = z.infer<typeof SignedReceiptSchema>;

export const ReceiptHashesSchema = z.object({
	dataHash: HashSchema,
	featuresHash: HashSchema,
});
export type ReceiptHashes = z.infer<typeof ReceiptHashesSchema>;

export function parseReceiptData(data: unknown): ReceiptData {
	return ReceiptDataSchema.parse(data);
}

export function parseSignedReceipt(data: unknown): SignedReceipt {
	return SignedReceiptSchema.parse(data);
}

export function createReceiptHashes(data: ReceiptData): ReceiptHashes {
	const featuresHash = keccak256(
		encodePacked(["string"], [JSON.stringify(data.features)]),
	);

	// Encoding must match ZKFair.sol's disputeNonInclusion/disputeFraudulentInclusion
	const dataHash = keccak256(
		encodePacked(
			["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
			[
				BigInt(data.seqNum),
				BigInt(data.modelId),
				featuresHash,
				BigInt(data.sensitiveAttr),
				BigInt(Math.round(data.prediction * 1e6)), // Scale prediction to int
				BigInt(Math.floor(data.timestamp / 1000)), // Convert to Unix timestamp (seconds)
			],
		),
	);

	return { dataHash, featuresHash };
}

export async function signReceiptHash(
	dataHash: Hash,
	privateKey: Hex,
): Promise<Hex> {
	const account = privateKeyToAccount(privateKey);
	return await account.signMessage({
		message: { raw: dataHash },
	});
}

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

export async function verifyReceipt(
	receipt: SignedReceipt,
	expectedSigner: Hex,
): Promise<boolean> {
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
