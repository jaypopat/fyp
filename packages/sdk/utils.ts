import Papa from "papaparse";

export async function parseCSV(filePath: string): Promise<string[][]> {
	const csvText = await Bun.file(filePath).text();
	// Parse CSV using PapaParse
	const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
	if (parsed.errors.length) {
		throw new Error(`Error parsing CSV: ${parsed.errors.join(", ")}`);
	}

	return parsed.data;
}
