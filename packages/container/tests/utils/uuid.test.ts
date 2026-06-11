import { describe, it, expect } from "vitest";
import { generateUuid } from "../../src/utils/uuid.js";

describe("generateUuid", () => {
	it("应生成有效的 UUID v4 格式", () => {
		const uuid = generateUuid();
		expect(uuid).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it("每次生成的 UUID 应不同", () => {
		const a = generateUuid();
		const b = generateUuid();
		expect(a).not.toBe(b);
	});
});
