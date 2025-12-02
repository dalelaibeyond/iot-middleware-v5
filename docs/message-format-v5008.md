# V5008 Device Message Format and Normalization Specification

## Overview

This document describes the complete message format and normalization specification for V5008 IoT devices used in the IoT Middleware V5 system. The V5008 device supports up to 5 U-Sensor modules and communicates via MQTT using binary message protocols that require hex string conversion.

## Protocol Specifications

### Message Format Description

- V5008 MQTT raw message is a string of byte code, converted to hex strings using: `const rawHexString = message.toString("hex").toUpperCase();`
- 1 byte = 2 hex characters
- Multi-byte values noted as (`nB`)
- Repeated groups are indicated by `xN`
- Temperature/Humidity/Noise values: `integer.fraction` format
- Valid modNum: 1-5

### MQTT Topic Structure

#### Upload Topics (Device to Server)

```
V5008Upload/{deviceId}/{messageClass}
```

#### Download Topics (Server to Device)

```
V5008Download/{deviceId}
```

### Parameters

- **deviceId**: Unique identifier for V5008 device
- **messageClass**: Type of message being sent

## Message Types and Binary Formats

| Sensor Type | Message Type     | Topic Format                        | Binary Message Format                                                                                        | Description                         | Frequency                         |
| ----------- | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------- |
| `DEVICE`    | `HEARTBEAT`      | `V5008Upload/{deviceId}/OpeAck`     | `[CB/CC] ([modNum + modId(4B) + uCount] x 10) [msgId(4B)]`                                                   | Device heartbeat signal             | Periodic (e.g., every 60 seconds) |
| `U_SENSOR`  | `RFID`           | `V5008Upload/{deviceId}/LabelState` | `[BB][modNum][modId(4B)][reserve][uCount][rfidCount] ([num+ alarm + rfid(4B)] x rfidCount) [msgId(4B)]`      | RFID tag detection events           | Event-driven or on-demand         |
| `TH_SENSOR` | `TEMP_HUM`       | `V5008Upload/{deviceId}/TemHum`     | `[modNum][modId(4B)] ([add + temp(4B) + hum(4B)] x 6) [msgId(4B)]`                                           | Temperature and humidity readings   | Event-driven or on-demand         |
| `NS_SENSOR` | `NOISE`          | `V5008Upload/{deviceId}/Noise`      | `[modNum][modId(4B)] ([add + noise(4B)] x 3) [msgId(4B)]`                                                    | Noise level measurements            | Event-driven or on-demand         |
| `DR_SENSOR` | `DOOR`           | `V5008Upload/{deviceId}/OpeAck`     | `[BA][modNum][modId(4B)][status] [msgId(4B)]`                                                                | Door open/close events              | Event-driven or on-demand         |
| `U_SENSOR`  | `QRY_RFID`       | `V5008Upload/{deviceId}/LabelState` | same as `RFID`                                                                                               | RFID query response                 | On-demand                         |
| `TH_SENSOR` | `QRY_TEMP_HUM`   | `V5008Upload/{deviceId}/TemHum`     | same as `TEMP_HUM`                                                                                           | Temperature/humidity query response | On-demand                         |
| `NS_SENSOR` | `QRY_NOISE`      | `V5008Upload/{deviceId}/Noise`      | same as `NOISE`                                                                                              | Noise level query response          | On-demand                         |
| `DR_SENSOR` | `QRY_DOOR_STATE` | `V5008Upload/{deviceId}/OpeAck`     | same as `DOOR`                                                                                               | Door state query response           | On-demand                         |
| `DEVICE`    | `QRY_DEVICE`     | `V5008Upload/{deviceId}/OpeAck`     | `[EF][01][deviceType(2B)][fwVersion(4B)][ip(4B)][mask(4B)][gateway(4B)][mac(6B)][msgId(4B)]`                 | Device information query response   | On-demand                         |
| `MODULE`    | `QRY_MODULE`     | `V5008Upload/{deviceId}/OpeAck`     | `[EF][02] ([modNum + fwVersion(6B)] x N) [msgId(4B)]`                                                        | Module information query response   | On-demand                         |
| `U_SENSOR`  | `QRY_COLOR`      | `V5008Upload/{deviceId}/OpeAck`     | `[AA][deviceId(4B)][cmdResult][E4][modNum]([colorCode] x n) [msgId(4B)]`                                     | U color query response              | On-demand                         |
| `U_SENSOR`  | `SET_COLOR`      | `V5008Upload/{deviceId}/OpeAck`     | `[AA][deviceId(4B)][cmdResult][cmdString(nB)][msgId(4B)]`<br>cmdString - `[E1][modNum]([num][colorCode]...)` | U color setting command response    | On-demand                         |
| `U_SENSOR`  | `CLR_ALARM`      | `V5008Upload/{deviceId}/OpeAck`     | `[AA][deviceId(4B)][cmdResult][cmdString(nB)][msgId(4B)]`<br>cmdString - `[E2][modNum][num]...`              | Alarm clear command response        | On-demand                         |

