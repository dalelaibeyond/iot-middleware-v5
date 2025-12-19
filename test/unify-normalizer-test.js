/**
 * Test file for UnifyNormalizer.js
 * Tests the normalization of V5008 and V6800 parsed messages
 */

import { strict as assert } from 'assert';
import UnifyNormalizer from '../src/modules/normalizer/UnifyNormalizer.js';
import V5008Parser from '../src/modules/normalizer/parsers/V5008Parser.js';
import V6800Parser from '../src/modules/normalizer/parsers/V6800Parser.js';

// Test data for V5008 messages
const V5008_TEST_MESSAGES = {
  HEARTBEAT: {
    topic: "V5008Upload/2437871205/OpeAck",
    message: "CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F"
  },
  RFID: {
    topic: "V5008Upload/2437871205/LabelState",
    message: "BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD"
  },
  TEMPHUM: {
    topic: "V5008Upload/2437871205/TemHum",
    message: "01EC3737BF0A1C30331B0B1C08330B0C000000000D000000000E000000000F0000000001012CC3"
  },
  NOISE: {
    topic: "V5008Upload/2437871205/Noise",
    message: "01EC3737BF100000000011000000001200000000D500EBD7"
  },
  DOOR: {
    topic: "V5008Upload/2437871205/OpeAck",
    message: "BA01EC3737BF010B01C7F8"
  }
};

// Test data for V6800 messages
const V6800_TEST_MESSAGES = {
  HEARTBEAT: {
    topic: "V6800Upload/2123456789/HeartBeat",
    message: JSON.stringify({
      "msg_type": "heart_beat_req",
      "module_type": "mt_gw",
      "module_sn": "2123456789",
      "bus_V": "23.89",
      "bus_I": "5.70",
      "main_power": 1,
      "backup_power": 0,
      "uuid_number": 1534195387,
      "data": [
        { "module_index": 2, "module_sn": "3963041727", "module_m_num": 1, "module_u_num": 6 },
        { "module_index": 4, "module_sn": "2349402517", "module_m_num": 2, "module_u_num": 12 }
      ]
    })
  },
  RFID: {
    topic: "V6800Upload/2123456789/LabelState",
    message: JSON.stringify({
      "msg_type": "u_state_changed_notify_req",
      "gateway_sn": "2123456789",
      "uuid_number": 727046823,
      "data": [
        {
          "host_gateway_port_index": 2,
          "extend_module_sn": "3963041727",
          "u_data": [
            { "u_index": 3, "new_state": 1, "old_state": 0, "tag_code": "DD23B0B4", "warning": 0 },
            { "u_index": 1, "new_state": 0, "old_state": 1, "tag_code": "DD395064", "warning": 0 }
          ]
        }
      ]
    })
  },
  TEMPHUM: {
    topic: "V6800Upload/2123456789/TemHum",
    message: JSON.stringify({
      "msg_type": "temper_humidity_exception_nofity_req",
      "gateway_sn": "2123456789",
      "uuid_number": 685205293,
      "data": [
        {
          "host_gateway_port_index": 2,
          "extend_module_sn": "3963041727",
          "th_data": [
            { "temper_position": 10, "temper_swot": 28.79, "hygrometer_swot": 53.79 },
            { "temper_position": 12, "temper_swot": 0, "hygrometer_swot": 0 }
          ]
        }
      ]
    })
  },
  DOOR: {
    topic: "V6800Upload/2123456789/Door",
    message: JSON.stringify({
      "msg_type": "door_state_changed_notify_req",
      "gateway_sn": "2123456789",
      "uuid_number": 333321551,
      "data": [
        { "extend_module_sn": "3963041727", "host_gateway_port_index": 2, "new_state": 1 }
      ]
    })
  },
  INIT: {
    topic: "V6800Upload/2123456789/Init",
    message: JSON.stringify({
      "msg_type": "devies_init_req",
      "gateway_sn": "2123456789",
      "gateway_ip": "192.168.0.212",
      "gateway_mac": "08:80:7E:...",
      "uuid_number": 797991388,
      "data": [
        { "module_index": 2, "module_sn": "3963041727", "module_u_num": 6, "module_sw_version": "2307101644" }
      ]
    })
  }
};

/**
 * Test V5008 message normalization
 */
