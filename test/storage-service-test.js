/**
 * Test file for StorageService.js
 * Tests the routing logic and SQL generation for different data types
 */

import { strict as assert } from 'assert';
import StorageService from '../src/modules/storage/StorageService.js';

// Sample normalized data from UnifyNormalizer
const SAMPLE_NORMALIZED_DATA = [
  // SYS_TELEMETRY example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      ts: "2025-12-19T09:43:00.000Z",
      receivedAt: "2025-12-19T09:43:00.100Z",
      path: "2437871205/M1/S10"
    },
    identity: {
      deviceId: "2437871205",
      deviceType: "V5008",
      modAddr: 1,
      sensorAddr: 10
    },
    type: "SYS_TELEMETRY",
    payload: {
      key: "temperature",
      value: 28.48,
      unit: "celsius"
    }
  },
  // SYS_RFID_EVENT example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      ts: "2025-12-19T09:43:01.000Z",
      receivedAt: "2025-12-19T09:43:01.100Z",
      path: "2437871205/M1/S10"
    },
    identity: {
      deviceId: "2437871205",
      deviceType: "V5008",
      modAddr: 1,
      sensorAddr: 10
    },
    type: "SYS_RFID_EVENT",
    payload: {
      key: "rfid_event",
      value: {
        action: "ATTACHED",
        uPos: 10,
        tagId: "DD344A44",
        alarmStatus: 0
      }
    }
  },
  // SYS_RFID_SNAPSHOT example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      ts: "2025-12-19T09:43:02.000Z",
      receivedAt: "2025-12-19T09:43:02.100Z",
      path: "2437871205/M1/S0"
    },
    identity: {
      deviceId: "2437871205",
      deviceType: "V5008",
      modAddr: 1,
      sensorAddr: 0
    },
    type: "SYS_RFID_SNAPSHOT",
    payload: {
      key: "rfid_snapshot",
      value: {
        items: [
          { uPos: 10, tagId: "DD344A44", alarmStatus: 0 },
          { uPos: 11, tagId: "DD2862B4", alarmStatus: 0 },
          { uPos: 12, tagId: "DD3CE9C4", alarmStatus: 0 }
        ],
        uTotal: 12,
        onlineCount: 3
      }
    }
  },
  // SYS_STATE_CHANGE example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440003",
      ts: "2025-12-19T09:43:03.000Z",
      receivedAt: "2025-12-19T09:43:03.100Z",
      path: "2437871205/M1/S0"
    },
    identity: {
      deviceId: "2437871205",
      deviceType: "V5008",
      modAddr: 1,
      sensorAddr: 0
    },
    type: "SYS_STATE_CHANGE",
    payload: {
      key: "door_state",
      value: {
        state: "OPEN",
        raw: "01"
      }
    }
  },
  // SYS_DEVICE_INFO example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440004",
      ts: "2025-12-19T09:43:04.000Z",
      receivedAt: "2025-12-19T09:43:04.100Z",
      path: "2123456789/M0/S0"
    },
    identity: {
      deviceId: "2123456789",
      deviceType: "V6800",
      modAddr: null,
      sensorAddr: null
    },
    type: "SYS_DEVICE_INFO",
    payload: {
      key: "device_info",
      value: {
        ip: "192.168.0.212",
        mac: "08:80:7E:..."
      }
    }
  },
  // SYS_LIFECYCLE example
  {
    meta: {
      uuid: "550e8400-e29b-41d4-a716-446655440005",
      ts: "2025-12-19T09:43:05.000Z",
      receivedAt: "2025-12-19T09:43:05.100Z",
      path: "2123456789/M0/S0"
    },
    identity: {
      deviceId: "2123456789",
      deviceType: "V6800",
      modAddr: 0,
      sensorAddr: 0
    },
    type: "SYS_LIFECYCLE",
    payload: {
      key: "device_status",
      value: {
        status: "online",
        voltage: 23.89,
        current: 5.70,
        mainPower: true,
        backupPower: false
      }
    }
  }
];

/**
 * Test StorageService initialization
 */
async function testInitialization() {
  console.log('\n=== Testing StorageService Initialization ===');
  
  const storageService = new StorageService();
  
  try {
    await storageService.initialize();
    console.log('✅ StorageService initialized successfully');
    
    const status = storageService.getStatus();
    console.log('Status:', status);
    
    await storageService.shutdown();
    console.log('✅ StorageService shutdown successfully');
    
    return true;
  } catch (error) {
    console.error('❌ StorageService initialization failed:', error.message);
    return false;
  }
}

/**
 * Test batch save with different data types
 */