## Query Commands

| Command          | Topic Format               | Description                    | Response Message |
| ---------------- | -------------------------- | ------------------------------ | ---------------- |
| `[E901][modNum]` | `V5008Download/{deviceId}` | Query RFID tag                 | `RFID`           |
| `[E902][modNum]` | `V5008Download/{deviceId}` | Query temperature and humidity | `TEMP_HUM`       |
| `[E903][modNum]` | `V5008Download/{deviceId}` | Query door open/close state    | `DOOR`           |
| `[E904][modNum]` | `V5008Download/{deviceId}` | Query noise level              | `NOISE`          |
| `[EF0100]`       | `V5008Download/{deviceId}` | Query device information       | `QRY_DEVICE`     |
| `[EF0200]`       | `V5008Download/{deviceId}` | Query module information       | `QRY_MODULE`     |
| `[E4][modNum]`   | `V5008Download/{deviceId}` | Query U color                  | `QRY_COLOR`      |

## Set Commands

| Command                         | Topic Format               | Description | Response    |
| ------------------------------- | -------------------------- | ----------- | ----------- |
| `E1[modNum]([num][color]) x n)` | `V5008Download/{deviceId}` | Set U color | `SET_COLOR` |
| `E2[modNum][num] x n`           | `V5008Download/{deviceId}` | Clear alarm | `CLR_ALARM` |

## Field Descriptions

| Field Name   | Description                                    |
| ------------ | ---------------------------------------------- |
| `deviceId`   | Device ID                                      |
| `deviceType` | "V5008", "V6800", "G6000"                      |
| `modNum`     | Module ADD, ADD is to address module by device |
| `modId`      | Module ID                                      |
| `sensorType` | Sensor type                                    |
| `msgType`    | Message type                                   |
| `uCount`     | U sensor count, U is rack or cabinet unit      |
| `rfidCount`  | RFID tag count                                 |
| `num`        | Position number of U Sensor                    |
| `alarm`      | U sensor alarm                                 |
| `rfid`       | RFID tag                                       |
| `add`        | Sensor ADD                                     |
| `temp`       | Temperature value                              |
| `hum`        | Humidity value                                 |
| `msgId`      | Message ID                                     |

---

# V5008 PARSER SPECIFICATION

## Overview

This section specifies how the V5008Parser class should parse raw binary MQTT messages into intermediate JSON format. The parser is responsible for converting hex strings to structured data according to the binary protocol specifications.

## Parser Implementation Requirements

### 1. Message Conversion

```javascript
const rawHexString = message.toString('hex').toUpperCase();
```

### 2. Binary Protocol Parsing

#### HEARTBEAT Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[CB/CC] ([modNum + modId(4B) + uCount] x 10) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-13T06:55:41.683Z",
  "rawMessage": "CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F",
  "data": {
    "msgType": "HEARTBEAT",
    "modules": [
      { "modNum": 1, "modId": "3963041727", "uCount": 6 },
      { "modNum": 2, "modId": "2349402517", "uCount": 12 }
    ],
    "msgId": 4060092047
  }
}
```

#### RFID Message Parsing

**Topic**: `V5008Upload/{deviceId}/LabelState`
**Binary Format**: `[BB][modNum][modId(4B)][reserve][uCount][rfidCount] ([num+ alarm + rfid(4B)] x rfidCount) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "LabelState",
  "timestamp": "2025-11-13T03:20:43.142Z",
  "rawMessage": "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD",
  "data": {
    "msgType": "RFID",
    "modNum": 2,
    "modId": "2349402517",
    "uCount": 12,
    "rfidCount": 3,
    "rfidData": [
      { "num": 10, "alarm": 0, "rfid": "DD344A44" },
      { "num": 11, "alarm": 0, "rfid": "DD2862B4" },
      { "num": 12, "alarm": 0, "rfid": "DD3CE9C4" }
    ],
    "msgId": 83888045
  }
}
```

#### TEMP_HUM Message Parsing

**Topic**: `V5008Upload/{deviceId}/TemHum`
**Binary Format**: `[modNum][modId(4B)] ([add + temp(4B) + hum(4B)] x 6) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "TemHum",
  "timestamp": "2025-11-13T07:04:52.951Z",
  "rawMessage": "01EC3737BF0A1C30331B0B1C08330B0C000000000D000000000E000000000F0000000001012CC3",
  "data": {
    "msgType": "TEMP_HUM",
    "modNum": 1,
    "modId": "3963041727",
    "sensors": [
      { "add": 10, "temp": 28.48, "hum": 51.27 },
      { "add": 11, "temp": 28.08, "hum": 51.11 },
      { "add": 12, "temp": 0, "hum": 0 },
      { "add": 13, "temp": 0, "hum": 0 },
      { "add": 14, "temp": 0, "hum": 0 },
      { "add": 15, "temp": 0, "hum": 0 }
    ],
    "msgId": 16854211
  }
}
```

#### NOISE Message Parsing

**Topic**: `V5008Upload/{deviceId}/Noise`
**Binary Format**: `[modNum][modId(4B)] ([add + noise(4B)] x 3) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "Noise",
  "timestamp": "2025-11-17T06:17:31.835Z",
  "rawMessage": "01EC3737BF100000000011000000001200000000D500EBD7",
  "data": {
    "msgType": "NOISE",
    "modNum": 1,
    "modId": "3963041727",
    "sensors": [
      { "add": 16, "noise": 0 },
      { "add": 17, "noise": 0 },
      { "add": 18, "noise": 0 }
    ],
    "msgId": 3573607383
  }
}
```

#### DOOR Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[BA][modNum][modId(4B)][status] [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-13T07:08:26.795Z",
  "rawMessage": "BA01EC3737BF010B01C7F8",
  "data": {
    "msgType": "DOOR",
    "modNum": 1,
    "modId": "3963041727",
    "status": 1,
    "msgId": 184666104
  }
}
```

#### QRY_DEVICE Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[EF][01][deviceType(2B)][fwVersion(4B)][ip(4B)][mask(4B)][gateway(4B)][mac(6B)][msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-14T09:51:29.748Z",
  "rawMessage": "EF011390958DD85FC0A800D3FFFF0000C0A800018082914EF665F2011CCB",
  "data": {
    "msgType": "QRY_DEVICE",
    "deviceType": "V5008",
    "fwVersion": "2509101151",
    "ip": "192.168.0.211",
    "mask": "255.255.0.0",
    "gateway": "192.168.0.1",
    "mac": "80:82:91:4E:F6:65",
    "msgId": 4060159179
  }
}
```

#### QRY_MODULE Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[EF][02] ([modNum + fwVersion(6B)] x N) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-14T09:52:14.315Z",
  "rawMessage": "EF02010000898393CC020000898393CCF4010166",
  "data": {
    "msgType": "QRY_MODULE",
    "modules": [
      { "add": 1, "fwVersion": "2307101644" },
      { "add": 2, "fwVersion": "2307101644" }
    ],
    "msgId": 4093706598
  }
}
```

#### QRY_COLOR Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[AA][deviceId(4B)][cmdResult][E4][modNum]([colorCode] x n) [msgId(4B)]`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-14T07:02:38.423Z",
  "rawMessage": "AA914EF665A1E4010000000D0D0825015D4C",
  "data": {
    "msgType": "QRY_COLOR",
    "cmdResult": "success",
    "modNum": 1,
    "colors": [
      { "num": 1, "colorCode": 0 },
      { "num": 2, "colorCode": 0 },
      { "num": 3, "colorCode": 0 },
      { "num": 4, "colorCode": 13 },
      { "num": 5, "colorCode": 13 },
      { "num": 6, "colorCode": 8 }
    ],
    "msgId": 620846412
  }
}
```

#### SET_COLOR Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[AA][deviceId(4B)][cmdResult][cmdString(nB)][msgId(4B)]`<br>cmdString - `[E1][modNum]([num][colorCode]...)`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-17T03:56:10.776Z",
  "rawMessage": "AA914EF665A1E101050206012B002316",
  "data": {
    "msgType": "SET_COLOR",
    "cmdResult": "success",
    "modNum": 1,
    "colors": [
      { "num": 5, "colorCode": 2 },
      { "num": 6, "colorCode": 1 }
    ],
    "msgId": 721429270
  }
}
```

#### CLR_ALARM Message Parsing

**Topic**: `V5008Upload/{deviceId}/OpeAck`
**Binary Format**: `[AA][deviceId(4B)][cmdResult][cmdString(nB)][msgId(4B)]`<br>cmdString - `[E2][modNum][num]...`

**Parser Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "OpeAck",
  "timestamp": "2025-11-17T05:50:43.078Z",
  "rawMessage": "AA914EF665A1E2010605AC009ECF",
  "data": {
    "msgType": "CLR_ALARM",
    "cmdResult": "success",
    "modNum": 1,
    "nums": [6, 5],
    "msgId": 2885721807
  }
}
```

