const { assertBoolean, assertEqual, assertEqualTime } = require('./test-utils');
const { HeatingPeriodOptimizer } = require('openhab-spot-price-optimizer/heating-period-optimizer');

// Take a backup of global items variable so that we can restore it later.
const openHABitems = items;

// Mock priceItem with required methods.
const mockPriceData = require('./test-data/prices-2023-11-08-pt60m.json');
const priceItem = {
  name: 'mockPriceItem',
  persistence: {
    countBetween: function(start, end) {
      return {
        toHours: function() {
          return 24;
        }
      };
    },
    getAllStatesBetween: function(start, end) {
      return mockPriceData;
    },
  }
};

// Mock forecastItem with required methods.
const forecastItem = {
  name: 'mockForecastItem',
  persistence: {
    averageBetween: function(start, end) {
      return {
        numericState: 10
      };
    },
    countBetween: function(start, end) {
      return {
        numericState: 6
      };
    },
  },
};

/**
 * Overrides the global.items variable.
 */
function mockItems() {
  global.items = {
    getItem: function(itemName) {
      if (itemName === parameters.priceItem) {
        return priceItem;
      }
      if (itemName === parameters.forecastItem) {
        return forecastItem;
      }
      return null;
    },
  };
}

/**
 * Restores the global.items variable.
 */
function restoreItems() {
  global.items = openHABitems;
}

// Mock GenericOptimizer service
const mockControlPoints = require('./test-data/control-points-2023-11-08-with-gaps.json');
const mockGenericOptimizer = {
  prices: [],
  calls: [],
  getPrices: () => mockControlPoints,
  getResolution: () => time.Duration.parse("PT15M"),
  setParameters: function(parameters) {

  },
  setControlForPeriod: function(datetime, duration, control) {
    this.calls.push({ datetime, duration, control });
  }
};

// Mock HeatingCalculator service
const mockHeatingCalculator = {
  setForecast: () => {},
  calculateAverageTemperature: () => 3,
  calculateHeatingHoursLinear: () => 3
};

// Mock ValidationHelper service
const mockValidationHelper = {
  validateNumber: function(input, required, min = null, max = null, mustBeInteger = false) {
    return true;
  },
  validateItemParameters: function(parameters) {
    return true;
  },
  validateHeatCurve: function(heatCurve) {
    return true;
  }
};

// Create a Mock ServiceFactory
const mockServiceFactory = {
  get: function(serviceName) {
    switch (serviceName) {
      case 'GenericOptimizer':
        return mockGenericOptimizer;
      case 'HeatingCalculator':
        return mockHeatingCalculator;
      case 'ValidationHelper':
        return mockValidationHelper;
      default:
        throw new Error(`Mock ServiceFactory: Unknown service requested: ${serviceName}`);
    }
  }
};

// Common parameters used in the tests.
const parameters = {
  priceItem:    'mockPriceItem',
  forecastItem: 'some_forecast_item',
  controlItem:  'some_control_item',
  numberOfPeriods: 4,
  dropThreshold:   3,
  shortThreshold:  0.5,
  flexDefault:     0.5,
  flexThreshold:   0.1,
  gapThreshold:    1,
  shiftPriceLimit:   2,
  heatCurve: [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ]
};

// Helper function to reset the environment between tests
function createHeatingPeriodOptimizer(start, end, params, serviceFactory = mockServiceFactory) {
  return new HeatingPeriodOptimizer(
    start,
    end,
    params,
    serviceFactory
  );
}

// Helper function to create mock heating period objects
function createMockHeatingPeriod(temp, heatingHours, flexibility) {
  return {
    temp: temp,
    heatingNeed: heatingHours,
    flexibility: flexibility,
    getAvgTemp: function() { return this.temp; },
    getHeatingNeed: function() { return this.heatingNeed; },
    setHeatingNeed: function (need) { this.heatingNeed = need; },
    setFlexibility: function (flex) { this.flexibility = flex; },
    getStart: () => {},
    toString: () => "mocked heating period"
  };
}

