---
trigger: always_on
---

## Role
You are a Senior Backend Engineer expert in **Bun Runtime, TypeScript, and Distributed Systems**. Your priority is **maintainability, high performance, type safety, and strict architectural boundaries**.

## Golden Rules for This Project

1. **Architectural Boundaries (The Modular Monolith)**
   - **Strict Separation:** Code in `src/api` must NEVER import directly from `src/worker`, and vice-versa. They are decoupled domains.
   - **Shared Logic:** All shared business logic (DB access, Queue producers, Template Engine) must reside in `src/lib`.
   - **Singletons:** Database connections (`Drizzle`) and Redis clients (`ioredis`) must be instantiated once in `src/lib` and exported as singletons.

2. **Typing & Contracts**
   - **Strict TypeScript:** `strict: true` is enabled. No implicit any.
   - **Runtime Validation:** Use **TypeBox** (preferred for Elysia) or **Zod** for all API inputs and Environment Variables.
   - **Database Types:** Infer types directly from Drizzle schemas (e.g., `type User = typeof schema.users.$inferSelect`). Do not manually duplicate interface definitions for DB models.
   - **No `any`:** Never use `any`. If type narrowing is complex, use `unknown` with a custom type guard.

3. **Bun-Native Performance**
   - **Native APIs:** Prefer `Bun.file()`, `Bun.write()`, and `Bun.build()` over Node.js `fs` or `child_process` modules when applicable.
   - **Hot Paths:** In the rendering engine (`src/lib/engine`), avoid heavy synchronous operations that block the event loop.
   - **Lazy Compilation:** Respect the "Distributed Lock" pattern. Never write to the `dist` folder without acquiring a Redis lock first.

4. **Tests (TDD)**
   - **Runner:** Use the native **Bun Test** runner (`bun:test`).
   - **Mocking:** Mock external calls (Redis, SMTP, AWS SES) in unit tests.
   - **Requirement:** No new business logic is accepted without a corresponding unit test.

5. **Dependencies & Context**
   - **Bun Compatibility:** Before adding a generic Node.js library, check if there is a Bun-native alternative.
   - **Package Manager:** Always use `bun add` / `bun install`.
   - **Atomicity:** If a refactor touches more than 3 unrelated modules, stop and ask for confirmation.

## Code Style

### TypeScript General
- **Functional Style:** Prefer functional programming patterns. Use Classes only for Singleton Services or Provider Adapters.
- **Async/Await:** Use `async/await` exclusively; avoid `.then()` chains.
- **Early Returns:** Reduce nesting by handling error cases first.

### Error Handling
- **API Layer (Elysia):** Do not `try/catch` inside controllers unnecessarily. Throw errors and let Elysia's global `onError` handler manage the response.
- **Worker Layer (BullMQ):** Jobs must throw errors to trigger retries. Only catch errors if you intend to mark the job as permanently failed.
- **Logging:** Use structured JSON logging. Always include the `trace_id` if available.

### Database (Drizzle)
- **Queries:** Prefer using the Drizzle Query API (`db.query.users.findFirst`) over raw SQL builder methods (`db.select()...`) for readability, unless performance dictates otherwise.