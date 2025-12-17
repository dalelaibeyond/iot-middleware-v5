/**
 * V5008 Parser Simple Test
 * Simple test to verify V5008 parser works with real message examples
 */

import V5008Parser from '../src/modules/normalizer/parsers/V5008Parser.js';

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

function runTests() {
  console.log('🧪 Starting V5008 Parser Tests...\n');
  
  const parser = new V5008Parser();
  
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
      
      // Verify key parsed fields
      switch (parsedData.data.msgType) {
        case 'HEARTBEAT':
          console.log(`   Modules: ${parsedData.data.modules.length}`);
          parsedData.data.modules.forEach((module, i) => {
            console.log(`     Module ${i + 1}: modAddr=${module.modAddr}, modId=${module.modId}, uTotal=${module.uTotal}`);
          });
          break;
          
        case 'RFID':
          console.log(`   Module: ${parsedData.data.modAddr}, Total U: ${parsedData.data.uTotal}, Online: ${parsedData.data.onlineCount}`);
          parsedData.data.items.forEach((item, i) => {
            console.log(`     Item ${i + 1}: uPos=${item.uPos}, alarmStatus=${item.alarmStatus}, tagId=${item.tagId}`);
          });
          break;
          
        case 'TEMP_HUM':
          console.log(`   Module: ${parsedData.data.modAddr}`);
          parsedData.data.sensors.forEach((sensor, i) => {
            console.log(`     Sensor ${i + 1}: addr=${sensor.sensorAddr}, temp=${sensor.temp}, hum=${sensor.hum}`);
          });
          break;
          
        case 'NOISE':
          console.log(`   Module: ${parsedData.data.modAddr}`);
          parsedData.data.sensors.forEach((sensor, i) => {
            console.log(`     Sensor ${i + 1}: addr=${sensor.sensorAddr}, noise=${sensor.noise}`);
          });
          break;
          
        case 'DOOR':
          console.log(`   Module: ${parsedData.data.modAddr}, Door State: ${parsedData.data.doorState}`);
          break;
          
        case 'QRY_COLOR':
          console.log(`   Module: ${parsedData.data.modNum}, Colors: ${parsedData.data.colors.length}`);
          parsedData.data.colors.forEach((color, i) => {
            console.log(`     Color ${i + 1}: uPos=${color.uPos}, colorCode=${color.colorCode}`);
          });
          break;
          
        case 'SET_COLOR':
          console.log(`   Module: ${parsedData.data.modNum}, Original Req: ${parsedData.data.originalReq}`);
          parsedData.data.colors.forEach((color, i) => {
            console.log(`     Color ${i + 1}: uPos=${color.uPos}, colorCode=${color.colorCode}`);
          });
          break;
          
        case 'CLR_ALARM':
          console.log(`   Module: ${parsedData.data.modNum}, Original Req: ${parsedData.data.originalReq}`);
          if (parsedData.data.uPositions) {
            parsedData.data.uPositions.forEach((pos, i) => {
              console.log(`     Position ${i + 1}: ${pos}`);
            });
          }
          break;
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
    console.log(`🎉 All tests passed! V5008 parser is working correctly.`);
  } else {
    console.log(`⚠️  Some tests failed. Please check the implementation.`);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };