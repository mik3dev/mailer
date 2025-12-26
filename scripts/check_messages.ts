import { db } from "../src/lib/db";
import { messages } from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const checkMessages = async () => {
    console.log("Últimos 5 mensajes en la base de datos:\n");

    const result = await db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(5);

    if (result.length === 0) {
        console.log("No hay mensajes en la base de datos.");
    } else {
        result.forEach((m, i) => {
            console.log(`\n[${i + 1}]`);
            console.log(`  ID: ${m.id}`);
            console.log(`  Trace ID: ${m.traceId || 'NULL'}`);
            console.log(`  Template: ${m.templateName}`);
            console.log(`  To: ${m.recipient}`);
            console.log(`  Status: ${m.status}`);
            console.log(`  Created: ${m.createdAt}`);
        });
    }

    process.exit(0);
};

checkMessages();