// Helper function to create mock heating gaps.
function createMockGap(attributes) {
  return {
    getGapStartTime: ()  => attributes.gapStartTime,
    getGapStartPrice: () => attributes.gapStartPrice,
    getGapEndTime: ()    => attributes.gapEndTime,
    getGapEndPrice: ()   => attributes.gapEndPrice,
    getGapDuration: ()   => attributes.gapDuration,
    getPreviousHeatingStartTime: ()  => attributes.previousHeatingStartTime,
    getPreviousHeatingStartPrice: () => attributes.previousHeatingStartPrice,
    getPreviousHeatingEndTime: ()    => attributes.previousHeatingEndTime,
    getPreviousHeatingEndPrice: ()   => attributes.previousHeatingEndPrice,
    getPreviousHeatingDuration: ()   => attributes.previousHeatingDuration,
    getNextHeatingStartTime: ()  => attributes.nextHeatingStartTime,
    getNextHeatingStartPrice: () => attributes.nextHeatingStartPrice,
    getNextHeatingEndTime: ()    => attributes.nextHeatingEndTime,
    getNextHeatingEndPrice: ()   => attributes.nextHeatingEndPrice,
    getNextHeatingDuration: ()   => attributes.nextHeatingDuration
  };
}

/**
 * Tests the calculateHeatingNeed method
 *
 * Scenario: Heating needs are calculated.
 *
 * Expected: Expected number of heating periods are created and they are adjacent.
 */
function testCalculateHeatingNeed() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Call method under test.
  heatingPeriodOptimizer.calculateHeatingNeeds();

  // Assert exepcted number of heating periods and that they are adjacent.
  const n = heatingPeriodOptimizer.periods.length;
  assertEqual(heatingPeriodOptimizer.periods.length, parameters.numberOfPeriods + 3, "There should be 3 more heating periods than defined in parameters.");
  assertEqualTime(heatingPeriodOptimizer.periods[0].getEnd(), heatingPeriodOptimizer.periods[1].getStart(), "HeatingPeriods should be adjacent.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: adjustHeatingNeeds with zero adjustment.
 *
 * Scenario: The adjustment is zero.
 *
 * Expected: Heating needs remain unchanged.
 */
function testAdjustHeatingNeeds_NoAdjustment() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);

  // Set adjustment to zero
  const params = { ...parameters, heatingNeedAdjustment: 0 };
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, params);

  // Mock periods with known heating needs
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10, 2, 0.5),
    createMockHeatingPeriod(5, 3, 0.5),
    createMockHeatingPeriod(0, 4, 0.5),
  ];

  // Copy original heating needs for comparison
  const originalHeatingNeeds = heatingPeriodOptimizer.periods.map(period => period.getHeatingNeed());

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeeds();

  // Verify that heating needs remain unchanged
  heatingPeriodOptimizer.periods.forEach((period, index) => {
    assertEqual(
      period.getHeatingNeed(),
      originalHeatingNeeds[index],
      `Period ${index + 1} heating need should remain unchanged.`
    );
  });

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: adjustHeatingNeeds with positive adjustment.
 *
 * Scenario: The adjustment is positive.
 *
 * Expected: Heating needs increase by adjustment / numberOfPeriods.
 */
function testAdjustHeatingNeeds_PositiveAdjustment() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);

  // Set adjustment to a positive value
  const adjustmentValue = 6;
  const numberOfPeriods = 3;
  const params = { ...parameters, heatingNeedAdjustment: adjustmentValue, numberOfPeriods };
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, params);

  // Mock periods with known heating needs
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10, 2, 0.5),
    createMockHeatingPeriod(5, 3, 0.5),
    createMockHeatingPeriod(0, 4, 0.5),
  ];

  // Expected period adjustment
  const periodAdjustment = adjustmentValue / numberOfPeriods;

  // Original heating needs for comparison
  const originalHeatingNeeds = heatingPeriodOptimizer.periods.map(period => period.getHeatingNeed());

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeeds();

  // Verify that heating needs have increased correctly
  heatingPeriodOptimizer.periods.forEach((period, index) => {
    const expectedHeatingNeed = originalHeatingNeeds[index] + periodAdjustment;
    assertEqual(
      period.getHeatingNeed(),
      expectedHeatingNeed,
      `Period ${index + 1} heating need should have increased by ${periodAdjustment}.`
    );
  });

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: adjustHeatingNeeds with negative adjustment.
 *
 * Scenario: The adjustment is negative.
 *
 * Expected: Heating needs decrease by |adjustment| / numberOfPeriods.
 */
