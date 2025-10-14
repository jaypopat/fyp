import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const query = command({
	name: "Query models / Run inference",
	desc: "Query models with ITMAC protocol",
	///options: options.<>,
	// handler: commands.<>,
});
