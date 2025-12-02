# PRD.MD improve points

---

Your PRD is strong: modular, event-driven, and well-structured. It’s close to code-ready, but a few areas need clarification before implementation.

---

## ⚠️ Gaps / Things to Complete Before Coding

- **Configuration Schema**
    - Provide full JSON examples for MQTT topics, DB settings, relay rules, write-buffer, cache, and module toggles.
- **Authentication & Security**
    - Define JWT issuer, expiration, rotation, and which endpoints require authentication.
- **Normalized Message Schema**
    - Lock down required vs optional fields, data types, and enums (msgType, sensorType).
- **Error Handling**
    - Define retry/backoff rules, dead-letter queues, and how `message.error` events are consumed.
- **Scaling & Backpressure**
    - Clarify queue limits, maxListeners, and thresholds for circuit breaker and event storm handling.
- **Database Schema & Migration**
    - Finalize SQL schema, indexes, retention policy, and migration scripts.
- **Testing Plan**
    - Unit, integration, and load tests with sample data for each device type.
- **Observability**
    - List metrics to track (latency, throughput, error rate), log format examples, and alert thresholds.
- **Deployment Details**
    - Document environment variables, secrets management, and health-check semantics.

---

## ✅ Pre-Code Tasks You Should Do

1. **Finalize normalized message schema** → publish as `schemas/normalized-message.json`.
2. **Create config templates** → `config/default.json`, `config/production.json.example`.
3. **Define component interfaces** → short design doc for `BaseComponent`, EventBus, Storage API.
4. **Write DB migration scripts** → include sample data for V5008, V6800, G6000.
5. **Set up CI pipeline** → linting, tests, container build.
6. **Draft API contract** → OpenAPI spec for REST/webhook endpoints.
7. **Plan load test scenarios** → concurrent messages, batch sizes, flush intervals.
8. **Confirm libraries** → e.g., `mqtt.js`, `mysql2`, `express`, `winston` for logging.

---

## 📌 Some Options

- Provide **sample raw MQTT messages** for each device type (V5008, V6800, G6000).

-put it to be later to realise

- Confirm **which modules must be in v1** (minimum viable set).

-MQTT Client, Unify Normalizer, Memory Storage, Db Storage, Message Relay, WebSocket, RESTful, etc

- Decide if **auth is required** for APIs/WebSocket in v1.

-put it to next version, but keep it easy expansion

- Confirm **TypeScript vs plain JavaScript** preference.

-TypeScript 

- Share any **ORM/driver preference** (e.g., Sequelize, Prisma, or raw SQL).

Raw SQL in v1, but can Upgrading later to Sequelize or Prisma

---

---

---