### 3. Parser Implementation Guidelines

The V5008Parser class should implement:

1. **Hex String Conversion**: Convert raw MQTT messages to hex strings
2. **Binary Protocol Parsing**: Parse hex strings according to message format specifications
3. **Field Validation**: Validate all required fields are present and correctly formatted
4. **Error Handling**: Provide meaningful error messages for malformed messages
5. **Data Type Conversion**: Convert binary values to appropriate JavaScript types
6. **Message Type Detection**: Determine message type from topic and binary headers

---

# V5008 NORMALIZER SPECIFICATION

## Overview

This section specifies how the UnifiedNormalizer class should transform the parsed data from V5008Parser into the final normalized JSON format. The normalizer is responsible for state management, comparison logic, and creating standardized message structures.

## Normalization Implementation Requirements

### 1. Input Data Structure

The normalizer receives parsed data from V5008Parser in this format:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "messageClass": "LabelState",
  "timestamp": "2025-11-13T03:20:43.142Z",
  "rawMessage": "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD",
  "data": {
    "msgType": "RFID",
    "modNum": 2,
    "modId": "2349402517",
    "uCount": 12,
    "rfidCount": 3,
    "rfidData": [...]
  }
}
```

### 2. State Management

The normalizer must maintain previous state for each device to enable comparison logic:

```javascript
// Store previous device state
this.deviceHistory.set(deviceId, previousParsedData);

// Retrieve previous state for comparison
const previousState = this.deviceHistory.get(deviceId);
```

### 3. Normalization Logic

#### HEARTBEAT Message Normalization

**Input**: Parsed HEARTBEAT data from parser
**Output**: Standardized heartbeat format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "DEVICE",
  "msgType": "HEARTBEAT",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-13T06:55:41.683Z",
  "payload": [
    { "modNum": 1, "modId": "3963041727", "uCount": 6 },
    { "modNum": 2, "modId": "2349402517", "uCount": 12 }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F",
    "msgId": 4060092047
  }
}
```

#### RFID Message Normalization

**Input**: Parsed RFID data from parser
**Logic**: Compare with previous state to determine attach/detach actions

**Example Previous State**:

```json
{ "num": 12, "alarm": 0, "rfid": "DD3CE9C4" }
```

**Example Current State**:

```json
{ "num": 10, "alarm": 0, "rfid": "DD344A44" },
{ "num": 11, "alarm": 0, "rfid": "DD2862B4" },
{ "num": 12, "alarm": 0, "rfid": "DD3CE9C4" }
```

**Normalized Output (RFID Attached)**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "RFID",
  "modNum": 2,
  "modId": "2349402517",
  "ts": "2025-11-13T03:20:43.142Z",
  "payload": [
    { "num": 10, "alarm": 0, "rfid": "DD344A44", "action": "attached" },
    { "num": 11, "alarm": 0, "rfid": "DD2862B4", "action": "attached" }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/LabelState",
    "rawHexString": "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD",
    "msgId": 83888045
  }
}
```

**Normalized Output (RFID Detached)**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "RFID",
  "modNum": 2,
  "modId": "2349402517",
  "ts": "2025-11-13T03:20:43.142Z",
  "payload": [{ "num": 9, "alarm": 0, "rfid": "DD344A55", "action": "detached" }],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/LabelState",
    "rawHexString": "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD",
    "msgId": 83888045
  }
}
```