function testAdjustHeatingNeeds_NegativeAdjustment() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);

  // Set adjustment to a negative value
  const adjustmentValue = -6;
  const numberOfPeriods = 3;
  const params = { ...parameters, heatingNeedAdjustment: adjustmentValue, numberOfPeriods };
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, params);

  // Mock periods with known heating needs
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10, 6, 0.5),
    createMockHeatingPeriod(5, 5, 0.5),
    createMockHeatingPeriod(0, 4, 0.5),
  ];

  // Expected period adjustment
  const periodAdjustment = adjustmentValue / numberOfPeriods;

  // Original heating needs for comparison
  const originalHeatingNeeds = heatingPeriodOptimizer.periods.map(period => period.getHeatingNeed());

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeeds();

  // Verify that heating needs have decreased correctly
  heatingPeriodOptimizer.periods.forEach((period, index) => {
    const expectedHeatingNeed = originalHeatingNeeds[index] + periodAdjustment;
    assertEqual(
      period.getHeatingNeed(),
      expectedHeatingNeed,
      `Period ${index + 1} heating need should have decreased by ${-periodAdjustment}.`
    );
  });

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: adjustHeatingNeeds with adjustment causing negative heating need.
 *
 * Scenario: The adjustment is negative and larger than the heating needs.
 *
 * Expected: Heating needs should not become negative.
 */
function testAdjustHeatingNeeds_AdjustmentToZero() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);

  // Set adjustment to a negative value larger than total heating need
  const adjustmentValue = -15;
  const numberOfPeriods = 3;
  const params = { ...parameters, heatingNeedAdjustment: adjustmentValue, numberOfPeriods };
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, params);

  // Mock periods with small heating needs
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10, 2, 0.5),
    createMockHeatingPeriod(5, 1, 0.5),
    createMockHeatingPeriod(0, 1, 0.5),
  ];

  // Expected period adjustment
  const periodAdjustment = adjustmentValue / numberOfPeriods;

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeeds();

  // Verify that heating needs do not become negative
  heatingPeriodOptimizer.periods.forEach((period, index) => {
    const heatingNeed = period.getHeatingNeed();
    assertEqual(
      period.getHeatingNeed(),
      0,
      `Period ${index + 1} heating need should be 0 instead of negative.`
    );
  });

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: adjustHeatingNeeds with adjustment causing maximum heating need.
 *
 * Scenario: The adjustment is positive and larger than the maximum duration.
 *
 * Expected: Heating needs should not become longer than the period.
 */
function testAdjustHeatingNeeds_AdjustmentToMax() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);

  // Set adjustment to a negative value larger than total heating need
  const adjustmentValue = 60;
  const numberOfPeriods = 3;
  const params = { ...parameters, heatingNeedAdjustment: adjustmentValue, numberOfPeriods };
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, params);

  // Mock periods with small heating needs
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10, 2, 0.5),
    createMockHeatingPeriod(5, 1, 0.5),
    createMockHeatingPeriod(0, 1, 0.5),
  ];

  // Expected period adjustment
  const periodAdjustment = 24 / numberOfPeriods;

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeeds();

  // Verify that heating needs do not become negative
  heatingPeriodOptimizer.periods.forEach((period, index) => {
    const heatingNeed = period.getHeatingNeed();
    assertEqual(
      period.getHeatingNeed(),
      periodAdjustment,
      `Period ${index + 1} heating need should be 0 instead of negative.`
    );
  });

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: No significant temperature drop.
 *
 * Scenario: No significant temperature drops between the periods.
 *
 * Expected: flexibilities and heating needs remain unchanged.
 */