function testV5008Normalization() {
  console.log('\n=== Testing V5008 Normalization ===');
  
  const parser = new V5008Parser();
  const normalizer = new UnifyNormalizer();
  
  // Test HEARTBEAT
  console.log('\nTesting V5008 HEARTBEAT...');
  const v5008HeartbeatParsed = parser.parse(V5008_TEST_MESSAGES.HEARTBEAT.topic, Buffer.from(V5008_TEST_MESSAGES.HEARTBEAT.message, 'hex'));
  const v5008HeartbeatNormalized = normalizer.normalize(v5008HeartbeatParsed);
  
  console.log('Normalized HEARTBEAT objects:', v5008HeartbeatNormalized.length);
  v5008HeartbeatNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Device: ${obj.identity.deviceId}, Module: ${obj.identity.modAddr}`);
  });
  
  // Test RFID
  console.log('\nTesting V5008 RFID...');
  const v5008RfidParsed = parser.parse(V5008_TEST_MESSAGES.RFID.topic, Buffer.from(V5008_TEST_MESSAGES.RFID.message, 'hex'));
  const v5008RfidNormalized = normalizer.normalize(v5008RfidParsed);
  
  console.log('Normalized RFID objects:', v5008RfidNormalized.length);
  v5008RfidNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Device: ${obj.identity.deviceId}, Module: ${obj.identity.modAddr}`);
    if (obj.type === 'SYS_RFID_EVENT') {
      console.log(`  Action: ${obj.payload.value.action}, Tag: ${obj.payload.value.tagId}`);
    }
  });
  
  // Test TEMPHUM
  console.log('\nTesting V5008 TEMPHUM...');
  const v5008TemphumParsed = parser.parse(V5008_TEST_MESSAGES.TEMPHUM.topic, Buffer.from(V5008_TEST_MESSAGES.TEMPHUM.message, 'hex'));
  const v5008TemphumNormalized = normalizer.normalize(v5008TemphumParsed);
  
  console.log('Normalized TEMPHUM objects:', v5008TemphumNormalized.length);
  v5008TemphumNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Key: ${obj.payload.key}, Value: ${obj.payload.value}`);
  });
  
  // Test NOISE
  console.log('\nTesting V5008 NOISE...');
  const v5008NoiseParsed = parser.parse(V5008_TEST_MESSAGES.NOISE.topic, Buffer.from(V5008_TEST_MESSAGES.NOISE.message, 'hex'));
  const v5008NoiseNormalized = normalizer.normalize(v5008NoiseParsed);
  
  console.log('Normalized NOISE objects:', v5008NoiseNormalized.length);
  v5008NoiseNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Key: ${obj.payload.key}, Value: ${obj.payload.value}`);
  });
  
  // Test DOOR
  console.log('\nTesting V5008 DOOR...');
  const v5008DoorParsed = parser.parse(V5008_TEST_MESSAGES.DOOR.topic, Buffer.from(V5008_TEST_MESSAGES.DOOR.message, 'hex'));
  const v5008DoorNormalized = normalizer.normalize(v5008DoorParsed);
  
  console.log('Normalized DOOR objects:', v5008DoorNormalized.length);
  v5008DoorNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Key: ${obj.payload.key}, State: ${obj.payload.value.state}`);
  });
}

/**
 * Test V6800 message normalization
 */
function testV6800Normalization() {
  console.log('\n=== Testing V6800 Normalization ===');
  
  const parser = new V6800Parser();
  const normalizer = new UnifyNormalizer();
  
  // Test HEARTBEAT
  console.log('\nTesting V6800 HEARTBEAT...');
  const v6800HeartbeatParsed = parser.parse(V6800_TEST_MESSAGES.HEARTBEAT.topic, V6800_TEST_MESSAGES.HEARTBEAT.message);
  const v6800HeartbeatNormalized = normalizer.normalize(v6800HeartbeatParsed);
  
  console.log('Normalized HEARTBEAT objects:', v6800HeartbeatNormalized.length);
  v6800HeartbeatNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Device: ${obj.identity.deviceId}, Key: ${obj.payload.key}`);
  });
  
  // Test RFID
  console.log('\nTesting V6800 RFID...');
  const v6800RfidParsed = parser.parse(V6800_TEST_MESSAGES.RFID.topic, V6800_TEST_MESSAGES.RFID.message);
  const v6800RfidNormalized = normalizer.normalize(v6800RfidParsed);
  
  console.log('Normalized RFID objects:', v6800RfidNormalized.length);
  v6800RfidNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Device: ${obj.identity.deviceId}, Module: ${obj.identity.modAddr}`);
    if (obj.type === 'SYS_RFID_EVENT') {
      console.log(`  Action: ${obj.payload.value.action}, Tag: ${obj.payload.value.tagId}`);
    }
  });
  
  // Test TEMPHUM
  console.log('\nTesting V6800 TEMPHUM...');
  const v6800TemphumParsed = parser.parse(V6800_TEST_MESSAGES.TEMPHUM.topic, V6800_TEST_MESSAGES.TEMPHUM.message);
  const v6800TemphumNormalized = normalizer.normalize(v6800TemphumParsed);
  
  console.log('Normalized TEMPHUM objects:', v6800TemphumNormalized.length);
  v6800TemphumNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Key: ${obj.payload.key}, Value: ${obj.payload.value}`);
  });
  
  // Test DOOR
  console.log('\nTesting V6800 DOOR...');
  const v6800DoorParsed = parser.parse(V6800_TEST_MESSAGES.DOOR.topic, V6800_TEST_MESSAGES.DOOR.message);
  const v6800DoorNormalized = normalizer.normalize(v6800DoorParsed);
  
  console.log('Normalized DOOR objects:', v6800DoorNormalized.length);
  v6800DoorNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Key: ${obj.payload.key}, State: ${obj.payload.value.state}`);
  });
  
  // Test INIT
  console.log('\nTesting V6800 INIT...');
  const v6800InitParsed = parser.parse(V6800_TEST_MESSAGES.INIT.topic, V6800_TEST_MESSAGES.INIT.message);
  const v6800InitNormalized = normalizer.normalize(v6800InitParsed);
  
  console.log('Normalized INIT objects:', v6800InitNormalized.length);
  v6800InitNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}, Device: ${obj.identity.deviceId}, Module: ${obj.identity.modAddr}`);
  });
}

