/**
 * Debug script to check parser outputs
 */

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
  }
};

console.log('=== Debugging V5008 Parser Output ===');

const v5008Parser = new V5008Parser();

for (const [messageType, testMessage] of Object.entries(V5008_TEST_MESSAGES)) {
  console.log(`\n--- V5008 ${messageType} ---`);
  try {
    const parsed = v5008Parser.parse(testMessage.topic, Buffer.from(testMessage.message, 'hex'));
    console.log('Parsed output:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('Error parsing:', error.message);
  }
}

console.log('\n=== Debugging V6800 Parser Output ===');

const v6800Parser = new V6800Parser();

for (const [messageType, testMessage] of Object.entries(V6800_TEST_MESSAGES)) {
  console.log(`\n--- V6800 ${messageType} ---`);
  try {
    const parsed = v6800Parser.parse(testMessage.topic, testMessage.message);
    console.log('Parsed output:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('Error parsing:', error.message);
  }
}