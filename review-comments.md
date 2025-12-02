# review comments

This is a very well-structured PRD and TODO list. The modular, event-driven architecture is a solid choice for Node.js IoT middleware. It separates concerns effectively (Parser vs. Normalizer vs. Storage).

However, before you start coding, here are several critical improvements and architectural considerations to address. These will prevent technical debt and "rewrite moments" later.

### 1. Architecture & Scalability Risks

**A. The "Stateful" Normalizer Issue**

- **Current Plan:** The PRD states: *“Create one or several unified messages based on current parsed message and previous parsed message.”*
- **The Risk:** This implies the application is **stateful**. If the Node.js process restarts (deployment, crash, error), you lose the "previous message" in memory. When the next message arrives, the logic may break or produce incorrect data because it lacks the context of the previous state.
- **Advice:**
    - **Persistence Strategy:** On startup, the `MemoryStorage` or `Normalizer` module must hydrate its state by reading the latest state of active devices from the Database or a permanent JSON file.
    - **Cold Start Handling:** Define logic for what happens if no previous message exists (e.g., treat it as a fresh boot or wait for a specific "full status" message).

**B. Event Bus & Scaling (The "Singleton" Trap)**

- **Current Plan:** Uses Node.js internal `EventEmitter`.
- **The Risk:** This limits you to a **single process**. You cannot use PM2 clustering or Docker Swarm/K8s replicas later because an MQTT message received on Process A won't trigger a WebSocket broadcast on Process B.
- **Advice:** For V1, `EventEmitter` is fine. However, abstract the EventBus interface now so you can swap it for **Redis Pub/Sub** in V2 without changing application code.
    - *Code Tip:* Make `EventBus` an interface. `LocalEventBus` implements it using `EventEmitter`. Later, `RedisEventBus` implements the same methods.

### 2. Database Design Improvements

**A. Table Partitioning (Crucial for IoT)**

- **Current Plan:** Single `sensor_data` table.
- **The Risk:** IoT data grows exponentially. A single table with millions of rows will eventually slow down `INSERT` and `SELECT` queries, even with indexes.
- **Advice:** Plan for **Table Partitioning** by time (e.g., monthly).
    - *Implementation:* You don't need complex sharding yet, but ensure your `create_at` or `ts` column is part of the primary key so MySQL partitioning can be applied easily later.

**B. JSON Payload Querying**

- **Current Plan:** Payload stored as `JSON` column.
- **The Risk:** MySQL JSON performance is good, but heavy filtering on deep JSON fields in the `GET /api/specific` endpoint will be slow.
- **Advice:** If you know specific fields inside the JSON are queried frequently (e.g., `battery_level`, `temperature`), create **Generated Columns** (Virtual Columns) in MySQL and index them.

**C. The "Write Buffer" Data Loss Risk**

- **Current Plan:** Buffer 1000 messages in memory before writing to DB.
- **The Risk:** If the application crashes or the server loses power, you lose those 1000 messages.
- **Advice:**
    - Accept the risk for V1 (performance > durability).
    - *Or:* Implement a "Wal" (Write Ahead Log) where incoming messages are appended to a local text file immediately, then flushed to DB, then the text file is cleared.

### 3. Implementation Details & Code Quality

**A. Input Validation (Security & Stability)**

- **Current Plan:** Custom parsers.
- **Advice:** Use a runtime validation library like **Zod** or **Joi** inside your parsers.
    - IoT devices often send malformed data (glitches, low battery). If a parser expects a number but gets `null` or garbage characters, `parser.parse()` will throw an unhandled exception and crash the whole Node process.
    - *Rule:* Wrap all parsing logic in `try/catch` and strictly validate types.

**B. Time Handling**

- **Current Plan:** `ts` (device time) and `create_at` (server time).
- **Advice:** Ensure strictly **UTC** storage in the database.
    - IoT devices might send timestamps in local time (e.g., GMT+8). The Parser **must** convert device time to UTC ISO strings before the Normalizer sees it. Never store local time in the DB.

**C. Configuration Management**

- **Current Plan:** Custom `ConfigLoader` JSON loader.
- **Advice:** Don't write a custom loader. Use **`convict`** or **`dotenv`** combined with a schema validator.
    - Why? You need type safety. If `mqtt.port` is a string "1883" instead of number 1883, your app might fail silently. A config schema validator catches this at startup.

### 4. API & Interface Adjustments

**A. REST API Design**

- **Current Plan:** `POST /api/specific` for querying data.
- **Advice:** While using POST for complex search queries is sometimes acceptable (GraphQL style), strictly speaking, this should be a `GET`.
    - *Alternative:* `POST /api/devices/data/search` (indicates an action).
    - *Correction:* The endpoint `GET /api/specific` with query parameters is much better for caching and standard HTTP semantics.

**B. WebSocket Topic Subscription**

- **Current Plan:** Broadcasts *all* normalized messages to *all* connected clients.
- **The Risk:** If you have 1000 sensors and 50 web clients, you are sending 50,000 messages per second total network load. The frontend will freeze.
- **Advice:** Implement **Subscription** logic in V1.
    - Client sends: `{"action": "subscribe", "deviceId": "V5008-123"}`
    - Server only sends data for that device to that socket.

### 5. Specific Gaps in PRD/TODO

1. **Graceful Shutdown:**
    - Add to TODO: Ensure the `WriteBuffer` flushes to MySQL *before* the process exits on SIGINT/SIGTERM. This is the #1 cause of data loss in Node.js apps.
2. **Parser Contract:**
    - The PRD says "Parsers return standardized intermediate format."
    - *Action:* Define this interface *exactly* in a Typescript interface or JSDoc typedef in `src/core/types.js` before writing parsers. If parsers return slightly different structures, the Unified Normalizer will become a mess of `if/else`.
3. **Migration Strategy:**
    - You have `001_initial_schema.sql`. Add a **Migration Runner** (like `db-migrate` or a simple custom script) that runs on app startup to ensure the DB is in sync with the code. Do not run SQL manually.

### Revised Implementation Order (Optimization)

Your priorities are generally good, but I would swap one thing:
**Implement the "Mock Device Generator" script first.**
Before you write the Normalizer or Database, write a simple script that acts as a dummy V5008 device sending MQTT messages. You cannot test your architecture effectively without a steady stream of consistent, controllable data.

### Summary Checklist

- [ ]  **State Hydration:** Design how to load device state from DB on startup.
- [ ]  **Validation:** Add `zod`/`joi` to `package.json`.
- [ ]  **Safety:** Wrap Parser/Normalizer logic in try-catch blocks to prevent process crashes.
- [ ]  **Time:** Enforce UTC conversion in Parsers.
- [ ]  **API:** Add filtering/subscription to WebSockets to prevent frontend flooding.
- [ ]  **Database:** Use `db-migrate` or similar for schema management; consider partitioning.