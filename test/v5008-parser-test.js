/**
 * V5008 Parser and Normalizer Test
 * Test script to verify updated V5008 parser and normalizer with sample messages
 */

import V5008Parser from '../src/modules/normalizer/parsers/V5008Parser.js';
import UnifiedNormalizer from '../src/modules/normalizer/UnifiedNormalizer.js';

// Sample messages from v1.4rev specification
const sampleMessages = [
  {
    name: 'HEARTBEAT',
    topic: 'V5008Upload/2437871205/OpeAck',
    message: Buffer.from('CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F', 'hex'),
  },
  {
    name: 'RFID',
    topic: 'V5008Upload/2437871205/LabelState',
    message: Buffer.from('BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD', 'hex'),
  },
  {
    name: 'TEMP_HUM',
    topic: 'V5008Upload/2437871205/TemHum',
    message: Buffer.from('01EC3737BF0A1C30331B0B1C08330B0C000000000D000000000E000000000F0000000001012CC3', 'hex'),
  },
  {
    name: 'NOISE',
    topic: 'V5008Upload/2437871205/Noise',
    message: Buffer.from('01EC3737BF100000000011000000001200000000D500EBD7', 'hex'),
  },
  {
    name: 'DOOR',
    topic: 'V5008Upload/2437871205/OpeAck',
    message: Buffer.from('BA01EC3737BF010B01C7F8', 'hex'),
  },
  {
    name: 'QRY_COLOR',
    topic: 'V5008Upload/2437871205/OpeAck',
    message: Buffer.from('AA914EF665A1E4010000000D0D0825015D4C', 'hex'),
  },
  {
    name: 'SET_COLOR',
    topic: 'V5008Upload/2437871205/OpeAck',
    message: Buffer.from('AA914EF665A1E101050206012B002316', 'hex'),
  },
  {
    name: 'CLR_ALARM',
    topic: 'V5008Upload/2437871205/OpeAck',
    message: Buffer.from('AA914EF665A1E2010605AC009ECF', 'hex'),
  }
];

async function runTests() {
  console.log('🧪 Starting V5008 Parser and Normalizer Tests...\n');
  
  const parser = new V5008Parser();
  const normalizer = new UnifiedNormalizer();
  
  await normalizer.initialize();
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const sample of sampleMessages) {
    totalTests++;
    console.log(`📋 Testing ${sample.name} message...`);
    
    try {
      // Test parser
      const parsedData = parser.parse(sample.topic, sample.message);
      console.log(`✅ Parser successful for ${sample.name}`);
      console.log(`   Device ID: ${parsedData.deviceId}`);
      console.log(`   Message Type: ${parsedData.data.msgType}`);
      console.log(`   Message Class: ${parsedData.messageClass}`);
      
      // Test normalizer
      const normalizedMessages = await normalizer.normalizeMessage(parsedData);
      console.log(`✅ Normalizer successful for ${sample.name}`);
      console.log(`   Generated ${normalizedMessages.length} unified records`);
      
      // Display sample normalized record
      if (normalizedMessages.length > 0) {
        const firstRecord = normalizedMessages[0];
        console.log(`   Sample record: {
         device_id: ${firstRecord.deviceId},
         device_type: ${firstRecord.deviceType},
         module_index: ${firstRecord.moduleIndex},
         sensor_index: ${firstRecord.sensorIndex},
         message_class: ${firstRecord.messageClass},
         data_key: ${firstRecord.dataKey},
         num_value: ${firstRecord.numValue},
         str_value: ${firstRecord.strValue},
         json_value: ${firstRecord.jsonValue ? 'present' : 'null'}
       }`);
      }
      
      passedTests++;
      console.log(`✅ ${sample.name} test passed\n`);
      
    } catch (error) {
      console.log(`❌ ${sample.name} test failed: ${error.message}\n`);
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`🎉 All tests passed! V5008 parser and normalizer are working correctly.`);
  } else {
    console.log(`⚠️  Some tests failed. Please check the implementation.`);
  }
  
  await normalizer.shutdown();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };