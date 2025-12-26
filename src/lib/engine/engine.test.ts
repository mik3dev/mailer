import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { buildTemplate } from "./builder";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "path";
// We don't import renderTemplate yet, we will require it after mocking

const TEMPLATES_DIR = join(process.cwd(), "templates/emails");
const DIST_DIR = join(process.cwd(), "dist_test");

describe("Template Engine", () => {
    beforeAll(() => {
        if (!existsSync(DIST_DIR)) {
            mkdirSync(DIST_DIR);
        }
    });

    afterAll(() => {
        rmSync(DIST_DIR, { recursive: true, force: true });
    });

    describe("Builder", () => {
        it("should compile a .tsx template to .js", async () => {
            const templatePath = join(TEMPLATES_DIR, "test_email.tsx");
            const builtPath = await buildTemplate(templatePath, DIST_DIR);

            expect(builtPath).toBeDefined();
            expect(builtPath.endsWith("test_email.js")).toBe(true);
            expect(existsSync(builtPath)).toBe(true);

            // Verify content is ESM
            const content = await Bun.file(builtPath).text();
            expect(content).toContain("export");
        });
    });

    describe("Renderer", () => {
        it("should render (mocked) and timeout (mocked)", async () => {
            // Mocking the external dependency to test logic in isolation
            mock.module("@react-email/components", () => {
                return {
                    render: async (elem: any) => {
                        // Check prop to simulate slowness
                        if (elem.props.name === "Slow") {
                            await Bun.sleep(50);
                            return "<div>Slow</div>";
                        }
                        return "<div>Mocked HTML</div>";
                    }
                };
            });

            // Re-require to pick up the mock
            // Note: In Bun, modules are cached. We might need to rely on the fact that mock.module works globally if hoisted,
            // or we use `require` inside the test.
            // Since we haven't imported renderer.ts at top level, requiring here is safe.
            const { renderTemplate } = require("./renderer");

            // 1. Build a real template (needed for the import inside renderTemplate)
            const templatePath = join(TEMPLATES_DIR, "test_email.tsx");
            const builtPath = await buildTemplate(templatePath, DIST_DIR);

            // 2. Test Success
            const html = await renderTemplate(builtPath, { name: "Fast" });
            expect(html).toContain("Mocked HTML");

            // 3. Test Timeout
            // Timeout set to 10ms, Render takes 50ms
            try {
                await renderTemplate(builtPath, { name: "Slow" }, 10);
                throw new Error("Should have timed out");
            } catch (err: any) {
                expect(err.message).toContain("Render timed out");
            }
        });
    });
});
