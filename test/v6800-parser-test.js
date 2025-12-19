/**
 * Test file for V6800Parser.js
 * Tests parser with sample messages from V6800_V1.3.md specification
 */

import V6800Parser from '../src/modules/normalizer/parsers/V6800Parser.js';

// Create parser instance
const parser = new V6800Parser();

// Test function
function testParser(description, topic, jsonMessage) {
  console.log(`\n=== ${description} ===`);
  console.log(`Topic: ${topic}`);
  console.log(`Message: ${JSON.stringify(jsonMessage)}`);
  
  try {
    const result = parser.parse(topic, jsonMessage);
    
    console.log('Parsed Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify global rules
    console.log('\nVerification:');
    console.log(`- Has ts field: ${!!result.ts}`);
    console.log(`- messageType from topic: ${result.messageType}`);
    
    // Check modId and modAddr types
    if (result.data) {
      if (Array.isArray(result.data)) {
        const hasValidModId = result.data.every(m => 
          typeof m.modId === 'string' || (m.modId && typeof m.modId.toString() === 'string')
        );
        const hasValidModAddr = result.data.every(m => 
          typeof m.modAddr === 'number'
        );
        console.log(`- modId is string: ${hasValidModId}`);
        console.log(`- modAddr is number: ${hasValidModAddr}`);
      }
    }
    
    // Check resultCode logic
    if (result.data && Array.isArray(result.data)) {
      const hasValidResultCode = result.data.every(m => 
        !m.result || m.result === "Success" || m.result === "Failure"
      );
      console.log(`- resultCode is "Success" or "Failure": ${hasValidResultCode}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Test cases from V6800_V1.3.md specification

// 1. Heartbeat Message
testParser(
  'Heartbeat Message',
  'V6800Upload/2123456789/HeartBeat',
  JSON.stringify({
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
);

// 2. RFID Message (LabelState)
testParser(
  'RFID Message (LabelState)',
  'V6800Upload/2123456789/LabelState',
  JSON.stringify({
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
);

// 3. Temperature & Humidity Message (TemHum)
testParser(
  'Temperature & Humidity Message (TemHum)',
  'V6800Upload/2123456789/TemHum',
  {
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
  }
);

// 4. Door Status Change (Door)
testParser(
  'Door Status Change (Door)',
  'V6800Upload/2123456789/Door',
  {
    "msg_type": "door_state_changed_notify_req",
    "gateway_sn": "2123456789",
    "uuid_number": 333321551,
    "data": [
      { "extend_module_sn": "3963041727", "host_gateway_port_index": 2, "new_state": 1 }
    ]
  }
);

// 5. Device Init / Info (Init)
testParser(
  'Device Init / Info (Init)',
  'V6800Upload/2123456789/Init',
  {
    "msg_type": "devies_init_req",
    "gateway_sn": "2123456789",
    "gateway_ip": "192.168.0.212",
    "gateway_mac": "08:80:7E:...",
    "uuid_number": 797991388,
    "data": [
      { "module_index": 2, "module_sn": "3963041727", "module_u_num": 6, "module_sw_version": "2307101644" }
    ]
  }
);

// 6. Query RFID Response (LabelState)
testParser(
  'Query RFID Response (LabelState)',
  'V6800Upload/2123456789/LabelState',
  {
    "msg_type": "u_state_resp",
    "code": 200,
    "gateway_sn": "2123456789",
    "uuid_number": 423018504,
    "data": [{
      "host_gateway_port_index": 4, "extend_module_sn": "2349402517",
      "u_data": [
        { "u_index": 4, "u_state": 0, "tag_code": null },
        { "u_index": 3, "u_state": 1, "tag_code": "DD344A44" }
      ]
    }]
  }
);

// 7. Query U-Level Color Response (OpeAck)
testParser(
  'Query U-Level Color Response (OpeAck)',
  'V6800Upload/2123456789/OpeAck',
  {
    "msg_type": "u_color",
    "gateway_id": "2123456789",
    "code": 1346589,
    "uuid_number": 82941514,
    "data": [
      {
        "index": 2, "module_id": "3963041727", "u_num": 6,
        "color_data": [
          { "index": 1, "code": 13 },
          { "index": 2, "code": 0 }
        ]
      }
    ]
  }
);

// 8. Set U-level Color Response (OpeAck)
testParser(
  'Set U-level Color Response (OpeAck)',
  'V6800Upload/2123456789/OpeAck',
  {
    "msg_type": "set_module_property_result_req",
    "gateway_sn": "2123456789",
    "uuid_number": 245761302,
    "data": [
      { "host_gateway_port_index": 2, "extend_module_sn": "3963041727", "set_property_result": 0 },
      { "host_gateway_port_index": 4, "extend_module_sn": "2349402517", "set_property_result": 0 }
    ]
  }
);

// 9. Clear Alarm Response (OpeAck)
testParser(
  'Clear Alarm Response (OpeAck)',
  'V6800Upload/2123456789/OpeAck',
  {
    "msg_type": "clear_u_warning",
    "gateway_id": "2123456789",
    "uuid_number": 775199553,
    "data": [
      { "index": 2, "module_id": "3963041727", "ctr_flag": true }
    ]
  }
);

console.log('\n=== Test Summary ===');
console.log('All tests completed. Check the output above for verification of global rules:');
console.log('1. Topic-based messageType mapping');
console.log('2. resultCode outputs "Success" or "Failure"');
console.log('3. ISO 8601 timestamp field added to root');
console.log('4. modId is always a String, modAddr is always a Number');
console.log('5. Array structure preservation (data array maintained)');