const { LoadCalculator } = require('openhab-spot-price-optimizer/load-calculator');
const { assertEqual, assertEqualTime, assertNull } = require('./test-utils');

/**
 * Tests the initialize method of LoadCalculator.
 *
 * Scenario: Valid parameters (start, end, item, reset) are passed to the initialize method.
 *
 * Expected Result:
 * - Start and end times are set correctly.
 * - Load data is initialized with the correct number of intervals based on 15-minute resolution.
 * - Load values are set to zero when reset is true.
 */
function testInitializeWithValidParameters() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T22:00:00Z");
  const end = time.toZDT("2024-01-02T22:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  assertEqualTime(calculator.start, start, "Start time should be set correctly.");
  assertEqualTime(calculator.end, end, "End time should be set correctly.");
  assertEqual(calculator.loadData.length, 96, "Load data should contain 96 intervals (15-minute resolution).");
}

/**
 * Tests the initialize method of LoadCalculator with reset.
 *
 * Scenario: The reset parameter is set to true.
 *
 * Expected Result:
 * - Load data is initialized with all values set to zero.
 */
function testInitializeWithReset() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T00:00:00Z");
  const end = time.toZDT("2024-01-01T01:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  assertEqual(calculator.loadData.every(data => data.load === 0), true, "All loads should be reset to 0.");
}

/**
 * Tests the addStaticLoad method of LoadCalculator.
 *
 * Scenario: A static load is added within valid bounds.
 *
 * Expected Result:
 * - Load values are updated correctly for the affected intervals.
 */
function testAddStaticLoadWithinBounds() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T00:00:00Z");
  const end = time.toZDT("2024-01-01T01:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  const loadStart = time.toZDT("2024-01-01T00:15:00Z");
  const loadEnd = time.toZDT("2024-01-01T00:45:00Z");
  calculator.addStaticLoad(loadStart, loadEnd, 2);

  assertEqual(calculator.loadData[0].load, 0, "First interval should remain unchanged.");
  assertEqual(calculator.loadData[1].load, 2, "Second interval should have a load of 2.");
  assertEqual(calculator.loadData[2].load, 2, "Third interval should have a load of 2.");
  assertEqual(calculator.loadData[3].load, 0, "Fourth interval should remain unchanged.");
}

/**
 * Tests the addStaticLoad method of LoadCalculator.
 *
 * Scenario: A static load is added with start or end times out of bounds.
 *
 * Expected Result:
 * - No changes are made to the load data.
 * - An error message is logged.
 */
function testAddStaticLoadOutOfBounds() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T00:00:00Z");
  const end = time.toZDT("2024-01-01T01:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  const loadStart = time.toZDT("2023-12-31T23:45:00Z"); // Out of bounds
  const loadEnd = time.toZDT("2024-01-01T00:15:00Z");

  calculator.addStaticLoad(loadStart, loadEnd, 2);

  assertEqual(calculator.loadData.every(data => data.load === 0), true, "Load data should remain unchanged.");
}

/**
 * Tests the addDynamicLoad method of LoadCalculator.
 *
 * Scenario: A valid timeseries of control points is provided.
 *
 * Expected Result:
 * - Load values are updated correctly for intervals where control points are set to 1.
 */
function testAddDynamicLoadWithValidTimeseries() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T00:00:00Z");
  const end = time.toZDT("2024-01-01T01:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  const timeseries = {
    begin: "2024-01-01T00:00:00Z",
    end: "2024-01-01T01:00:00Z",
    size: 4,
    states: [
      ["2024-01-01T00:00:00Z", "0"],
      ["2024-01-01T00:15:00Z", "1"],
      ["2024-01-01T00:30:00Z", "1"],
      ["2024-01-01T00:45:00Z", "0"]
    ]
  };

  calculator.addDynamicLoad(timeseries, 3);

  assertEqual(calculator.loadData[0].load, 0, "First interval should remain 0.");
  assertEqual(calculator.loadData[1].load, 3, "Second interval should have a load of 3.");
  assertEqual(calculator.loadData[2].load, 3, "Third interval should have a load of 3.");
  assertEqual(calculator.loadData[3].load, 0, "Fourth interval should remain 0.");
}

/**
 * Tests the addDynamicLoad method of LoadCalculator.
 *
 * Scenario: The timeseries start time does not match the LoadCalculator start time.
 *
 * Expected Result:
 * - No changes are made to the load data.
 * - An error message is logged.
 */
function testAddDynamicLoadStartMismatch() {
  const calculator = new LoadCalculator();
  const start = time.toZDT("2024-01-01T00:00:00Z");
  const end = time.toZDT("2024-01-01T01:00:00Z");
  const mockItem = { persistence: { countBetween: () => 0 } };

  calculator.initialize(start, end, mockItem, true);

  const timeseries = {
    begin: "2024-01-01T00:15:00Z", // Start mismatch
    end: "2024-01-01T01:00:00Z",
    size: 4,
    states: []
  };

  calculator.addDynamicLoad(timeseries, 3);

  assertEqual(calculator.loadData.every(data => data.load === 0), true, "Load data should remain unchanged.");
}

module.exports = {
  testInitializeWithValidParameters,
  testInitializeWithReset,
  testAddStaticLoadWithinBounds,
  testAddStaticLoadOutOfBounds,
  testAddDynamicLoadWithValidTimeseries,
  testAddDynamicLoadStartMismatch
};