/**
 * Test RFID state management (diff engine)
 */
function testRfidStateManagement() {
  console.log('\n=== Testing RFID State Management ===');
  
  const parser = new V5008Parser();
  const normalizer = new UnifyNormalizer();
  
  // First RFID message (initial state)
  console.log('\nProcessing initial V5008 RFID state...');
  const firstRfidParsed = parser.parse(V5008_TEST_MESSAGES.RFID.topic, Buffer.from(V5008_TEST_MESSAGES.RFID.message, 'hex'));
  const firstRfidNormalized = normalizer.normalize(firstRfidParsed);
  
  console.log('First RFID normalization results:');
  firstRfidNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}`);
    if (obj.type === 'SYS_RFID_EVENT') {
      console.log(`  Action: ${obj.payload.value.action}, Tag: ${obj.payload.value.tagId}`);
    }
  });
  
  // Create a second RFID message with different tags (simulating changes)
  console.log('\nProcessing second V5008 RFID state (with changes)...');
  const secondRfidMessage = "BB028C090995000C020B00DD344A440D00DD3CE9C4050007AD"; // Different tags
  const secondRfidParsed = parser.parse(V5008_TEST_MESSAGES.RFID.topic, Buffer.from(secondRfidMessage, 'hex'));
  const secondRfidNormalized = normalizer.normalize(secondRfidParsed);
  
  console.log('Second RFID normalization results:');
  secondRfidNormalized.forEach(obj => {
    console.log(`- Type: ${obj.type}`);
    if (obj.type === 'SYS_RFID_EVENT') {
      console.log(`  Action: ${obj.payload.value.action}, Tag: ${obj.payload.value.tagId}`);
    }
  });
}

/**
 * Test path generation
 */
function testPathGeneration() {
  console.log('\n=== Testing Path Generation ===');
  
  const normalizer = new UnifyNormalizer();
  
  // Test different path combinations
  const testCases = [
    { deviceId: '1234567890', modAddr: 1, sensorAddr: 10, expected: '1234567890/M1/S10' },
    { deviceId: '1234567890', modAddr: 0, sensorAddr: 0, expected: '1234567890/M0/S0' },
    { deviceId: 'ABCDEF', modAddr: null, sensorAddr: null, expected: 'ABCDEF/M0/S0' },
    { deviceId: 'ABCDEF', modAddr: 5, sensorAddr: 0, expected: 'ABCDEF/M5/S0' }
  ];
  
  for (const testCase of testCases) {
    const path = normalizer._generatePath(testCase.deviceId, testCase.modAddr, testCase.sensorAddr);
    console.log(`Path: ${path}, Expected: ${testCase.expected}, Match: ${path === testCase.expected}`);
    assert.equal(path, testCase.expected, `Path generation failed for ${JSON.stringify(testCase)}`);
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('Starting UnifyNormalizer tests...');
  
  try {
    testV5008Normalization();
    testV6800Normalization();
    testRfidStateManagement();
    testPathGeneration();
    
    console.log('\n✅ All UnifyNormalizer tests passed!');
  } catch (error) {
    console.error('\n❌ UnifyNormalizer test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testV5008Normalization,
  testV6800Normalization,
  testRfidStateManagement,
  testPathGeneration,
  runAllTests
};