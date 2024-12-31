const { assertBoolean }    = require('./test-utils');
const { assertEqual }      = require('./test-utils');
const { assertNull }       = require('./test-utils');
const { assertEqualTime }  = require('./test-utils');
const { GenericOptimizer } = require('openhab-spot-price-optimizer/generic-optimizer');

/**
 * Tests the constructor of GenericOptimizer.
 *
 * Scenario: The GenericOptimizer is initialized without passing any resolution.
 *
 * Expected Result:
 * - The default resolution is set to PT15M.
 * - The error flag remains false after initialization.
 */
function testConstructor() {
  const optimizer = new GenericOptimizer();
  const expectedResolution = time.Duration.parse("PT15M");
  assertEqualTime(optimizer.getResolution(), expectedResolution, "Default resolution should be PT15M");
  assertBoolean(optimizer.error, false, "Error flag should be false by default");
}

/**
 */
function testNormalizePrices() {
  const optimizer = new GenericOptimizer();
  const expected = require('./test-data/prices-2023-11-08-result-pt15m.json');

  const pt60m = require('./test-data/prices-2023-11-08-pt60m.json');
  let actual = optimizer.normalizePrices(pt60m);
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "PT60M prices should be normalized to PT15M resolution");

  const pt30m = require('./test-data/prices-2023-11-08-pt30m.json');
  actual = optimizer.normalizePrices(pt30m);
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "PT30M prices should be normalized to PT15M resolution");

  const pt15m = require('./test-data/prices-2023-11-08-pt15m.json');
  actual = optimizer.normalizePrices(pt15m);
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "PT15M prices should be normalized to expected structure");

  const pt20m = require('./test-data/prices-2023-11-08-pt20m.json');
  actual = optimizer.normalizePrices(pt20m);
  assertBoolean(optimizer.error, true, "Unexpected resolution should raise the error flag.");
}

/**
 * Tests the setParameters method of GenericOptimizer with mocked persistence.
 *
 * Scenario: Parameters object include only required properties without
 * load balancing parameters. Persistence layer for prices is mocked to return
 * predefined data.
 *
 * Expected Result:
 * - Prices are normalized and set correctly.
 * - Error flag remains false.
 * - Price start is set to the start datetime of the first price entry.
 * - Price end is set to the last price entry, adjusted by the resolution.
 */
function testSetParametersWithoutLoadParameters() {
  // Mock data
  const mockPrices = require('./test-data/prices-2023-11-08-pt60m.json');
  const expectedPrices = require('./test-data/prices-2023-11-08-result-pt15m.json');
  const expectedDuration = time.Duration.ofHours(24);

  // Mock `getAllStatesBetween` method
  const mockPersistence = {
    getAllStatesBetween: (start, end) => mockPrices
  };

  // Mock `items.getItem` to return a mocked priceItem
  const openHABItems = items;
  global.items = {
    getItem: (itemName) => {
      if (itemName === 'SpotPrices') {
        return { persistence: mockPersistence };
      }
      throw new Error(`Unknown item: ${itemName}`);
    }
  };

  // Prepare parameters
  const parameters = {
    priceItem: 'SpotPrices',
    start: time.toZDT("2023-11-07T22:00:00Z"),
    end: time.toZDT("2023-11-08T22:00:00Z"),
  };

  // Run the test
  const optimizer = new GenericOptimizer();
  optimizer.setParameters(parameters);

  // Assertions
  assertEqual(JSON.stringify(optimizer.prices), JSON.stringify(expectedPrices), "Prices should be set correctly");
  assertEqual(optimizer.error, false, "Error flag should remain false");
  assertEqualTime(optimizer.priceStart, time.toZDT(expectedPrices[0].datetime), "Price start should be set correctly");
  assertEqualTime(optimizer.priceEnd, time.toZDT(expectedPrices[expectedPrices.length - 1].datetime).plus(optimizer.getResolution()), "Price end should be set correctly");

  // Cleanup
  global.items = openHABItems;
}

/**
 * Tests the setParameters method of GenericOptimizer with mocked persistence and resetLoads parameter.
 *
 * Scenario: Load balancing parameters are present, loadReset is true.
 *
 * Expected Result:
 * - Load values in the `prices` property of the optimizer are reset to 0.
 */
