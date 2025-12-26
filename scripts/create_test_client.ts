import { db } from "../src/lib/db";
import { clients } from "../src/lib/db/schema";
import { randomBytes } from "crypto";

const createClient = async () => {
    const name = "Test Client";
    const apiKey = randomBytes(24).toString("hex");
    const apiSecret = randomBytes(32).toString("hex");
    const apiSecretHash = await Bun.password.hash(apiSecret);

    const [client] = await db.insert(clients).values({
        name,
        apiKeyPrefix: apiKey.slice(0, 8),
        apiSecretHash,
    }).returning();

    console.log("Client Created:");
    console.log(`API Key: ${apiKey}`);
    console.log(`API Secret: ${apiSecret}`);
    console.log(`Prefix: ${apiKey.slice(0, 8)}`);

    process.exit(0);
};

createClient();
