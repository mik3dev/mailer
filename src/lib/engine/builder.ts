import { join, resolve } from "path";

/**
 * Builds a React Email template using Bun.build.
 * 
 * @param templatePath - Absolute path to the source .tsx file
 * @param outDir - Absolute path to the output directory
 * @returns The absolute path to the compiled .js file
 */
export async function buildTemplate(templatePath: string, outDir: string): Promise<string> {
    const result = await Bun.build({
        entrypoints: [templatePath],
        outdir: outDir,
        target: "bun",
        format: "esm",
        external: ["react", "react-dom", "@react-email/components", "tailwindcss", "@react-email/tailwind"], // Externalize heavy deps
        sourcemap: "none",
        minify: false, // Keep it readable for debugging if needed, or set true for perf
    });

    if (!result.success) {
        console.error("Build failed for template:", templatePath);
        console.error("Build logs:", JSON.stringify(result.logs, null, 2));
        console.error("Build outputs:", result.outputs.length);

        // Extract meaningful error message from logs
        const errorMessages = result.logs.map(log => log.message || String(log)).join(", ");
        throw new Error(`Bundle failed: ${errorMessages || "Unknown build error"}`);
    }

    // Calculate generic output filename based on entrypoint
    const fileName = templatePath.split("/").pop()?.replace(/\.tsx?$/, ".js");
    if (!fileName) {
        throw new Error(`Invalid template path: ${templatePath}`);
    }

    return join(outDir, fileName);
}
