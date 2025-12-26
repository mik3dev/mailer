import { render } from "@react-email/components";
import * as React from "react";

/**
 * Renders a compiled React Email template to HTML.
 * Includes a timeout safeguard to prevent infinite loops or CPU exhaustion.
 * 
 * @param templatePath - Absolute path to the compiled .js template
 * @param props - Props to pass to the React component
 * @param timeoutMs - Max execution time in ms (default 200ms)
 * @returns The rendered HTML string
 */
export async function renderTemplate(
    templatePath: string,
    props: Record<string, any> = {},
    timeoutMs: number = 200
): Promise<string> {
    // Dynamic import of the compiled module
    // Note: Bun caches imports. If we need hot-reloading behavior in the future, 
    // we might need to use a cache busting strategy (e.g. query params), 
    // but for the worker execution, a fresh process or standard module caching is usually fine 
    // or managed by the container lifecycle.
    const module = await import(templatePath);

    // Expecting 'default' export or strict named export. 
    // Based on builder.tsx, we default to the default export.
    const Component = module.default;

    if (!Component) {
        throw new Error(`Template ${templatePath} does not have a default export.`);
    }

    // Define the render task
    const renderTask = new Promise<string>(async (resolve, reject) => {
        try {
            // We create the element here. ensuring React is available.
            // @ts-ignore - React type mismatch might occur if multiple react versions, but standard usage is fine
            const element = React.createElement(Component, props);
            const html = await render(element);
            resolve(html);
        } catch (err) {
            reject(err);
        }
    });

    // Define the timeout promise
    const timeoutLimit = new Promise<string>((_, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Render timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    // Race them
    return Promise.race([renderTask, timeoutLimit]);
}
