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

        // 2. Render
        // We pass a dummy url prop
        const html = await renderTemplate(builtPath, { url: "https://example.com" });

        // 3. Verify Tailwind styles are inlined
        // The 'bg-brand' class with config colors: { brand: "#007291" } should become background-color: #007291
        // The 'text-white' should become color: #ffffff (or similar standard tailwind value)

        // We look for the inline style
        expect(html).toContain('style="');
        expect(html).toContain("background-color:rgb(0,114,145)"); // #007291 converted to rgb usually, or hex. Tailwind often outputs rgb or hex. 
        // Let's check for the hex or robustly check for the presence of the color key
        // React Email / Tailwind often converts to hex or rgb.
        // Let's check just a part of it or use a regex if needed, but simple string match is better if we know the output.
        // Tailwind default text-white is #fff or #ffffff
    });
});