function testSetParametersWithLoadReset() {
  // Mock data
  const mockPrices = require('./test-data/prices-2023-11-08-pt60m.json');
  const mockLoads = require('./test-data/loads-2023-11-08-pt15m.json');

  // Mock `getAllStatesBetween` method for prices and loads
  const mockPricePersistence = {
    getAllStatesBetween: (start, end) => mockPrices,
  };
  const mockLoadPersistence = {
    getAllStatesBetween: (start, end) => mockLoads,
    countBetween: (start, end) => 96,
  };

  // Mock `items.getItem` to return mocked priceItem and loadItem
  const openHABItems = items;
  global.items = {
    getItem: (itemName) => {
      if (itemName === 'SpotPrices') {
        return { persistence: mockPricePersistence };
      }
      if (itemName === 'EstimatedTotalLoads') {
        return { persistence: mockLoadPersistence };
      }
      throw new Error(`Unknown item: ${itemName}`);
    }
  };

  // Prepare parameters
  const parameters = {
    priceItem: 'SpotPrices',
    loadItem: 'EstimatedTotalLoads',
    start: time.toZDT("2023-11-07T22:00:00Z"),
    end: time.toZDT("2023-11-08T22:00:00Z"),
    resetLoads: true,
    maxLoad: 5,
    deviceLoad: 2,
  };

  // Run the test
  const optimizer = new GenericOptimizer();
  optimizer.setParameters(parameters);

  // Assertions
  assertEqual(optimizer.prices[16].load, 0, "Load value at index 16 should be reset to 0 when resetLoads is true");

  // Cleanup
  global.items = openHABItems;
}


/**
 * Tests the setParameters method of GenericOptimizer with mocked persistence and resetLoads parameter.
 *
 * Scenario: Load balancing parameters are present, resetLoads is false.
 *
 * Expected Result:
 * - Load values in the `prices` property contain the persisted values from the mockLoads data.
 */
function testSetParametersWithoutLoadReset() {
  // Mock data
  const mockPrices = require('./test-data/prices-2023-11-08-pt60m.json');
  const mockLoads = require('./test-data/loads-2023-11-08-pt15m.json');

  // Mock `getAllStatesBetween` and `countBetween` methods for prices and loads
  const mockPricePersistence = {
    getAllStatesBetween: (start, end) => mockPrices,
  };

  const mockLoadPersistence = {
    getAllStatesBetween: (start, end) => mockLoads,
    countBetween: (start, end) => mockLoads.length,
    persistedState: (datetime) => {
      const isoString = datetime.toString();
      const loadEntry = mockLoads.find((entry) => entry.timestamp === isoString);
      return { numericState: loadEntry.numericState };
    },
  };

  // Mock `items.getItem` to return mocked priceItem and loadItem
  const openHABItems = items;
  global.items = {
    getItem: (itemName) => {
      if (itemName === 'SpotPrices') {
        return { persistence: mockPricePersistence };
      }
      if (itemName === 'EstimatedTotalLoads') {
        return { persistence: mockLoadPersistence };
      }
      throw new Error(`Unknown item: ${itemName}`);
    },
  };

  // Prepare parameters
  const parameters = {
    priceItem: 'SpotPrices',
    loadItem: 'EstimatedTotalLoads',
    start: time.ZonedDateTime.parse("2023-11-07T22:00:00Z"),
    end: time.ZonedDateTime.parse("2023-11-08T22:00:00Z"),
    resetLoads: false,
    maxLoad: 5,
    deviceLoad: 2,
  };

  // Run the test
  const optimizer = new GenericOptimizer();
  optimizer.setParameters(parameters);

  // Perform the assertion
  assertEqual(optimizer.prices[16].load, 4, 'Load value at index 16 is 4.');

  // Cleanup
  global.items = openHABItems;
}

/**
 * Tests the setPrices method of GenericOptimizer.
 *
 * Scenario: A valid array of datetime-value pairs is passed to the setPrices method.
 *
 * Expected Result:
 * - Prices are set correctly.
 * - Error flag remains false.
 * - Price start is set to the start datetime of the first price entry.
 * - Price end is set to the end datetime of the last price entry, adjusted by the resolution.
 * - Price window duration is calculated to be PT24H.
 */
