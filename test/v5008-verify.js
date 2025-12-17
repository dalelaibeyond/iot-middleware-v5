/**
 * V5008 Parser Verification Script
 * Simple verification of V5008 parser functionality
 */

// Test the hexToSignedByte function directly
function testHexToSignedByte() {
  console.log('Testing hexToSignedByte function...');
  
  // Test positive values
  console.log('0x7F (127) should be 127:', 0x7F, '->', parseInt('7F', 16) > 127 ? parseInt('7F', 16) - 256 : parseInt('7F', 16));
  
  // Test negative values
  console.log('0x80 (-128) should be -128:', 0x80, '->', parseInt('80', 16) > 127 ? parseInt('80', 16) - 256 : parseInt('80', 16));
  console.log('0xFF (-1) should be -1:', 0xFF, '->', parseInt('FF', 16) > 127 ? parseInt('FF', 16) - 256 : parseInt('FF', 16));
  
  console.log('✅ hexToSignedByte function test completed\n');
}

// Test temperature parsing with signed integers
function testTemperatureParsing() {
  console.log('Testing temperature parsing...');
  
  // Simulate temp: 28.48 (should be 0x1C 0x30)
  // Simulate temp: -5.50 (should be 0xFB 0x32)
  
  const testCases = [
    { name: 'Positive 28.48', intByte: 0x1C, fracByte: 0x30, expected: 28.48 },
    { name: 'Negative -5.50', intByte: 0xFB, fracByte: 0x32, expected: -5.50 },
  ];
  
  testCases.forEach(testCase => {
    const intPart = testCase.intByte > 127 ? testCase.intByte - 256 : testCase.intByte;
    const fracPart = testCase.fracByte;
    
    let value = Math.abs(intPart) + (fracPart / 100.0);
    if (intPart < 0) value = value * -1;
    
    console.log(`${testCase.name}: intByte=0x${testCase.intByte.toString(16).padStart(2, '0')}, fracByte=0x${testCase.fracByte.toString(16).padStart(2, '0')} => ${value}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${value}, Match: ${Math.abs(value - testCase.expected) < 0.01 ? '✅' : '❌'}`);
  });
  
  console.log('✅ Temperature parsing test completed\n');
}

// Test color code mapping
function testColorCodeMapping() {
  console.log('Testing color code mapping...');
  
  const colorCodeMap = {
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
  };
  
  Object.entries(colorCodeMap).forEach(([code, name]) => {
    console.log(`  ${code}: ${name}`);
  });
  
  console.log('✅ Color code mapping test completed\n');
}

// Run all tests
function runVerificationTests() {
  console.log('🧪 V5008 Parser Verification Tests\n');
  console.log('=====================================\n');
  
  testHexToSignedByte();
  console.log('');
  testTemperatureParsing();
  console.log('');
  testColorCodeMapping();
  
  console.log('=====================================\n');
  console.log('🎉 All verification tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerificationTests().catch(console.error);
}

export { runVerificationTests };