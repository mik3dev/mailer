import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
    }

    console.log("Running migrations...");

    // Create a specialized connection for migration (max 1 connection)
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    try {
        // This will run migrations from the ./drizzle folder relative to CWD
        await migrate(db, { migrationsFolder: "drizzle" });
        console.log("Migrations applied successfully!");

        await migrationClient.end();
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        await migrationClient.end();
        process.exit(1);
    }
}

main();