function testSetPrices() {
  const optimizer = new GenericOptimizer();
  const mockPrices = require('./test-data/prices-2023-11-08-pt60m.json');
  const expectedPrices = require('./test-data/prices-2023-11-08-result-pt15m.json');
  const expectedDuration = time.Duration.ofHours(24);

  optimizer.setPrices(mockPrices);

  assertEqual(JSON.stringify(optimizer.prices), JSON.stringify(expectedPrices), "Prices should be set correctly");
  assertEqual(optimizer.error, false, "Error flag should remain false");
  assertEqualTime(optimizer.priceStart, time.toZDT(expectedPrices[0].datetime), "Price start should be set correctly");
  assertEqualTime(optimizer.priceEnd, time.toZDT(expectedPrices[expectedPrices.length - 1].datetime).plus(optimizer.getResolution()), "Price end should be set correctly");
  assertEqualTime(optimizer.priceWindowDuration, expectedDuration, "Price window duration should be PT24H");
}

/**
 * Tests the setPrices method when the prices array is too short for the optimization.
 *
 * Scenario: An empty array of prices is passed to the setPrices method.
 *
 * Expected Result:
 * - The error flag is set to true.
 * - The method exits early and does not proceed with setting prices.
 */
function testSetPricesWithEmptyData() {
  const optimizer = new GenericOptimizer();
  const mockPrices = [];
  optimizer.setPrices(mockPrices);

  assertEqual(JSON.stringify(optimizer.prices), JSON.stringify(mockPrices), "Prices should be an empty array");
  assertEqual(optimizer.error, true, "Error flag should be turned to true");
}

/**
 * Tests: tests several optimization mehtods with invalid input.
 * - allowInPieces
 * - blockinPieces
 * - allowPeriod
 * - blockPeriod
 * - allowIndividualHours
 * - blockIndividualHours
 * - optimizeInPieces
 * - optimizePeriod
 *
 * Scenarios: undefined hours, negative hours.
 *
 * Expected Result: getControlPoints returns null.
 */
function testOptimizationsInvalidRequests() {
  const optimizer = new GenericOptimizer();
  const expected = require('./test-data/control-points-0.json');

  let mockPrices;
  let actual;

  // Test allowInPieces with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowInPieces();
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  console.log("debug 2");
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowInPieces with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowInPieces(-1);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test blockInPieces with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockInPieces();
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test blockInPieces with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockInPieces(-1);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowPeriod with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowPeriod();
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowPeriod with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowPeriod(-1);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test blockPeriod with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockPeriod();
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test blockPeriod with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockPeriod(-1);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowIndividualHours with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowIndividualHours();
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowIndividualHours with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowIndividualHours(-1);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test blockIndividualHours with undefined duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockIndividualHours();
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test allowIndividualHours with negative duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockIndividualHours(-1);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test optimizeInPieces with invalid operation.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.optimizeInPieces('foo', 5);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test optimizeInPieces with undefined operation.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  let operation;
  optimizer.optimizeInPieces(operation, 5);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test optimizePeriod with invalid operation.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.optimizePeriod('foo', 5);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");

  // Test optimizePeriod with undefined operation.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.optimizePeriod(operation, 5);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().size;
  assertEqual(actual, 0, "No control points added for invalid request.");
}

/**
 * Tests: tests several optimization mehtods with 0 hour input.
 * - allowInPieces
 * - blockinPieces
 * - allowPeriod
 * - blockPeriod
 * - allowIndividualHours
 * - blockIndividualHours
 * - optimizeInPieces
 * - optimizePeriod
 *
 * Scenarios: requested duration is 0.
 *
 * Expected Result: All hours are blocked / allowed.
 */
function testOptimizationsZeroDuration() {
  const optimizer = new GenericOptimizer();

  let mockPrices;
  let actual;
  let expected;

  // Test allowInPieces with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowInPieces(0);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-blocked.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Test blockInPieces with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockInPieces(0);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-allowed.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Test allowPeriod with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowPeriod(0);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-blocked.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Test blockPeriod with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockPeriod(0);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-allowed.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Test allowIndividualHours with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.allowIndividualHours(0);
  optimizer.blockAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-blocked.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Test blockIndividualHours with 0 duration.
  mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);
  optimizer.blockIndividualHours(0);
  optimizer.allowAllRemaining();
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-all-allowed.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");
}

/**
 * Tests the allowInPieces, blockInPieces and optimizeInPieces methods
 * and the actual calculations.
 *
 * Scenario:
 * - First optimize 1.5 hours without constraints
 * - Then optimize 1.1h more with constraints. Tests constraints and rounding.
 * - Then block 2h
 *
 * Expected Result:
 * - The control points match expected JSON files with correct results.
 */
