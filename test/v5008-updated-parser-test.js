/**
 * Test file for updated V5008Parser.js
 * Tests the parser with sample messages from V5008_V1.4.md specification
 */

import V5008Parser from '../src/modules/normalizer/parsers/V5008Parser.js';

// Create parser instance
const parser = new V5008Parser();

// Test function
function testParser(description, topic, hexMessage) {
  console.log(`\n=== ${description} ===`);
  console.log(`Topic: ${topic}`);
  console.log(`Message: ${hexMessage}`);
  
  try {
    const buffer = Buffer.from(hexMessage, 'hex');
    const result = parser.parse(topic, buffer);
    
    console.log('Parsed Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify global rules
    console.log('\nVerification:');
    console.log(`- Has ts field: ${!!result.ts}`);
    console.log(`- messageType from header: ${result.messageType}`);
    console.log(`- modId is string: ${typeof result.modId === 'string' || (result.modules && result.modules.every(m => typeof m.modId === 'string'))}`);
    console.log(`- modAddr is number: ${typeof result.modAddr === 'number' || (result.modules && result.modules.every(m => typeof m.modAddr === 'number'))}`);
    
    if (result.result) {
      console.log(`- resultCode is "Success" or "Failure": ${result.result === "Success" || result.result === "Failure"}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Test cases from V5008_V1.4.md specification

// 1. Heartbeat Message (CC header)
testParser(
  'Heartbeat Message (CC header)',
  'V5008Upload/2437871205/OpeAck',
  'CC01EC3737BF06028C0909950C0300000000000400000000000500000000000600000000000700000000000800000000000900000000000A0000000000F200168F'
);

// 2. RFID Message (BB header)
testParser(
  'RFID Message (BB header)',
  'V5008Upload/2437871205/LabelState',
  'BB028C090995000C030A00DD344A440B00DD2862B40C00DD3CE9C4050007AD'
);

// 3. Temperature & Humidity Message
testParser(
  'Temperature & Humidity Message',
  'V5008Upload/2437871205/TemHum',
  '01EC3737BF0A1C30331B0B1C08330B0C000000000D000000000E000000000F0000000001012CC3'
);

// 4. Door State Message (BA header)
testParser(
  'Door State Message (BA header)',
  'V5008Upload/2437871205/OpeAck',
  'BA01EC3737BF010B01C7F8'
);

// 5. U-level Light Color Set Response Message (AA header, E1 command)
testParser(
  'U-level Light Color Set Response (AA header, E1 command)',
  'V5008Upload/2437871205/OpeAck',
  'AA914EF665A1E101050206012B002316'
);

// 6. U-level Light Color Query Response Message (AA header, E4 command)
testParser(
  'U-level Light Color Query Response (AA header, E4 command)',
  'V5008Upload/2437871205/OpeAck',
  'AA914EF665A1E4010000000D0D0825015D4C'
);

// 7. U-level Alarm Clear Response Message (AA header, E2 command)
testParser(
  'U-level Alarm Clear Response (AA header, E2 command)',
  'V5008Upload/2437871205/OpeAck',
  'AA914EF665A1E2010605AC009ECF'
);

// 8. Device Info Query Response Message (EF01 header)
testParser(
  'Device Info Query Response (EF01 header)',
  'V5008Upload/2437871205/OpeAck',
  'EF011390958DD85FC0A800D3FFFF0000C0A800018082914EF665F2011CCB'
);

// 9. Module Info Query Response Message (EF02 header)
testParser(
  'Module Info Query Response (EF02 header)',
  'V5008Upload/2437871205/OpeAck',
  'EF0201898393CC02898393CCF4010166'
);

// 10. Noise Message
testParser(
  'Noise Message',
  'V5008Upload/2437871205/Noise',
  '01EC3737BF100000000011000000001200000000D500EBD7'
);

console.log('\n=== Test Summary ===');
console.log('All tests completed. Check the output above for verification of global rules:');
console.log('1. Binary header determines messageType');
console.log('2. resultCode outputs "Success" or "Failure"');
console.log('3. ISO 8601 timestamp field added to root');
console.log('4. modId is always a String, modAddr is always a Number');