
import { join } from "path";
import { existsSync } from "fs";
import { buildTemplate } from "./builder";
import { renderTemplate } from "./renderer";
import { withDistributedLock } from "./locker";
import { logger } from "../logger";

// Configuration
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || join(process.cwd(), "templates/emails");
const DIST_DIR = process.env.DIST_DIR || join(process.cwd(), "dist");

/**
 * Loads a template, compiling it just-in-time if necessary.
 * Orchestrates Cache Check -> Distributed Lock -> Build -> Render.
 * 
 * @param templateName - Name of the template (e.g., "welcome", "auth/reset-password") without extension
 * @param props - Data to pass to the template
 */
export async function loadTemplate(templateName: string, props: Record<string, any>): Promise<string> {
    const srcPath = join(TEMPLATES_DIR, `${templateName}.tsx`);
    const distPath = join(DIST_DIR, `${templateName}.js`);

    // Ensure source exists
    if (!existsSync(srcPath)) {
        throw new Error(`Template source not found: ${srcPath}`);
    }

    // 1. Optimistic Cache Check (Fast Path)
    if (existsSync(distPath)) {
        // In dev mode, we might want to check modification times, but for Prod (Ephemeral Dist), existence implies freshness 
        // until restart or manual invalidation.
        return renderTemplate(distPath, props);
    }

    // 2. Cold Start: Compile with Distributed Lock
    const lockKey = `compile:${templateName}`;
    const ttlSeconds = 30; // Max time to allow for a build

    await withDistributedLock(lockKey, ttlSeconds, async () => {
        // 2a. Double-check Cache (Lock Protection)
        // Another node might have finished building while we waited for lock
        if (existsSync(distPath)) {
            logger.info("Template built by another worker, skipping build", { template: templateName });
            return;
        }

        logger.info("Compiling template...", { template: templateName });
        await buildTemplate(srcPath, DIST_DIR);
        logger.info("Template compiled successfully", { template: templateName });
    });

    // 3. Render
    return renderTemplate(distPath, props);
}