function testNoTemperatureDrops() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Mock periods with temperature and heating hour values that do not trigger a drop
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(2.32, 1.69, 0.5),
    createMockHeatingPeriod(-0.30, 2.10, 0.5),
    createMockHeatingPeriod(1.15, 1.87, 0.5),
    createMockHeatingPeriod(5.88, 1.12, 0.5),
    createMockHeatingPeriod(6.10, 1.09, 0.5),
    createMockHeatingPeriod(9.23, 0.59, 1),
    createMockHeatingPeriod(10.80, 0.35, 1)
  ];

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeedForTemperatureDrops();

  // Verify each period's final state remains unchanged
  assertEqual(heatingPeriodOptimizer.periods[0].flexibility, 0.5, "Period 1 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[1].flexibility, 0.5, "Period 2 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[2].flexibility, 0.5, "Period 3 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[3].flexibility, 0.5, "Period 4 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[4].flexibility, 0.5, "Period 5 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[5].flexibility, 1, "Period 6 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[6].flexibility, 1, "Period 7 flexibility should remain unchanged.");

  // Verify that heating needs remain unchanged
  assertEqual(heatingPeriodOptimizer.periods[0].getHeatingNeed(), 1.69, "Period 1 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[1].getHeatingNeed(), 2.10, "Period 2 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[2].getHeatingNeed(), 1.87, "Period 3 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[3].getHeatingNeed(), 1.12, "Period 4 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[4].getHeatingNeed(), 1.09, "Period 5 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[5].getHeatingNeed(), 0.59, "Period 6 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[6].getHeatingNeed(), 0.35, "Period 7 heating need should remain unchanged.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: Significant temperature drop detected.
 *
 * Scenario: Two significant temperature drops in a row.
 *
 * Expected: Heating needs are adjusted and flexibilities are set to 0 for the affected periods.
 */
function testSignificantTemperatureDrops() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-10-05T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Mock periods with temperature and heating hour values that match the scenario
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(10.87, 0.34, 1),
    createMockHeatingPeriod(8.45, 0.72, 1),
    createMockHeatingPeriod(7.52, 0.87, 1),
    createMockHeatingPeriod(11.47, 0.24, 1),
    createMockHeatingPeriod(7.47, 0.87, 1),
    createMockHeatingPeriod(3.28, 1.53, 0.5),
    createMockHeatingPeriod(2.95, 1.59, 0.5)
  ];

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeedForTemperatureDrops();

  // Verify each period's final state after temperature drop compensation
  assertEqual(heatingPeriodOptimizer.periods[0].getHeatingNeed(), 0.34, "Period 1 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[1].getHeatingNeed(), 0.72, "Period 2 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[2].getHeatingNeed(), 0.87, "Period 3 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[3].getHeatingNeed(), 0.87, "Period 4 heating need should be updated.");
  assertEqual(heatingPeriodOptimizer.periods[4].getHeatingNeed(), 1.53, "Period 5 heating need should be updated.");
  assertEqual(heatingPeriodOptimizer.periods[5].getHeatingNeed(), 1.53, "Period 6 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[6].getHeatingNeed(), 1.59, "Period 7 heating need should remain unchanged.");

  // Verify flexibility adjustments
  assertEqual(heatingPeriodOptimizer.periods[3].flexibility, 0, "Period 4 flexibility should be set to 0.");
  assertEqual(heatingPeriodOptimizer.periods[4].flexibility, 0, "Period 5 flexibility should be set to 0.");
  assertEqual(heatingPeriodOptimizer.periods[5].flexibility, 0, "Period 6 flexibility should be set to 0.");
  assertEqual(heatingPeriodOptimizer.periods[6].flexibility, 0.5, "Period 7 flexibility should remain unchanged.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: Temperature drop detected.
 *
 * Scenario: One significant temperature drop in a row.
 *
 * Expected: Heating needs remain unchanged but flexibilities are set to 0 for the affected periods.
 */
function testSingleTemperatureDrop() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-10-06T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Mock periods with temperature and heating hour values that match the scenario
  heatingPeriodOptimizer.periods = [
    createMockHeatingPeriod(7.47, 0.87, 1),
    createMockHeatingPeriod(3.28, 1.53, 0.5),
    createMockHeatingPeriod(2.95, 1.59, 0.5),
    createMockHeatingPeriod(10.07, 0.46, 1),
    createMockHeatingPeriod(9.47, 0.56, 1),
    createMockHeatingPeriod(10.43, 0.41, 1),
    createMockHeatingPeriod(9.40, 0.57, 1)
  ];

  // Call the method under test
  heatingPeriodOptimizer.adjustHeatingNeedForTemperatureDrops();

  // Verify each period's final state after temperature drop compensation
  assertEqual(heatingPeriodOptimizer.periods[0].flexibility, 0, "Period 1 flexibility should be set to 0.");
  assertEqual(heatingPeriodOptimizer.periods[1].flexibility, 0, "Period 2 flexibility should be set to 0.");
  assertEqual(heatingPeriodOptimizer.periods[2].flexibility, 0.5, "Period 3 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[3].flexibility, 1, "Period 4 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[4].flexibility, 1, "Period 5 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[5].flexibility, 1, "Period 6 flexibility should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[6].flexibility, 1, "Period 7 flexibility should remain unchanged.");

  // Verify that heating needs remain unchanged
  assertEqual(heatingPeriodOptimizer.periods[0].getHeatingNeed(), 0.87, "Period 1 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[1].getHeatingNeed(), 1.53, "Period 2 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[2].getHeatingNeed(), 1.59, "Period 3 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[3].getHeatingNeed(), 0.46, "Period 4 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[4].getHeatingNeed(), 0.56, "Period 5 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[5].getHeatingNeed(), 0.41, "Period 6 heating need should remain unchanged.");
  assertEqual(heatingPeriodOptimizer.periods[6].getHeatingNeed(), 0.57, "Period 7 heating need should remain unchanged.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Tests the findGaps method.
 *
 * Scenario: Known optimization result before gap fixing is given as input.
 *
 * Expected: Gaps are detected correctly.
 */
function testFindGaps() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Call the method under test.

  // Verify that the gaps are as expected
  const actual = heatingPeriodOptimizer.findGaps();
  const expected = require('./test-data/gaps-2023-11-08.json');
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), "Calculated gaps should match to the correct ones.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: getShortPeriodShiftDirection with both prices null.
 *
 * Scenario: Both shiftRightPrice and shiftLeftPrice are null.
 *
 * Expected: null is returned since no shift is possible.
 */
function testGetShortPeriodShiftNoDirections() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  const currentGap  = createMockGap({gapEndPrice: null});
  const direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, null);

  assertBoolean(direction, false, "If no direction is available, the direction should be false.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: getShortPeriodShiftDirection with no other heating periods on the left.
 *
 * Scenario: No earlier heating periods on the left.
 *
 * Expected: Return the direction for the available price.
 */
function testGetShortPeriodShiftOnlyOneDirectionPossible() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Left is not available, right is available
  let previousGap = createMockGap({ previousHeatingEndTime: null });
  let currentGap  = createMockGap({ gapEndPrice: 12 });
  let direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);
  assertEqual(direction, "right", "Should shift right when only right is available.");

  // Right is not available, left is available
  previousGap = createMockGap({ gapStartPrice: 12 });
  currentGap  = createMockGap({ gapStartPrice: 12, gapEndPrice: null });
  direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);

  assertEqual(direction, "left", "Should shift left when only left is available.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: getShortPeriodShiftDirection with both prices available.
 *
 * Scenario: Both shiftRightPrice and shiftLeftPrice are available.
 *
 * Expected: Shift in the direction of the lower price.
 */
function testGetShortPeriodShiftDirectionComparePrices() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Left price is smaller
  let previousGap = createMockGap({ gapStartPrice: 1 });
  let currentGap  = createMockGap({ gapEndPrice: 2 });
  let direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);
  assertEqual(direction, "left", "Should shift left when left price is smaller.");

  // Right price is smaller
  previousGap = createMockGap({ gapStartPrice: 2 });
  currentGap  = createMockGap({ gapEndPrice: 1 });
  direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);
  assertEqual(direction, "right", "Should shift right when right price is smaller.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: getShortPeriodShiftDirection with shift allowed.
 *
 * Scenario: The price difference between gaps is within the shiftPriceLimit.
 *
 * Expected: Shifting is allowed in the direction of the lower price.
 */
function testGetShortPeriodShiftDirectionAllowedShift() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Set a shiftPriceLimit that allows shifting (price difference is within limit)
  heatingPeriodOptimizer.shiftPriceLimit = 2;

  // Left price is lower and within the limit
  const previousGap = createMockGap({ gapStartPrice: 11, previousHeatingStartPrice: 10 });
  const currentGap  = createMockGap({ gapEndPrice: 12 });

  // Call the method under test
  const direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);

  // Assert that shifting to the left is allowed
  assertEqual(direction, 'left', "Should shift left when price difference is within shiftPriceLimit and left price is lower.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: getShortPeriodShiftDirection with shift restricted.
 *
 * Scenario: The price difference between gaps exceeds the shiftPriceLimit.
 *
 * Expected: No shifting is allowed.
 */
function testGetShortPeriodShiftDirectionRestrictedShift() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-08T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Set a shiftPriceLimit that restricts shifting (price difference exceeds limit)
  heatingPeriodOptimizer.shiftPriceLimit = 2;

  // Left price is lower but exceeds the limit
  const previousGap = createMockGap({ gapStartPrice: 12});
  const currentGap  = createMockGap({ gapEndPrice: 11, previousHeatingStartPrice: 8 });

  // Call the method under test
  const direction = heatingPeriodOptimizer.getShortPeriodShiftDirection(currentGap, previousGap);

  // Assert that no shifting is allowed due to shiftPriceLimit
  assertBoolean(direction, false, "No shift should be allowed when price difference exceeds shiftPriceLimit.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Test: mergeShortPeriods with two gaps and a long heating period in between.
 *
 * Scenario: There is a long heating period between two gaps that is longer than the shortThreshold, so merging should not take place.
 *
 * Expected: The heating periods should not be merged by shifting.
 */
function testMergeLongPeriodWithTwoGaps() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2024-10-04T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // This is our threshold for merging.
  heatingPeriodOptimizer.shortThreshold = 1;

  // Define two gaps with a long heating period between them
  const gap1 = createMockGap({
    gapStartTime: time.toZDT('2024-10-04T02:45Z'),
    gapStartPrice: 15,
    gapEndTime: time.toZDT('2023-11-08T10:00Z'),
    gapEndPrice: 20,
    previousHeatingEndTime: time.toZDT('2024-10-04T02:30Z'),
  });

  const gap2 = createMockGap({
    gapStartTime: time.toZDT('2024-10-04T12:00Z'),
    gapStartPrice: 10,
    gapEndTime: time.toZDT('2024-10-04T18:30Z'),
    gapEndPrice: 23,
    previousHeatingStartTime: time.toZDT('2024-10-04T10:00Z'),
    previousHeatingDuration: time.Duration.ofHours(2), // longer than threshold
  });

  // Mock findGaps to return the two gaps
  heatingPeriodOptimizer.findGaps = () => [gap1, gap2];

  // Mock shiftHeating to track if it gets called
  let shiftHeatingCalled = false;
  heatingPeriodOptimizer.shiftHeating = (gap, direction) => {
    shiftHeatingCalled = true;
    console.log(`shiftHeating called for gap starting at ${gap.getGapStartTime()} with direction ${direction}`);
  };

  // Call the method under test
  heatingPeriodOptimizer.mergeShortPeriods();

  // Assert that shiftHeating was NOT called since the heating period is longer than the shortThreshold
  assertEqual(shiftHeatingCalled, false, "shiftHeating should not be called for the long heating period between the two gaps.");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Tests the shiftHeatingLeft
 */
function testShiftHeatingLeft() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-12T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Mock the HeatingGap
  const mockGap = {
    getGapStartTime: ()             => time.toZDT('2023-11-12T04:00Z'),
    getGapDuration: ()              => time.Duration.parse('PT1H'),
    getNextHeatingEndTime: ()       => time.toZDT('2023-11-12T05:30Z'),
    getPreviousHeatingStartTime: () => time.toZDT('2023-11-12T00:00Z')
  };

  // Clear previous calls to the mockGenericOptimizer
  mockGenericOptimizer.calls = [];

  // Call the method under test
  heatingPeriodOptimizer.shiftHeatingLeft(mockGap);

  // Check that setControlForPeriod was called twice with the correct arguments
  const expectedCalls = [
    {
      datetime: mockGap.getGapStartTime(),
      duration: mockGap.getGapDuration(),
      control: 1
    },
    {
      datetime: mockGap.getNextHeatingEndTime().minus(mockGap.getGapDuration()).plus(mockGenericOptimizer.getResolution()),
      duration: mockGap.getGapDuration(),
      control: 0
    }
  ];

  // Verify the first call sets control = 1 for the start time
  assertEqual(JSON.stringify(mockGenericOptimizer.calls[0]), JSON.stringify(expectedCalls[0]), "First call should set control = 1 for the gap start datetime");

  // Verify the second call sets control = 0 for the adjusted next heating end time
  assertEqual(JSON.stringify(mockGenericOptimizer.calls[1]), JSON.stringify(expectedCalls[1]), "Second call should set control = 0 for the next heating end");

  // Cleanup: restore mocked items.
  restoreItems();
}

/**
 * Tests the shiftHeatingRight
 */
function testShiftHeatingRight() {
  // Mock items.
  mockItems();

  const start = time.toZDT('2023-11-12T00:00');
  const end = start.plusDays(1);
  const heatingPeriodOptimizer = createHeatingPeriodOptimizer(start, end, parameters);

  // Mock the HeatingGap
  const mockGap = {
    getGapStartTime: ()             => time.toZDT('2023-11-12T04:00Z'),
    getGapDuration: ()              => time.Duration.parse('PT1H'),
    getNextHeatingEndTime: ()       => time.toZDT('2023-11-12T05:30Z'),
    getPreviousHeatingStartTime: () => time.toZDT('2023-11-12T00:00Z')
  };

  // Clear previous calls to the mockGenericOptimizer
  mockGenericOptimizer.calls = [];

  // Call the method under test
  heatingPeriodOptimizer.shiftHeatingRight(mockGap);

  // Check that setControlForPeriod was called twice with the correct arguments
  const expectedCalls = [
    {
      datetime: mockGap.getGapStartTime(),
      duration: mockGap.getGapDuration(),
      control: 1
    },
    {
      datetime: mockGap.getPreviousHeatingStartTime(),
      duration: mockGap.getGapDuration(),
      control: 0
    }
  ];

  // Verify the first call sets control = 1 for the start time
  assertEqual(JSON.stringify(mockGenericOptimizer.calls[0]), JSON.stringify(expectedCalls[0]), "First call should set control = 1 for the gap start datetime");

  // Verify the second call sets control = 0 for the adjusted next heating end time
  assertEqual(JSON.stringify(mockGenericOptimizer.calls[1]), JSON.stringify(expectedCalls[1]), "Second call should set control = 0 for the previous heating start");

  // Cleanup: restore mocked items.
  restoreItems();
}

// Export the test functions
module.exports = {
  testCalculateHeatingNeed,
  testAdjustHeatingNeeds_NoAdjustment,
  testAdjustHeatingNeeds_PositiveAdjustment,
  testAdjustHeatingNeeds_NegativeAdjustment,
  testAdjustHeatingNeeds_AdjustmentToZero,
  testAdjustHeatingNeeds_AdjustmentToMax,
  testNoTemperatureDrops,
  testSignificantTemperatureDrops,
  testSingleTemperatureDrop,
  testFindGaps,
  testGetShortPeriodShiftNoDirections,
  testGetShortPeriodShiftOnlyOneDirectionPossible,
  testGetShortPeriodShiftDirectionComparePrices,
  testGetShortPeriodShiftDirectionAllowedShift,
  testGetShortPeriodShiftDirectionRestrictedShift,
  testMergeLongPeriodWithTwoGaps,
  testShiftHeatingLeft,
  testShiftHeatingRight
}