async function testBatchSave() {
  console.log('\n=== Testing Batch Save ===');
  
  const storageService = new StorageService();
  
  try {
    await storageService.initialize();
    
    // Test saving sample data
    const results = await storageService.saveBatch(SAMPLE_NORMALIZED_DATA);
    
    console.log('Batch save results:', JSON.stringify(results, null, 2));
    
    // Verify all items were processed
    assert.equal(results.totalProcessed, SAMPLE_NORMALIZED_DATA.length, 'All items should be processed');
    assert.equal(results.telemetry.processed, 1, 'One telemetry item should be processed');
    assert.equal(results.rfidEvents.processed, 1, 'One RFID event should be processed');
    assert.equal(results.deviceState.processed, 4, 'Four device state items should be processed (RFID snapshot, state change, device info, lifecycle)');
    assert.equal(results.telemetry.errors, 0, 'No telemetry errors should occur');
    assert.equal(results.rfidEvents.errors, 0, 'No RFID event errors should occur');
    assert.equal(results.deviceState.errors, 0, 'No device state errors should occur');
    
    console.log('✅ All batch save tests passed');
    
    await storageService.shutdown();
    return true;
  } catch (error) {
    console.error('❌ Batch save test failed:', error.message);
    return false;
  }
}

/**
 * Test individual data type processing
 */
async function testDataTypeProcessing() {
  console.log('\n=== Testing Data Type Processing ===');
  
  const storageService = new StorageService();
  
  try {
    await storageService.initialize();
    
    // Test each data type individually
    const telemetryData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_TELEMETRY');
    const rfidEventData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_RFID_EVENT');
    const rfidSnapshotData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_RFID_SNAPSHOT');
    const stateChangeData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_STATE_CHANGE');
    const deviceInfoData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_DEVICE_INFO');
    const lifecycleData = SAMPLE_NORMALIZED_DATA.filter(item => item.type === 'SYS_LIFECYCLE');
    
    // Test telemetry processing
    const telemetryResult = await storageService.saveBatch(telemetryData);
    assert.equal(telemetryResult.telemetry.processed, 1, 'Telemetry should be processed correctly');
    console.log('✅ Telemetry processing test passed');
    
    // Test RFID event processing
    const rfidEventResult = await storageService.saveBatch(rfidEventData);
    assert.equal(rfidEventResult.rfidEvents.processed, 1, 'RFID events should be processed correctly');
    console.log('✅ RFID event processing test passed');
    
    // Test RFID snapshot processing
    const rfidSnapshotResult = await storageService.saveBatch(rfidSnapshotData);
    assert.equal(rfidSnapshotResult.deviceState.processed, 1, 'RFID snapshots should be processed correctly');
    console.log('✅ RFID snapshot processing test passed');
    
    // Test state change processing
    const stateChangeResult = await storageService.saveBatch(stateChangeData);
    assert.equal(stateChangeResult.deviceState.processed, 1, 'State changes should be processed correctly');
    console.log('✅ State change processing test passed');
    
    // Test device info processing
    const deviceInfoResult = await storageService.saveBatch(deviceInfoData);
    assert.equal(deviceInfoResult.deviceState.processed, 1, 'Device info should be processed correctly');
    console.log('✅ Device info processing test passed');
    
    // Test lifecycle processing
    const lifecycleResult = await storageService.saveBatch(lifecycleData);
    assert.equal(lifecycleResult.deviceState.processed, 1, 'Lifecycle data should be processed correctly');
    console.log('✅ Lifecycle processing test passed');
    
    console.log('✅ All data type processing tests passed');
    
    await storageService.shutdown();
    return true;
  } catch (error) {
    console.error('❌ Data type processing test failed:', error.message);
    return false;
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  const storageService = new StorageService();
  
  try {
    await storageService.initialize();
    
    // Test with empty array
    const emptyResult = await storageService.saveBatch([]);
    assert.equal(emptyResult.totalProcessed, 0, 'Empty array should return 0 processed');
    console.log('✅ Empty array handling test passed');
    
    // Test with invalid data
    const invalidResult = await storageService.saveBatch(null);
    assert.equal(invalidResult.totalProcessed, 0, 'Null data should return 0 processed');
    console.log('✅ Invalid data handling test passed');
    
    // Test with uninitialized service
    const uninitializedService = new StorageService();
    try {
      await uninitializedService.saveBatch(SAMPLE_NORMALIZED_DATA);
      assert.fail('Should throw error when not initialized');
    } catch (error) {
      assert(error.message.includes('not initialized'), 'Should throw initialization error');
      console.log('✅ Uninitialized service error test passed');
    }
    
    console.log('✅ All error handling tests passed');
    
    await storageService.shutdown();
    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Starting StorageService tests...');
  
  const tests = [
    { name: 'Initialization', fn: testInitialization },
    { name: 'Batch Save', fn: testBatchSave },
    { name: 'Data Type Processing', fn: testDataTypeProcessing },
    { name: 'Error Handling', fn: testErrorHandling }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} test passed`);
      } else {
        console.log(`❌ ${test.name} test failed`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} test error:`, error);
    }
  }
  
  console.log(`\n=== Test Results: ${passed}/${total} passed ===`);
  
  if (passed === total) {
    console.log('🎉 All StorageService tests passed!');
    return true;
  } else {
    console.log(`💥 ${total - passed} StorageService tests failed`);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testInitialization,
  testBatchSave,
  testDataTypeProcessing,
  testErrorHandling,
  runAllTests
};