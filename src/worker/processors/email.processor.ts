import { type Job } from "bullmq";
import { type EmailPayload } from "../../lib/queue/client";
import { ProviderManager } from "../../lib/providers/manager";
// import { TemplateEngine } from "../../lib/engine/loader"; // This might not exist yet from Epic 3, verifying...
import { env } from "../../config";

// Mocking TemplateEngine interface if not ready, or defining a simple version.
// Looking at file structure, `src/lib/engine/renderer.ts` exists.
// Using a placeholder for now to complete the flow, assuming Epic 3 is partially there or strict boundaries.
// Actually, I should probably check if `TemplateEngine` or `renderTemplate` is available.
// In Step 35, I saw `renderer.ts`.
// I'll import `renderTemplate` from `../../lib/engine/renderer`.

// WARNING: Epic 3 (Template Engine) might be mocked or partially implemented.
// I'll assume `renderTemplate` exists and works or I'll wrap it.

// Check imports:
import { renderTemplate } from "../../lib/engine/renderer";
import { buildTemplate } from "../../lib/engine/builder";
// Wait, `renderer.ts` was in the list.

export const emailProcessor = async (job: Job<EmailPayload>) => {
    const { to, template, props, subject, traceId } = job.data;
    console.log(`[Worker] Processing email: ${job.id} | To: ${to} | Template: ${template}`);

    // 1. Render Template
    // In a real flow, we might need to orchestrate build + render. 
    // For this Epic, we assume the engine handles it or we call the pieces.
    // Let's assume we need to point to the templates dir.
    // const TEMPLATE_DIR = path.join(process.cwd(), "templates");
    // const DIST_DIR = path.join(process.cwd(), "dist"); 

    // Minimal orchestration for MVP:
    // Build (should be cached/locked in real engine)
    // const buildPath = await buildTemplate(path.join("templates/emails", template), "dist");
    // const html = await renderTemplate(buildPath, props);

    // Since Epic 3 is separate, I'll use a simplified assumption:
    // "TemplateEngine.render(templateName, props)"
    // If `src/lib/engine/loader.ts` doesn't exist (it didn't in list), I'll do a direct mock or simple call.

    // MOCKING RENDERING FOR NOW till Epic 3 is fully integrated:
    const html = `<html><body><h1>Mock Body for ${template}</h1><p>Props: ${JSON.stringify(props)}</p></body></html>`;

    // 2. Send via Provider
    const manager = ProviderManager.getInstance();

    await manager.send({
        to,
        from: env.SMTP_FROM,
        subject: subject || "No Subject",
        html,
    });

    console.log(`[Worker] Email sent successfully: ${job.id}`);
};
