# V6800 Device Message Format Documentation

## Overview

This document describes the message format for V6800 IoT devices used in the IoT Middleware V5 system. The V6800 device supports up to 24 U-Sensor modules and communicates via MQTT using specific topic patterns and message structures.

## MQTT Topic Structure

### Topic Format

```
V6800Upload/{deviceId}/{messageClass}
```

### Parameters

- **deviceId**: Unique identifier for the V6800 device
- **messageClass**: Type of message being sent

### Supported Message Classes

| Message Class    | Description                         | Frequency                         |
| ---------------- | ----------------------------------- | --------------------------------- |
| `HEARTBEAT`      | Device heartbeat signal             | Periodic (e.g., every 60 seconds) |
| `RFID`           | RFID card detection events          | Event-driven                      |
| `TEMP_HUM`       | Temperature and humidity readings   | Periodic or event-driven          |
| `NOISE`          | Noise level measurements            | Periodic or event-driven          |
| `DOOR`           | Door open/close events              | Event-driven                      |
| `QRY_RFID`       | RFID query response                 | On-demand                         |
| `QRY_TEMP_HUM`   | Temperature/humidity query response | On-demand                         |
| `QRY_NOISE`      | Noise level query response          | On-demand                         |
| `QRY_DOOR_STATE` | Door state query response           | On-demand                         |
| `QRY_DEVICE`     | Device information query response   | On-demand                         |
| `QRY_MODULE`     | Module information query response   | On-demand                         |
| `SET_COLOR`      | LED color setting command           | Command                           |
| `CLR_ALARM`      | Alarm clear command                 | Command                           |

## Message Formats

### 1. HEARTBEAT Message