function testOptimizationsInPieces() {
  const optimizer = new GenericOptimizer();
  const mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);

  let actual;
  let expected;

  // Allow 1.5 hours
  optimizer.allowInPieces(1.5);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-1a.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Allow 1.1h more with start and end constraint. 1.1h will be rounded up.
  const startConstraint = time.toZDT('2024-01-14T09:30');
  const endConstraint = time.toZDT('2024-01-14T11:30');
  optimizer.allowInPieces(1.1, startConstraint, endConstraint);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-1b.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Block 2 hours
  optimizer.blockInPieces(2);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-1c.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");
}

/**
 * Tests the allowInPieces and optimizeInPieces methods with load balancing.
 *
 * Scenario:
 * - Cheapest hour alreaday contains 4 kW load. MaxLoad is 5 kW.
 * - The additional 3 kW load is optimized to the second cheapest hour.
 *
 * Expected Result:
 * - The control points match expected JSON files with correct results.
 */
function testOptimizationsInPiecesWithLoadBalancing() {
  // Mock data
  const mockPrices = require('./test-data/prices-2023-11-08-pt60m.json');
  const mockLoads = require('./test-data/loads-2023-11-08-pt15m.json');

  // Mock `getAllStatesBetween` and `countBetween` methods for prices and loads
  const mockPricePersistence = {
    getAllStatesBetween: (start, end) => mockPrices,
  };

  const mockLoadPersistence = {
    getAllStatesBetween: (start, end) => mockLoads,
    countBetween: (start, end) => mockLoads.length,
    persistedState: (datetime) => {
      const isoString = datetime.toString();
      const loadEntry = mockLoads.find((entry) => entry.timestamp === isoString);
      return { numericState: loadEntry.numericState };
    },
  };

  // Mock `items.getItem` to return mocked priceItem and loadItem
  const openHABItems = items;
  global.items = {
    getItem: (itemName) => {
      if (itemName === 'SpotPrices') {
        return { persistence: mockPricePersistence };
      }
      if (itemName === 'EstimatedTotalLoads') {
        return { persistence: mockLoadPersistence };
      }
      throw new Error(`Unknown item: ${itemName}`);
    }
  };

  // Prepare parameters
  const parameters = {
    priceItem: 'SpotPrices',
    loadItem: 'EstimatedTotalLoads',
    start: time.toZDT("2023-11-07T22:00:00Z"),
    end: time.toZDT("2023-11-08T22:00:00Z"),
    resetLoads: false,
    maxLoad: 5,
    deviceLoad: 3,
  };

  // Run the test
  const optimizer = new GenericOptimizer();
  optimizer.setParameters(parameters);

  let actual;
  let expected;

  // Allow 1 hours
  optimizer.allowInPieces(1);
  optimizer.blockAllRemaining();
  global.items = openHABItems;
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-2023-11-08-load-balancing.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");
}


/**
 * Tests the allowPeriod, blockPeriod and optimizePeriod methods
 * and the actual calculations.
 *
 * Scenario:
 * - First optimize 1.5 hours without constraints
 * - Then optimize 1.1h more with constraints. Tests constraints and rounding.
 * - Then block 2h
 *
 * Expected Result:
 * - The control points match expected JSON files with correct results.
 */
function testOptimizationsInPeriods() {
  const optimizer = new GenericOptimizer();
  const mockPrices = require('./test-data/prices-random.json');
  optimizer.setPrices(mockPrices);

  let actual;
  let expected;

  // Allow 1.5 hours
  optimizer.allowPeriod(1.5);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-2a.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Allow 1.1h more with start and end constraint. 1.1h will be rounded up.
  const startConstraint = time.toZDT('2024-01-14T09:30');
  const endConstraint = time.toZDT('2024-01-14T14:00');
  optimizer.allowPeriod(1.1, startConstraint, endConstraint);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-2b.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");

  // Block 2 hours
  optimizer.blockPeriod(2);
  actual = optimizer.getControlPoints().states;
  expected = require('./test-data/control-points-2c.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Control points should match to correct values.");
}

// Export the test functions
module.exports = {
  testConstructor,
  testNormalizePrices,
  testSetParametersWithoutLoadParameters,
  testSetParametersWithLoadReset,
  testSetParametersWithoutLoadReset,
  testSetPrices,
  testSetPricesWithEmptyData,
  testOptimizationsInvalidRequests,
  testOptimizationsZeroDuration,
  testOptimizationsInPieces,
  testOptimizationsInPiecesWithLoadBalancing,
  testOptimizationsInPeriods
}
