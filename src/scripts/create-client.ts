
import { db } from "../lib/db";
import { clients } from "../lib/db/schema";
import { parseArgs } from "util";
import { randomBytes, randomUUID } from "crypto";

async function main() {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            name: {
                type: "string",
            },
        },
        strict: true,
        allowPositionals: true,
    });

    if (!values.name) {
        console.error("Error: --name is required");
        process.exit(1);
    }

    const prefix = randomBytes(8).toString("hex").slice(0, 8);
    const secret = randomBytes(32).toString("hex");
    const secretHash = await Bun.password.hash(secret);

    try {
        const [client] = await db.insert(clients).values({
            name: values.name,
            apiKeyPrefix: prefix,
            apiSecretHash: secretHash,
        }).returning();

        console.log("✅ Client Created Successfully");
        console.log("-----------------------------------");
        console.log(`ID:     ${client.id}`);
        console.log(`Name:   ${client.name}`);
        console.log(`Prefix: ${prefix}`);
        console.log(`Secret: ${secret}`);
        console.log("-----------------------------------");
        console.log("⚠️  SAVE THE SECRET NOW. It cannot be shown again.");

    } catch (error) {
        console.error("Failed to create client:", error);
    } finally {
        process.exit(0);
    }
}

main();