**Normalized Output (QRY_RFID)**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "QRY_RFID",
  "modNum": 2,
  "modId": "2349402517",
  "ts": "2025-11-13T03:20:43.142Z",
  "payload": {
    "uCount": 12,
    "rfidCount": 3,
    "rfidData": [
      { "num": 10, "alarm": 0, "rfid": "DD344A44" },
      { "num": 11, "alarm": 0, "rfid": "DD2862B4" },
      { "num": 12, "alarm": 0, "rfid": "DD3CE9C4" }
    ]
  },
  "meta": {
    "rawTopic": "V5008Upload/2437871205/LabelState",
    "rawHexString": "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD",
    "msgId": 83888045
  }
}
```

#### TEMP_HUM Message Normalization

**Input**: Parsed TEMP_HUM data from parser
**Output**: Standardized temperature/humidity format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "TH_SENSOR",
  "msgType": "TEMP_HUM",
  "modNum": 1,
  "modId": "3963041727",
  "ts": "2025-11-13T07:04:52.951Z",
  "payload": [
    { "add": 10, "temp": 28.48, "hum": 51.27 },
    { "add": 11, "temp": 28.08, "hum": 51.11 },
    { "add": 12, "temp": 0, "hum": 0 },
    { "add": 13, "temp": 0, "hum": 0 },
    { "add": 14, "temp": 0, "hum": 0 },
    { "add": 15, "temp": 0, "hum": 0 }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/TemHum",
    "rawHexString": "01EC3737BF0A1C30331B0B1C08330B0C000000000D000000000E000000000F0000000001012CC3",
    "msgId": 16854211
  }
}
```

#### NOISE Message Normalization

**Input**: Parsed NOISE data from parser
**Output**: Standardized noise format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "NS_SENSOR",
  "msgType": "NOISE",
  "modNum": 1,
  "modId": "3963041727",
  "ts": "2025-11-17T06:17:31.835Z",
  "payload": [
    { "add": 16, "noise": 0 },
    { "add": 17, "noise": 0 },
    { "add": 18, "noise": 0 }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/Noise",
    "rawHexString": "01EC3737BF100000000011000000001200000000D500EBD7",
    "msgId": 3573607383
  }
}
```

#### DOOR Message Normalization

**Input**: Parsed DOOR data from parser
**Logic**: Convert status byte to door state based on door type

**Parser Input**:

```json
{
  "data": {
    "msgType": "DOOR",
    "modNum": 1,
    "modId": "3963041727",
    "status": 1,
    "msgId": 184666104
  }
}
```

**Normalized Output (Single Door)**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "DR_SENSOR",
  "msgType": "DOOR",
  "modNum": 1,
  "modId": "3963041727",
  "ts": "2025-11-13T07:08:26.795Z",
  "payload": {
    "doorType": "single",
    "firstDoor": "open",
    "secondDoor": null
  },
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "BA01EC3737BF010B01C7F8",
    "msgId": 184666104
  }
}
```

**Door State Mapping**:

- **Single Door Type:**
  - `01`: open
  - `00`: closed
- **Dual Door Type:**
  - `00`: Both doors closed
  - `01`: First door closed, second door open
  - `10`: First door open, second door closed
  - `11`: Both doors open

#### QRY_DEVICE Message Normalization

**Input**: Parsed QRY_DEVICE data from parser
**Output**: Standardized device information format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "DEVICE",
  "msgType": "QRY_DEVICE",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-14T09:51:29.748Z",
  "payload": {
    "fwVersion": "2509101151",
    "ip": "192.168.0.211",
    "mask": "255.255.0.0",
    "gateway": "192.168.0.1",
    "mac": "80:82:91:4E:F6:65"
  },
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "EF011390958DD85FC0A800D3FFFF0000C0A800018082914EF665F2011CCB",
    "msgId": 4060159179
  }
}
```

#### QRY_MODULE Message Normalization

**Input**: Parsed QRY_MODULE data from parser
**Output**: Standardized module information format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "MODULE",
  "msgType": "QRY_MODULE",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-14T09:52:14.315Z",
  "payload": [
    { "add": 1, "fwVersion": "2307101644" },
    { "add": 2, "fwVersion": "2307101644" }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "EF02010000898393CC020000898393CCF4010166",
    "msgId": 4093706598
  }
}
```

#### QRY_COLOR Message Normalization

**Input**: Parsed QRY_COLOR data from parser
**Logic**: Convert color codes to human-readable names

**Parser Input**:

