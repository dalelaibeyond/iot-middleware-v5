# UnifyNormalizer V1.0

*This document full name is: UnifyNormalizer.js Design Guide v1.0*

This is the critical "Business Logic" layer of your framework. As a Senior Architect, I have designed this **UnifyNormalizer.js Guide (v1.0)** to solve the specific asymmetry between V5008 (State-based) and V6800 (Event-based).

This guide introduces a **State Cache** concept, which is mandatory to normalize the behavior of these two different protocols.

---

# UnifyNormalizer.js Design Guide v1.0

## 1. Overview & Architecture

The **UnifyNormalizer** is the bridge between device-specific Parsers and the Database/Application.

- **Input:** Device-Specific Parsed JSON (V5008 / V6800).
- **Output:** An **Array** of Standardized Unified Objects (SUO).
- **Core Responsibility:**
    1. **Flattening:** Converting arrays of sensors into individual data points.
    2. **Standardization:** Mapping all message types to a canonical list.
    3. **State Management (Crucial):** Converting "Snapshots" to "Events" (V5008) and "Events" to "Snapshots" (V6800).

---

## 2. Standardized Definitions

### 2.1 Unified Message Types (Canonical List)

The Normalizer must map all incoming `messageType` values to these 6 System Types:

| System Type | Description | Source Examples |
| --- | --- | --- |
| `SYS_TELEMETRY` | Time-series data (Temp, Hum, Noise, Power) | `TemHum`, `Noise`, `HeartBeat`(Power) |
| `SYS_RFID_EVENT` | A tag moving (Attached/Detached) | `LabelState`(V6800), Diff of `LabelState`(V5008) |
| `SYS_RFID_SNAPSHOT` | Full list of current tags | `LabelState`(V5008), Aggregation of `LabelState`(V6800) |
| `SYS_STATE_CHANGE` | Discrete state change (Door, Alarm) | `Door`, `DoorState`, `ClrAlarm` |
| `SYS_DEVICE_INFO` | Static info (IP, FW, MAC) | `Init` (V6800/V5008) |
| `SYS_LIFECYCLE` | Device presence | `HeartBeat` (Status) |

### 2.2 Unified Database Schema (SQL Recommended)

To handle the "Split" requirement efficiently, we use a hybrid schema.

**Table 1: `iot_telemetry` (High Volume - Analytics)***Used for Temp, Hum, Noise, Voltage.*

```sql
CREATE TABLE iot_telemetry (
    ts          DATETIME(3),
    device_id   VARCHAR(32),
    mod_addr    INT,           -- Physical Location
    sensor_addr INT,           -- Physical Location
    metric_key  VARCHAR(20),   -- 'temperature', 'humidity', 'voltage'
    metric_val  DOUBLE,
    PRIMARY KEY (ts, device_id, mod_addr, sensor_addr, metric_key)
);

```

**Table 2: `iot_rfid_events` (Audit Log)***Used for Attached/Detached history.*

```sql
CREATE TABLE iot_rfid_events (
    ts          DATETIME(3),
    device_id   VARCHAR(32),
    mod_addr    INT,
    u_pos       INT,
    action      VARCHAR(10),   -- 'ATTACHED', 'DETACHED'
    tag_id      VARCHAR(32)
);

//Note: Ensure the Normalizer knows that for **V5008**, the action field is **derived** by the Normalizer, whereas for **V6800**, it is **passed through**.
```

**Table 3: `iot_device_state` (Current Truth - Snapshot)***Used for "Current Tags", "Door Status", "IP Address".*

```sql
CREATE TABLE iot_device_state (
    device_id   VARCHAR(32),
    mod_addr    INT,
    data_key    VARCHAR(32),   -- 'rfid_map', 'door_state', 'device_info'
    json_value  JSON,          -- Stores the full object
    last_updated DATETIME(3),
    PRIMARY KEY (device_id, mod_addr, data_key)
);

```

---

## 3. The Unified Object Structure (In-Memory)

The `UnifyNormalizer.js` function will return an **Array** of these objects.

```jsx
{
  "meta": {
    "uuid": "gen-uuid-v4",
    "ts": "2025-11-13T07:04:52.951Z",
    "receivedAt": "2025-11-13T07:04:53.000Z"
  },
  "identity": {
    "deviceId": "2123456789",
    "deviceType": "V6800",  // or "V5008"
    "modAddr": 2,           // 1-5 (Null if gateway level)
    "sensorAddr": 10        // 10-18 or uPos (Null if module level)
  },
  "type": "SYS_TELEMETRY",  // The Canonical Type
  "payload": {
    "key": "temperature",
    "value": 24.5,
    "unit": "celsius"       // Optional context
  }
}

```

---

## 4. Normalization Logic & Workflow

The Normalizer requires a **State Cache** (Redis or In-Memory Map) to solve the V5008 vs V6800 asymmetry.

### 4.1 Logic: Splitting Telemetry (Temp/Hum/Noise)

