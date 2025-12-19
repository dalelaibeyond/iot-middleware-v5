# IoT Middleware V5 Implementation Summary

## Overview

This implementation provides a complete IoT middleware system for handling messages from V5008 (binary protocol) and V6800 (JSON protocol) devices, normalizing them into a unified format for database storage and application processing.

## Components Implemented

### 1. V5008Parser.js
- **Location**: `src/modules/normalizer/parsers/V5008Parser.js`
- **Purpose**: Parses binary messages from V5008 IoT devices
- **Key Features**:
  - Binary header-based message type identification (0xCC, 0xBA, etc.)
  - Big-endian multi-byte integer parsing
  - Temperature/humidity signed integer + fractional format handling
  - Variable length field parsing for command responses
  - Module address validation (1-5)
  - IP address and MAC address formatting
  - ISO 8601 timestamp injection
  - Result code standardization ("Success"/"Failure" instead of hex codes)

### 2. V6800Parser.js
- **Location**: `src/modules/normalizer/parsers/V6800Parser.js`
- **Purpose**: Parses JSON messages from V6800 IoT devices
- **Key Features**:
  - JSON parsing with error handling
  - Topic-based message type mapping
  - Array structure preservation for multi-module messages
  - RFID action calculation (attached/detached)
  - Result code standardization
  - ISO 8601 timestamp injection
  - Strict adherence to raw key mapping table from specification

### 3. UnifyNormalizer.js
- **Location**: `src/modules/normalizer/UnifyNormalizer.js`
- **Purpose**: Business logic layer that converts parser outputs to Standardized Unified Objects (SUO)
- **Key Features**:
  - **State Management**: In-memory cache for RFID state tracking
  - **Telemetry Splitting**: Converts sensor arrays to individual data points
  - **RFID Diff Engine**: Generates events from V5008 snapshots, manages V6800 events
  - **Message Type Mapping**: Maps to canonical types (SYS_TELEMETRY, SYS_RFID_EVENT, etc.)
  - **Path Generation**: Creates unique database indexing paths
  - **V6800 Init Handling**: Splits combined device/module info

### 4. StorageService.js
- **Location**: `src/modules/storage/StorageService.js`
- **Purpose**: Takes normalized data from UnifyNormalizer and persists it to the database
- **Key Features**:
  - **Routing Logic**: Maps System Message Types to specific SQL tables
  - **Batch Processing**: Efficiently processes arrays of normalized data
  - **SQL Generation**: Generic SQL generator with mock database interface
  - **Data Mapping**: Properly maps JSON fields to SQL columns
  - **Error Handling**: Comprehensive error handling for all data types
  - **Upsert Operations**: Handles insert-or-update logic for device state

## Global Implementation Rules Applied

1. **Consistency**: Both parsers output `resultCode` as "Success" or "Failure"
2. **Timestamps**: Both parsers inject ISO 8601 `ts` field into root of parsed JSON
3. **V5008 Type Inference**: Uses binary header byte to set specific `messageType`
4. **Type Consistency**: `modId` is always String, `modAddr` is always Number

## Message Type Mapping

| Input Type | Output Type | Description |
|------------|--------------|-------------|
| TemHum/TEMP_HUM | SYS_TELEMETRY | Temperature/humidity readings |
| Noise/NOISE | SYS_TELEMETRY | Noise level measurements |
| HeartBeat/HEARTBEAT | SYS_LIFECYCLE | Device presence and power data |
| LabelState/RFID | SYS_RFID_EVENT + SYS_RFID_SNAPSHOT | Tag movements and current state |
| Door/DOOR_STATE | SYS_STATE_CHANGE | Door open/close events |
| Init | SYS_DEVICE_INFO | Device and module information |
| OpeAck | SYS_STATE_CHANGE | Operation acknowledgments |

## Storage Service Database Mapping

The StorageService maps normalized data to the appropriate database tables:

| System Type | Target Table | Key Mapping |
|--------------|---------------|-------------|
| SYS_TELEMETRY | iot_telemetry | payload.key → metric_key, payload.value → metric_val |
| SYS_RFID_EVENT | iot_rfid_events | payload.value.action → action, payload.value.tagId → tag_id |
| SYS_RFID_SNAPSHOT | iot_device_state | data_key: 'rfid_map', json_value: entire payload |
| SYS_STATE_CHANGE | iot_device_state | data_key: payload.key, json_value: entire payload |
| SYS_DEVICE_INFO | iot_device_state | data_key: payload.key, json_value: entire payload |
| SYS_LIFECYCLE | iot_device_state | data_key: 'status', json_value: entire payload |

## State Management

