import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const register = command({
	name: "Register as an auditor",
	desc: "Register as an auditor onchain",
	///options: options.<>,
	// handler: commands.<>,
});
