import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const generatorBin = fileURLToPath(
	new URL("../../generator/dist/index.js", import.meta.url),
);

async function runGenerator(specRelativePath: string): Promise<void> {
	const tmp = await mkdtemp(join(tmpdir(), "gen-"));
	const specPath = fileURLToPath(new URL(specRelativePath, import.meta.url));
	await execFileAsync("node", [generatorBin, specPath, "zod"], { cwd: tmp });
	await access(join(tmp, ".kubb", "zod", "petSchema.ts"));
	await access(join(tmp, ".kubb", "schemas", "pet.json"));
	await rm(tmp, { recursive: true, force: true });
}

describe("generator", () => {
	it("generates schemas from YAML spec", async () => {
		await expect(runGenerator("./petstore.yaml")).resolves.toBeUndefined();
	});

	it("generates schemas from JSON spec", async () => {
		await expect(runGenerator("./petstore.json")).resolves.toBeUndefined();
	});
});