### V5008 (Snapshot-based)
- Receives full RFID tag list
- Compares with cached previous state
- Generates ATTACHED/DETACHED events for changes
- Emits current snapshot
- Updates cache

### V6800 (Event-based)
- Receives individual tag events
- Passes through events directly
- Updates cached state
- Emits current snapshot from updated cache

## Database Schema Compatibility

The normalized output is compatible with the hybrid database schema:

```sql
-- Telemetry data (high volume)
CREATE TABLE iot_telemetry (
    ts DATETIME(3),
    device_id VARCHAR(32),
    mod_addr INT,
    sensor_addr INT,
    metric_key VARCHAR(20),
    metric_val DOUBLE
);

-- RFID events (audit log)
CREATE TABLE iot_rfid_events (
    ts DATETIME(3),
    device_id VARCHAR(32),
    mod_addr INT,
    u_pos INT,
    action VARCHAR(10),
    tag_id VARCHAR(32)
);

-- Current state (snapshots)
CREATE TABLE iot_device_state (
    device_id VARCHAR(32),
    mod_addr INT,
    data_key VARCHAR(32),
    json_value JSON,
    last_updated DATETIME(3)
);
```

## Testing

Comprehensive test suites are provided:

- **V5008 Parser Tests**: `test/v5008-updated-parser-test.js`
- **V6800 Parser Tests**: `test/v6800-parser-test.js`
- **UnifyNormalizer Tests**: `test/unify-normalizer-test.js`
- **StorageService Tests**: `test/storage-service-test.js`
- **Debug Scripts**: `test/debug-parsers.js`

## File Structure

```
src/modules/
├── normalizer/
│   ├── parsers/
│   │   ├── V5008Parser.js          # V5008 binary protocol parser
│   │   ├── V6800Parser.js          # V6800 JSON protocol parser
│   │   └── index.js               # Parser exports
│   ├── UnifyNormalizer.js           # Business logic normalizer
│   └── UnifiedNormalizer.js          # Legacy normalizer (preserved)
└── storage/
    └── StorageService.js             # Database persistence service

test/
├── v5008-updated-parser-test.js
├── v6800-parser-test.js
├── unify-normalizer-test.js
├── storage-service-test.js
└── debug-parsers.js

docs/ (updated)
├── V5008_V1.4.md             # V5008 specification
├── V6800_V1.3.md             # V6800 specification
└── UnifyNormalizer_V1.0.md      # Normalizer specification

outdated-doc/ (archived)
├── V5008-IMPLEMENTATION-NOTES.md
├── message-format-v6800.md
└── message-format-g6000.md
```

## Usage Example

```javascript
import V5008Parser from './src/modules/normalizer/parsers/V5008Parser.js';
import V6800Parser from './src/modules/normalizer/parsers/V6800Parser.js';
import UnifyNormalizer from './src/modules/normalizer/UnifyNormalizer.js';
import StorageService from './src/modules/storage/StorageService.js';

// Initialize parsers, normalizer, and storage service
const v5008Parser = new V5008Parser();
const v6800Parser = new V6800Parser();
const normalizer = new UnifyNormalizer();
const storageService = new StorageService();

// Initialize storage service
await storageService.initialize();

// Parse V5008 binary message
const v5008Parsed = v5008Parser.parse(topic, binaryBuffer);
const v5008Normalized = normalizer.normalize(v5008Parsed);

// Parse V6800 JSON message
const v6800Parsed = v6800Parser.parse(topic, jsonString);
const v6800Normalized = normalizer.normalize(v6800Parsed);

// Store normalized data in database
await storageService.saveBatch(v5008Normalized);
await storageService.saveBatch(v6800Normalized);

// Both normalized outputs are arrays of SUO objects ready for database insertion
console.log('V5008 normalized:', v5008Normalized);
console.log('V6800 normalized:', v6800Normalized);
```

## Key Achievements

1. ✅ **Protocol Compliance**: Strict adherence to V5008_V1.4 and V6800_V1.3 specifications
2. ✅ **Global Rules**: All implementation rules consistently applied
3. ✅ **State Management**: Robust RFID state tracking with diff engine
4. ✅ **Data Normalization**: Proper splitting and mapping to canonical types
5. ✅ **Database Persistence**: Complete storage service with proper SQL mapping
6. ✅ **Error Handling**: Comprehensive error handling and validation
7. ✅ **Testing**: Complete test coverage for all components
8. ✅ **Documentation**: Clear documentation and examples

## Next Steps

The implementation is complete and ready for integration with the broader IoT middleware system. The normalized outputs can be directly inserted into the recommended database schema or processed by upper-layer applications. The StorageService provides a clean interface for persisting data to the appropriate tables based on message type.