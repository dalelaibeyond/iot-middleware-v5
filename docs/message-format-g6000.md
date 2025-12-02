# G6000 Device Message Format Documentation

## Overview

This document describes the message format for G6000 IoT devices used in the IoT Middleware V5 system. The G6000 device is a gateway device that aggregates data from multiple sensor types and communicates via MQTT using specific topic patterns and message structures.

## MQTT Topic Structure

### Topic Format

```
G6000Upload/{deviceId}/{messageClass}
```

### Parameters

- **deviceId**: Unique identifier for the G6000 device
- **messageClass**: Type of message being sent

### Supported Message Classes

| Message Class    | Description                        | Frequency                         |
| ---------------- | ---------------------------------- | --------------------------------- |
| `HEARTBEAT`      | Device heartbeat signal            | Periodic (e.g., every 60 seconds) |
| `GATEWAY_STATUS` | Gateway system status              | Periodic                          |
| `SENSOR_DATA`    | Aggregated sensor data             | Periodic or event-driven          |
| `ALERT`          | System alerts and notifications    | Event-driven                      |
| `SYSTEM_EVENT`   | System-level events                | Event-driven                      |
| `QRY_STATUS`     | Status query response              | On-demand                         |
| `QRY_SENSORS`    | Sensor information query response  | On-demand                         |
| `QRY_GATEWAY`    | Gateway information query response | On-demand                         |
| `SET_CONFIG`     | Configuration setting command      | Command                           |
| `RESET_ALERT`    | Alert reset command                | Command                           |

## Message Formats

### 1. HEARTBEAT Message

**Purpose**: Periodic device health check

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:17:00.000Z",
  "uptime": 259200,
  "cpuUsage": 15.2,
  "memoryUsage": 68.5,
  "diskUsage": 45.8,
  "networkStatus": "connected",
  "activeConnections": 12,
  "firmwareVersion": "3.2.1",
  "hardwareVersion": "2.5"
}
```

**Fields**:

- `deviceId`: Device identifier (matches topic deviceId)
- `deviceType`: Always "G6000"
- `timestamp`: ISO 8601 timestamp
- `uptime`: Device uptime in seconds
- `cpuUsage`: CPU usage percentage
- `memoryUsage`: Memory usage percentage
- `diskUsage`: Disk usage percentage
- `networkStatus`: Network connection status
- `activeConnections`: Number of active connections
- `firmwareVersion`: Current firmware version
- `hardwareVersion`: Hardware version

### 2. GATEWAY_STATUS Message

**Purpose**: Detailed gateway system status

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:17:30.000Z",
  "systemHealth": "good",
  "connectedDevices": 8,
  "totalDevices": 10,
  "dataRate": {
    "incoming": 1250.5,
    "outgoing": 890.2,
    "unit": "bytes/sec"
  },
  "protocols": {
    "mqtt": "connected",
    "http": "active",
    "websocket": "active",
    "modbus": "connected"
  },
  "services": {
    "dataCollector": "running",
    "alertManager": "running",
    "configManager": "running",
    "logManager": "running"
  }
}
```

**Fields**:

- `deviceId`: Device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Status timestamp
- `systemHealth`: Overall system health status
- `connectedDevices`: Number of connected devices
- `totalDevices`: Total configured devices
- `dataRate`: Data transfer rates
- `protocols`: Protocol connection status
- `services`: Service status information

### 3. SENSOR_DATA Message

**Purpose**: Aggregated sensor data from connected devices

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:18:00.000Z",
  "sourceDevice": "V5008-2437871205",
  "sourceDeviceType": "V5008",
  "sensorType": "TEMP_HUM",
  "modNum": 2,
  "modId": "3963041727",
  "data": {
    "temperature": 24.5,
    "humidity": 62.3,
    "unit": "celsius"
  },
  "quality": "good",
  "aggregationMethod": "average",
  "aggregationPeriod": 300
}
```

**Fields**:

- `deviceId`: Gateway device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Data timestamp
- `sourceDevice`: Original device identifier
- `sourceDeviceType`: Original device type
- `sensorType`: Type of sensor data
- `modNum`: Module number from source device
- `modId`: Module identifier from source device
- `data`: Sensor data values
- `quality`: Data quality indicator
- `aggregationMethod`: How data was aggregated
- `aggregationPeriod`: Aggregation period in seconds

### 4. ALERT Message

**Purpose**: System alerts and notifications

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:18:15.000Z",
  "alertId": "ALT_123456789",
  "severity": "warning",
  "category": "device_offline",
  "sourceDevice": "V6800-6800123456789",
  "sourceDeviceType": "V6800",
  "message": "Device V6800-6800123456789 has been offline for more than 5 minutes",
  "details": {
    "lastSeen": "2025-11-30T05:13:10.000Z",
    "offlineDuration": 305,
    "affectedModules": [5, 8, 12]
  },
  "acknowledged": false,
  "resolved": false
}
```

**Fields**:

- `deviceId`: Gateway device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Alert timestamp
- `alertId`: Unique alert identifier
- `severity`: Alert severity (info, warning, error, critical)
- `category`: Alert category
- `sourceDevice`: Device that triggered the alert
- `sourceDeviceType`: Type of source device
- `message`: Alert message
- `details`: Additional alert details
- `acknowledged`: Whether alert has been acknowledged
- `resolved`: Whether alert has been resolved

