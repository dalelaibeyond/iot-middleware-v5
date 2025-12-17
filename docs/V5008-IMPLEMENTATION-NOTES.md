# V5008 Implementation Notes

## Overview

This document describes the implementation changes made to support V5008 devices according to the v1.4rev specification.

## Changes Made

### 1. V5008Parser.js Updates

#### Binary Message Format Changes
- Updated field names to match new specification:
  - `modNum` → `modAddr`
  - `uCount` → `uTotal`
  - `rfidCount` → `onlineCount`
  - `rfidData` → `items`
  - `num` → `uPos`
  - `alarm` → `alarmStatus`
  - `rfid` → `tagId`
  - `doorState` → `doorState` (same name, but clarified)
  - `cmdResult` → `resultCode`

#### Signed Integer Handling
- Added `hexToSignedByte()` helper function for proper signed 8-bit integer conversion
- Updated temperature/humidity parsing to handle `tempInt + tempFrac` and `humInt + humFrac` format
- Updated noise parsing to handle `noiseInt + noiseFrac` format
- Properly handles negative values for temperature, humidity, and noise

#### Variable Length Fields
- Updated `parseSetColorResponse()` to handle variable length `originalReq` field
- Updated `parseClearAlarmResponse()` to handle variable length `originalReq` field
- Added logic to extract and parse the original request from the response

#### QRY_COLOR_RESP Handling
- Updated `parseColorQueryResponse()` to handle missing count field
- Added calculation of `uTotal` based on packet length: `totalBytes - fixedOverhead`
- Fixed color parsing to use `uPos` instead of `num`

### 2. UnifiedNormalizer.js Updates

#### Hybrid Storage Model
- Implemented new `createUnifiedRecord()` method for unified data structure
- Updated all message normalization to use hybrid storage approach:
  - **Telemetry data** (temperature, humidity, noise): Split into individual rows with `num_value`
  - **State data** (heartbeat, device info, module info, color map): Stored as `json_value`
  - **Event data** (door, RFID attach/detach, color set, alarm clear): Stored as `json_value`

#### Hierarchy Indexing
- Added proper `module_index` and `sensor_index` fields:
  - `module_index`: V5008 `modAddr` (1-5)
  - `sensor_index`: Varies by sensor type:
    - Temperature/Humidity: `sensorAddr` (10-15)
    - U-Level/RFID: `uPos` (1-54)
    - Noise: `sensorAddr` (16-18)
    - Door: 0 (per module)

#### Color Code Mapping
- Updated color code mapping to match v1.4rev specification:
  ```javascript
  0: 'OFF',
  1: 'RED',
  2: 'PURPLE',
  3: 'YELLOW',
  4: 'GREEN',
  5: 'CYAN',
  6: 'BLUE',
  7: 'WHITE',
  8: 'RED_F',      // Flash colors
  9: 'PURPLE_F',
  10: 'YELLOW_F',
  11: 'GREEN_F',
  12: 'CYAN_F',
  13: 'BLUE_F',
  14: 'WHITE_F',
  ```

#### RFID Map Preservation
- Updated `normalizeRfidMessage()` to always store full RFID map as JSON blob
- Maintains attach/detach detection for individual RFID events
- Preserves complete RFID state for historical analysis

### 3. Database Schema

#### New Unified Table
- Created `migrations/003_create_unified_table.sql` with hybrid storage model
- Table structure matches specification requirements:
  ```sql
  CREATE TABLE iot_unified_data (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(32) NOT NULL,
      device_type VARCHAR(10) NOT NULL,
      module_index INT DEFAULT 0,
      sensor_index INT DEFAULT 0,
      message_class VARCHAR(20) NOT NULL,
      data_key VARCHAR(32) NOT NULL,
      num_value DOUBLE,
      str_value VARCHAR(255),
      json_value JSON,
      ts_device DATETIME(3),
      ts_server DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      message_id VARCHAR(32),
      raw_message TEXT
  );
  ```
- Added comprehensive indexing for performance optimization

### 4. V6800Parser and G6000Parser

#### Minimal Skeleton Implementation
- Updated both parsers with minimal skeleton implementations
- Extract basic topic and message information
- Return placeholder structure to allow application to run
- Ready for future implementation when specifications are available

### 5. Testing

#### Test Coverage
- Created `test/v5008-parser-test.js` with sample messages from specification
- Tests all message types: HEARTBEAT, RFID, TEMP_HUM, NOISE, DOOR, QRY_COLOR, SET_COLOR, CLR_ALARM
- Verifies parser output and normalizer unified record generation
- Confirms hybrid storage model implementation

## Usage

### Running Tests
```bash
node test/v5008-parser-test.js
```

### Database Migration
```bash
# Apply new unified table schema
mysql -u username -p iot_middleware < migrations/003_create_unified_table.sql
```

## Compatibility

- Backward compatible with existing V5008 message formats
- Maintains existing V6800 and G6000 parser interfaces
- New unified table can coexist with legacy `sensor_data` table during migration

## Future Work

- Complete V6800 and G6000 parser implementations when specifications are available
- Add data validation and error handling improvements
- Implement message replay and recovery mechanisms
- Add performance monitoring and metrics collection