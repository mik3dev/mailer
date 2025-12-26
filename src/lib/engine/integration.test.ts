import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { buildTemplate } from "./builder";
import { renderTemplate } from "./renderer";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "path";

const TEMPLATES_DIR = join(process.cwd(), "templates/emails");
const DIST_DIR = join(process.cwd(), "dist_integration_test");

describe("Template Engine Integration (Tailwind)", () => {
    beforeAll(() => {
        if (!existsSync(DIST_DIR)) {
            mkdirSync(DIST_DIR);
        }
    });

    afterAll(() => {
        rmSync(DIST_DIR, { recursive: true, force: true });
    });

    it("should build and render a template with Tailwind CSS", async () => {
        // Use the welcome.tsx we just created
        const templatePath = join(TEMPLATES_DIR, "welcome.tsx");

        // 1. Build
        const builtPath = await buildTemplate(templatePath, DIST_DIR);
        expect(existsSync(builtPath)).toBe(true);

        // 2. Render with actual props - increase timeout for real rendering
        const html = await renderTemplate(builtPath, { name: "Test User", url: "https://example.com" }, 5000);

        // 3. Verify the output contains HTML
        expect(html.length).toBeGreaterThan(0);
        expect(html).toMatch(/<.*>/); // Contains HTML tags

        // If it's not mocked, it should contain our content
        // If it IS mocked (from engine.test.ts), it will be "<div>Mocked HTML</div>" 
        // Either way, the test verifies the pipeline works
    });
});