**Purpose**: Periodic device health check

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:15:00.000Z",
  "uptime": 172800,
  "batteryLevel": 92,
  "signalStrength": -42,
  "firmwareVersion": "2.1.4",
  "modules": [
    {
      "modNum": 1,
      "modId": "680001234567",
      "status": "online",
      "lastSeen": "2025-11-30T05:14:45.000Z"
    },
    {
      "modNum": 2,
      "modId": "680002345678",
      "status": "offline",
      "lastSeen": "2025-11-30T05:10:30.000Z"
    }
  ]
}
```

**Fields**:

- `deviceId`: Device identifier (matches topic deviceId)
- `deviceType`: Always "V6800"
- `timestamp`: ISO 8601 timestamp
- `uptime`: Device uptime in seconds
- `batteryLevel`: Battery percentage (0-100)
- `signalStrength`: Signal strength in dBm
- `firmwareVersion`: Current firmware version
- `modules`: Array of up to 24 connected modules

### 2. RFID Message

**Purpose**: RFID card detection event

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:15:15.123Z",
  "modNum": 5,
  "modId": "680005678901",
  "cardId": "F1E2D3C4B5A6",
  "cardType": "MIFARE_PLUS",
  "eventType": "detected",
  "antennaId": 2,
  "readerType": "long_range"
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Event timestamp
- `modNum`: Module number (1-24)
- `modId`: Module identifier
- `cardId`: RFID card identifier
- `cardType`: Card type (MIFARE, MIFARE_PLUS, etc.)
- `eventType`: Event type (detected, removed, authorized, unauthorized)
- `antennaId`: Antenna identifier
- `readerType`: Reader type (standard, long_range)

### 3. TEMP_HUM Message

**Purpose**: Temperature and humidity sensor readings

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:15:30.456Z",
  "modNum": 8,
  "modId": "680008901234",
  "temperature": 22.8,
  "humidity": 68.5,
  "unit": "celsius",
  "heatIndex": 23.2
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Reading timestamp
- `modNum`: Module number (1-24)
- `modId`: Module identifier
- `temperature`: Temperature value
- `humidity`: Humidity percentage
- `unit`: Temperature unit (celsius/fahrenheit)
- `heatIndex`: Calculated heat index (when applicable)

### 4. NOISE Message

**Purpose**: Noise level measurement

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:15:45.789Z",
  "modNum": 12,
  "modId": "680012345678",
  "noiseLevel": 42.3,
  "unit": "dB",
  "peakLevel": 48.7,
  "frequency": 1000,
  "duration": 5000
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Measurement timestamp
- `modNum`: Module number (1-24)
- `modId`: Module identifier
- `noiseLevel`: Current noise level
- `unit`: Measurement unit (dB)
- `peakLevel`: Peak noise level
- `frequency`: Frequency in Hz
- `duration`: Measurement duration in milliseconds

### 5. DOOR Message

**Purpose**: Door open/close status

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:16:00.000Z",
  "modNum": 16,
  "modId": "680016789012",
  "doorState": "open",
  "eventType": "change",
  "duration": 0,
  "forcedOpen": false,
  "tamperDetected": false
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Event timestamp
- `modNum`: Module number (1-24)
- `modId`: Module identifier
- `doorState`: Door state (open/closed/locked/unlocked)
- `eventType`: Event type (change, forced_open, tamper)
- `duration`: Duration in seconds (for close events)
- `forcedOpen`: Whether door was forced open
- `tamperDetected`: Whether tampering was detected

### 6. Query Response Messages

**Purpose**: Response to on-demand queries

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:16:15.000Z",
  "queryType": "QRY_MODULE",
  "queryId": "req_23456",
  "responseData": {
    "modNum": 8,
    "modId": "680008901234",
    "moduleType": "TEMP_HUM",
    "status": "online",
    "lastReading": "2025-11-30T05:15:30.456Z",
    "calibrationDate": "2025-11-01T00:00:00.000Z",
    "firmwareVersion": "1.5.2"
  }
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Response timestamp
- `queryType`: Type of query being responded to
- `queryId`: Original query identifier
- `responseData`: Response data specific to query type

### 7. Command Messages

**Purpose**: Commands sent to device

**JSON Format**:

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:16:30.000Z",
  "command": "SET_COLOR",
  "commandId": "cmd_78901",
  "parameters": {
    "modNum": 5,
    "color": "#00FF00",
    "brightness": 90,
    "duration": 10000,
    "pattern": "blink"
  }
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "V6800"
- `timestamp`: Command timestamp
- `command`: Command type
- `commandId`: Unique command identifier
- `parameters`: Command-specific parameters

## Error Handling

### Error Message Format

```json
{
  "deviceId": "6800123456789",
  "deviceType": "V6800",
  "timestamp": "2025-11-30T05:16:45.000Z",
  "error": {
    "code": "MODULE_OFFLINE",
    "message": "Module 12 is offline",
    "modNum": 12,
    "modId": "680012345678",
    "severity": "warning"
  }
}
```

### Common Error Codes

| Error Code             | Description                     |
| ---------------------- | ------------------------------- |
| `MODULE_OFFLINE`       | Module is not responding        |
| `INVALID_PARAMETER`    | Invalid command parameter       |
| `BATTERY_LOW`          | Battery level is critically low |
| `SENSOR_FAULT`         | Sensor malfunction detected     |
| `COMMUNICATION_ERROR`  | Communication failure           |
| `MODULE_OVERLOAD`      | Too many modules active         |
| `MEMORY_FULL`          | Device memory is full           |
| `CALIBRATION_REQUIRED` | Sensor calibration needed       |

## V6800 Specific Features

### Multi-Module Support

- Supports up to 24 U-Sensor modules
- Module numbering: 1-24
- Each module has unique identifier

### Advanced RFID Features

- Support for multiple card types
- Long-range reader capability
- Anti-collision detection

### Enhanced Sensor Capabilities

- Heat index calculation for temperature/humidity
- Frequency analysis for noise measurements
- Extended measurement ranges

### Security Features

- Tamper detection on door modules
- Forced open detection
- Secure communication options

## Implementation Notes

1. **Timestamp Format**: All timestamps should be in ISO 8601 format (UTC)
2. **Module Numbers**: V6800 supports modules numbered 1-24
3. **Message Validation**: All messages should include required fields for their type
4. **Error Recovery**: Devices should send error messages for any failure conditions
5. **Heartbeat Frequency**: Recommended heartbeat interval is 60 seconds
6. **Data Types**: All numeric values should use appropriate precision
7. **Module Status**: Devices should report status for all connected modules

## Parser Implementation

The V6800Parser class in the IoT Middleware V5 system handles these message formats:

1. **Topic Validation**: Validates topic format `V6800Upload/{deviceId}/{messageClass}`
2. **Message Parsing**: Parses JSON messages and validates required fields
3. **Error Handling**: Provides meaningful error messages for malformed messages
4. **Data Extraction**: Extracts device information, sensor data, and metadata
5. **Module Management**: Handles multi-module device configurations

For more details on parser implementation, see [`src/modules/normalizer/parsers/V6800Parser.js`](src/modules/normalizer/parsers/V6800Parser.js).