*Goal: Decouple grouped sensors into individual readings.*

- **Input:** `sensors: [{sensorAddr: 10, temp: 20, hum: 50}, {sensorAddr: 11...}]`
- **Action:** Loop through array.
- **Output:** Generate **2 objects per sensor**.
    1. Object A: `type: SYS_TELEMETRY`, `payload: {key: 'temperature', value: 20}`
    2. Object B: `type: SYS_TELEMETRY`, `payload: {key: 'humidity', value: 50}`
- **Result:** Upper app can query "Temperature" without parsing JSON.

### 4.2 Logic: RFID State Management (The Diff Engine)

This is the most complex part. We must normalize behavior so the Upper App receives **Events** AND **Snapshots** regardless of device type.

### **Scenario A: V5008 (Sends Snapshot)**

- **Input:** `items: [{uPos: 10, tag: A}, {uPos: 12, tag: B}]`
- **Step 1 (Load):** Fetch `previous_state` from Cache/DB for this Module.
    - *Prev:* `{10: A, 11: C}`
- **Step 2 (Diff):** Compare Current vs Prev.
    - 10: A == A (No Change)
    - 11: C is missing in Current -> **Event: DETACHED (Tag C)**
    - 12: B is new in Current -> **Event: ATTACHED (Tag B)**
- **Step 3 (Output):**
    1. Emit `SYS_RFID_EVENT` objects for the diffs (Detached C, Attached B).
    2. Emit `SYS_RFID_SNAPSHOT` object with the full list.
- **Step 4 (Save):** Update Cache with new Snapshot.

### **Scenario B: V6800 (Sends Event)**

- **Input:** `items: [{uPos: 11, action: "attached", tag: D}]`
- **Step 1 (Load):** Fetch `previous_state` from Cache/DB.
    - *Prev:* `{10: A, 12: B}`
- **Step 2 (Apply):** Update state.
    - Set 11 = D.
    - *New State:* `{10: A, 11: D, 12: B}`
- **Step 3 (Output):**
    1. Emit `SYS_RFID_EVENT` object (Pass through the V6800 event).
    2. Emit `SYS_RFID_SNAPSHOT` object (The newly constructed state).
- **Step 4 (Save):** Update Cache.

### 4.3 Logic: Splitting Device Init

*Goal: Normalize V6800's combined Init into V5008's separated format.*

- **Input (V6800 Init):** Contains `device: {...}` AND `modules: [...]`.
- **Action:**
    1. **Generate Message 1 (Gateway):**
        - `type`: `SYS_DEVICE_INFO`
        - `identity`: `modAddr: null`
        - `payload`: `{ ip, mac, fwVer }`
    2. **Generate Messages 2..N (Modules):**
        - Loop through `modules` array.
        - `type`: `SYS_DEVICE_INFO`
        - `identity`: `modAddr: i`
        - `payload`: `{ fwVer, modId, vendor }`

---

## 5. Developer Implementation Notes (for AI Coding)

### 5.1 Helper Functions Required

The AI should generate these specific helpers within `UnifyNormalizer.js`:

1. `normalizeTelemetry(deviceId, deviceType, parsedData)`: Handles the explosion of sensor arrays into individual rows.
2. `normalizeRfid(deviceId, deviceType, parsedData, stateCache)`: Implements the **Diff Engine** described in 4.2.
3. `normalizeInit(deviceId, deviceType, parsedData)`: Handles the V6800 split logic.

### 5.2 Addressing Path (The Index)

The "Address" must be constructed consistently for the database `primary_key`.

```jsx
// Function to generate unique sensor path
function getSensorPath(deviceId, modAddr, sensorAddr) {
    // Format: "2123456789/M2/S10"
    return `${deviceId}/M${modAddr || 0}/S${sensorAddr || 0}`;
}
```

## 6. Summary of Transformations

| Input Message (Parser) | Normalized Output (Array of Objects) | DB Table Target |
| --- | --- | --- |
| **TemHum** (Array of 6) | 12 Objects (6 Temp + 6 Hum) | `iot_telemetry` |
| **Noise** (Array of 3) | 3 Objects | `iot_telemetry` |
| **Heartbeat** (Power) | 2 Objects (Voltage + Current) | `iot_telemetry` |
| **Heartbeat** (Status) | 1 Object (Status=Online) | `iot_device_state` |
| **RFID** (V5008) | N Events (Diff) + 1 Snapshot | `iot_rfid_events` + `iot_device_state` |
| **RFID** (V6800) | N Events (Direct) + 1 Snapshot | `iot_rfid_events` + `iot_device_state` |
| **Door** | 1 Object (State Change) | `iot_device_state` + `iot_telemetry` (opt) |
| **Init** (V6800) | 1 Device Object + N Module Objects | `iot_device_state` |

This guide provides the AI with the exact logic needed to handle the complex state management differences between your devices while maintaining a clean, queryable database structure.