### 5. SYSTEM_EVENT Message

**Purpose**: System-level events

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:18:30.000Z",
  "eventId": "EVT_987654321",
  "eventType": "configuration_change",
  "severity": "info",
  "message": "Gateway configuration updated",
  "details": {
    "changedBy": "admin",
    "changedConfig": "mqtt_settings",
    "oldValues": {
      "broker": "mqtt://old-broker:1883"
    },
    "newValues": {
      "broker": "mqtt://new-broker:1883"
    }
  },
  "impact": "service_restart_required"
}
```

**Fields**:

- `deviceId`: Gateway device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Event timestamp
- `eventId`: Unique event identifier
- `eventType`: Type of system event
- `severity`: Event severity
- `message`: Event message
- `details`: Additional event details
- `impact`: Impact of the event

### 6. Query Response Messages

**Purpose**: Response to on-demand queries

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:18:45.000Z",
  "queryType": "QRY_SENSORS",
  "queryId": "req_345678",
  "responseData": {
    "totalSensors": 24,
    "activeSensors": 22,
    "sensorsByType": {
      "TEMP_HUM": 8,
      "NOISE": 6,
      "DOOR": 5,
      "RFID": 5
    },
    "sensorsByDevice": [
      {
        "deviceId": "V5008-2437871205",
        "sensorCount": 4,
        "status": "online"
      }
    ]
  }
}
```

**Fields**:

- `deviceId`: Gateway device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Response timestamp
- `queryType`: Type of query being responded to
- `queryId`: Original query identifier
- `responseData`: Response data specific to query type

### 7. Command Messages

**Purpose**: Commands sent to gateway

**JSON Format**:

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:19:00.000Z",
  "command": "SET_CONFIG",
  "commandId": "cmd_456789",
  "parameters": {
    "configSection": "mqtt",
    "settings": {
      "reconnectInterval": 5000,
      "maxRetries": 10,
      "keepAlive": 60
    },
    "applyImmediately": true,
    "restartRequired": false
  }
}
```

**Fields**:

- `deviceId`: Gateway device identifier
- `deviceType`: Always "G6000"
- `timestamp`: Command timestamp
- `command`: Command type
- `commandId`: Unique command identifier
- `parameters`: Command-specific parameters

## Error Handling

### Error Message Format

```json
{
  "deviceId": "G6000-0012345678",
  "deviceType": "G6000",
  "timestamp": "2025-11-30T05:19:15.000Z",
  "error": {
    "code": "COMMUNICATION_FAILURE",
    "message": "Failed to connect to MQTT broker",
    "severity": "error",
    "source": "mqtt_client",
    "details": {
      "broker": "mqtt://broker:1883",
      "lastAttempt": "2025-11-30T05:19:10.000Z",
      "retryCount": 3
    },
    "recoveryAction": "auto_retry"
  }
}
```

### Common Error Codes

| Error Code              | Description                    |
| ----------------------- | ------------------------------ |
| `COMMUNICATION_FAILURE` | Communication protocol failure |
| `DEVICE_OVERLOAD`       | Gateway processing overload    |
| `CONFIGURATION_ERROR`   | Invalid configuration          |
| `SENSOR_MALFUNCTION`    | Sensor malfunction detected    |
| `DATA_CORRUPTION`       | Data integrity issues          |
| `SERVICE_UNAVAILABLE`   | Required service not available |
| `RESOURCE_EXHAUSTED`    | System resources exhausted     |
| `SECURITY_BREACH`       | Security violation detected    |

## G6000 Specific Features

### Gateway Capabilities

- Data aggregation from multiple device types
- Protocol translation and routing
- Local data processing and filtering
- Alert management and notification

### High Availability Features

- Redundant communication paths
- Automatic failover mechanisms
- Data buffering during outages
- Health monitoring

### Security Features

- Encrypted communication support
- Access control and authentication
- Audit logging
- Intrusion detection

### Performance Features

- Data compression and optimization
- Intelligent caching
- Load balancing
- Resource management

## Implementation Notes

1. **Timestamp Format**: All timestamps should be in ISO 8601 format (UTC)
2. **Device Identification**: G6000 devices use prefix "G6000-" followed by unique identifier
3. **Message Validation**: All messages should include required fields for their type
4. **Error Recovery**: Gateway should implement robust error recovery mechanisms
5. **Heartbeat Frequency**: Recommended heartbeat interval is 60 seconds
6. **Data Aggregation**: Gateway should support configurable aggregation periods
7. **Alert Management**: Gateway should track alert lifecycle (creation, acknowledgment, resolution)

## Parser Implementation

The G6000Parser class in the IoT Middleware V5 system handles these message formats:

1. **Topic Validation**: Validates topic format `G6000Upload/{deviceId}/{messageClass}`
2. **Message Parsing**: Parses JSON messages and validates required fields
3. **Error Handling**: Provides meaningful error messages for malformed messages
4. **Data Extraction**: Extracts gateway information, sensor data, and metadata
5. **Aggregation Support**: Handles aggregated sensor data from multiple sources

For more details on parser implementation, see [`src/modules/normalizer/parsers/G6000Parser.js`](src/modules/normalizer/parsers/G6000Parser.js).
