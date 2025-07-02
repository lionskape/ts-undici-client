import process from "node:process";
import { safeBuild, setup } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginZod } from "@kubb/plugin-zod";

export async function generate(
	specPath: string,
	outputPath = "./zod",
): Promise<void> {
	const config = {
		root: process.cwd(),
		input: { path: specPath },
		output: { path: "./.kubb", clean: true },
		plugins: [pluginOas({}), pluginZod({ output: { path: outputPath } })],
	};

	const pluginManager = await setup({ config });
	await safeBuild({ config, pluginManager });
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const spec = process.argv[2];
	const out = process.argv[3];
	if (!spec) {
		console.error("Usage: ts-undici-generate <specPath> [outputPath]");
		process.exit(1);
	}
	generate(spec, out).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