```json
{
  "data": {
    "msgType": "QRY_COLOR",
    "cmdResult": "success",
    "modNum": 1,
    "colors": [
      { "num": 1, "colorCode": 0 },
      { "num": 2, "colorCode": 0 },
      { "num": 3, "colorCode": 0 },
      { "num": 4, "colorCode": 13 },
      { "num": 5, "colorCode": 13 },
      { "num": 6, "colorCode": 8 }
    ],
    "msgId": 620846412
  }
}
```

**Normalized Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "QRY_COLOR",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-14T07:02:38.423Z",
  "payload": [
    { "num": 1, "color": "off" },
    { "num": 2, "color": "off" },
    { "num": 3, "color": "off" },
    { "num": 4, "color": "blue_f" },
    { "num": 5, "color": "blue_f" },
    { "num": 6, "color": "red_f" }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "AA914EF665A1E4010000000D0D0825015D4C",
    "msgId": 620846412,
    "result": "success"
  }
}
```

#### SET_COLOR Message Normalization

**Input**: Parsed SET_COLOR data from parser
**Logic**: Convert color codes to human-readable names

**Normalized Output**:

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "SET_COLOR",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-17T03:56:10.776Z",
  "payload": [
    { "num": 5, "color": "purple" },
    { "num": 6, "color": "red" }
  ],
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "AA914EF665A1E101050206012B002316",
    "msgId": 721429270,
    "result": "success"
  }
}
```

#### CLR_ALARM Message Normalization

**Input**: Parsed CLR_ALARM data from parser
**Output**: Standardized alarm clear format

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "U_SENSOR",
  "msgType": "CLR_ALARM",
  "modNum": null,
  "modId": null,
  "ts": "2025-11-17T05:50:43.078Z",
  "payload": {
    "modNum": 1,
    "num": [6, 5]
  },
  "meta": {
    "rawTopic": "V5008Upload/2437871205/OpeAck",
    "rawHexString": "AA914EF665A1E2010605AC009ECF",
    "msgId": 2885721807,
    "result": "success"
  }
}
```

### 4. Color Code Mapping

The normalizer must convert color codes to human-readable names:

| Color Code | Color Name     | Flash Code          |
| ---------- | -------------- | ------------------- |
| 0          | Off            |                     |
| 1          | Red            | 8                   |
| 2          | Purple         | 9                   |
| 3          | Yellow         | A                   |
| 4          | Green          | B                   |
| 5          | Cyan           | C                   |
| 6          | Blue           | D                   |
| 7          | White          | E (not recommended) |
| 8          | Red (flash)    |                     |
| 9          | Purple (flash) |                     |
| 10         | Yellow (flash) |                     |
| 11         | Green (flash)  |                     |
| 12         | Cyan (flash)   |                     |
| 13         | Blue (flash)   |                     |
| 14         | White (flash)  |                     |

### 5. Command Result Codes

| Code | Result  |
| ---- | ------- |
| 0xA0 | Failure |
| 0xA1 | Success |

### 6. Normalizer Implementation Guidelines

The UnifiedNormalizer class should implement:

1. **State Management**: Maintain previous state for each device for comparison
2. **Message Type Detection**: Determine appropriate normalization logic based on parser data.msgType
3. **Comparison Logic**: Compare current data with previous state for event detection
4. **Format Standardization**: Convert all data to consistent JSON structure
5. **Color Code Mapping**: Convert color codes to human-readable names
6. **Door State Logic**: Handle both single and dual door configurations
7. **Multiple Message Creation**: Create multiple normalized messages from single parser output when needed
8. **Error Handling**: Provide meaningful error messages for normalization failures

## Implementation Notes

1. **Timestamp Format**: All timestamps should be in ISO 8601 format (UTC)
2. **Module Numbers**: V5008 supports modules numbered 1-5
3. **Message Validation**: All messages should include required fields for their type
4. **State Comparison**: RFID messages require comparison with previous state to determine attach/detach actions
5. **Color Mapping**: Implement proper color code to name mapping for U-Sensor LEDs
6. **Door Type**: Default is "single" but can be configured via admin interface
7. **Error Recovery**: Devices should send error messages for any failure conditions
8. **Heartbeat Frequency**: Recommended heartbeat interval is 60 seconds
9. **Data Types**: All numeric values should use appropriate precision

For more details on parser implementation, see [`src/modules/normalizer/parsers/V5008Parser.js`](src/modules/normalizer/parsers/V5008Parser.js).
For more details on normalizer implementation, see [`src/modules/normalizer/UnifiedNormalizer.js`](src/modules/normalizer/UnifiedNormalizer.js).
