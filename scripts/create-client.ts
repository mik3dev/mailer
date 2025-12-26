
import { db } from "../src/lib/db";
import { clients } from "../src/lib/db/schema";
import { randomBytes } from "crypto";
import { parseArgs } from "util";

/**
 * Usage:
 * bun run scripts/create-client.ts --name "My Client" --rate-limit 1000 --quota-limit 50000
 */

async function main() {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            name: {
                type: 'string',
            },
            "rate-limit": {
                type: 'string', // integers parsed as strings in args usually, safety
                default: "600"
            },
            "quota-limit": {
                type: 'string',
                default: "10000"
            }
        },
        strict: true,
        allowPositionals: true,
    });

    if (!values.name) {
        console.error("Error: --name is required");
        process.exit(1);
    }

    const name = values.name;
    const rateLimit = parseInt(values["rate-limit"] || "600", 10);
    const quotaLimit = parseInt(values["quota-limit"] || "10000", 10);

    console.log(`Creating client: ${name}`);

    // 1. Generate Credentials
    // Prefix: 8 chars hex
    const prefix = randomBytes(4).toString("hex");
    // Secret: 32 chars hex
    const secret = randomBytes(16).toString("hex");

    // Full Key (for internal ref, though we usually just use the prefix + secret separately)
    // We only store the HASH of the secret.

    // 2. Hash Secret
    const apiSecretHash = await Bun.password.hash(secret, {
        algorithm: "argon2id",
    });

    // 3. Insert into DB
    try {
        const [newClient] = await db.insert(clients).values({
            name,
            apiKeyPrefix: prefix,
            apiSecretHash: apiSecretHash,
            rateLimit,
            quotaLimit,
            status: "active"
        }).returning();

        console.log("\n✅ Client Created Successfully!");
        console.log("------------------------------------------------");
        console.log(`ID:         ${newClient.id}`);
        console.log(`Name:       ${newClient.name}`);
        console.log(`API Key:    ${prefix} (Prefix)`);
        console.log(`API Secret: ${secret}`);
        console.log("------------------------------------------------");
        console.log("⚠️  SAVE THIS SECRET NOW. IT WILL NOT BE SHOWN AGAIN.");
        console.log("------------------------------------------------");

        process.exit(0);

    } catch (error) {
        console.error("Failed to create client:", error);
        process.exit(1);
    }
}

main();
