const { assertBoolean }  = require('./test-utils');
const { assertEqual }    = require('./test-utils');
const { HeatingGap }     = require('openhab-spot-price-optimizer/heating-gap');

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Day starts with heating, followed by a gap. Shift left is allowed.
 *
 * Expected: Shift left is allowed, shift right is not allowed.
 */
function testStartOfDayHeating() {
  const gapStart             = {datetime: "2023-10-31T22:30Z", value: 5.6707};
  const previousHeatingStart = {datetime: "2023-10-31T22:00Z", value: 5.6707};
  const previousHeatingEnd   = {datetime: "2023-10-31T22:15Z", value: 5.6707};
  const nextHeatingStart     = {datetime: "2023-10-31T23:00Z", value: 4.7147};
  const nextHeatingEnd       = {datetime: "2023-11-01T03:45Z", value: 4.6576};

  const dayStart   = time.toZDT("2023-10-31T22:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT30M");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), true, "Checking that shift left is allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), false, "Checking that shift right is not allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'left', "Checking shift direction is left.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Day ends with heating, preceeded by a gap. Shift right is allowed.
 *
 * Expected: Shift left is not allowed, shift right is allowed.
 */
function testEndOfDayHeating() {
  const gapStart             = {datetime: "2023-11-02T20:15Z", value: 8.5326};
  const previousHeatingStart = {datetime: "2023-11-02T20:00Z", value: 8.5326};
  const previousHeatingEnd   = {datetime: "2023-11-02T20:00Z", value: 8.5326};
  const nextHeatingStart     = {datetime: "2023-11-02T21:00Z", value: 8.1582};

  const dayStart   = time.toZDT("2023-11-01T22:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT45M");
  const threshold = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), false, "Checking that shift left is not allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), true, "Checking that shift right is allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'right', "Checking shift direction is right.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Day starts with a gap, followed by heating. Shift left is allowed.
 *
 * Expected: Shift left is allowed, shift right is not allowed.
 */
function testStartOfDayGap() {
  const gapStart             = {datetime: "2023-10-27T21:00Z", value: 9.8867};
  const nextHeatingStart     = {datetime: "2023-10-27T22:00Z", value: 9.3994};
  const nextHeatingEnd       = {datetime: "2023-10-28T04:45Z", value: 9.6176};

  const dayStart   = time.toZDT("2023-10-27T21:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT1H");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), true, "Checking that shift left is allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), false, "Checking that shift right is not allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'left', "Checking shift direction is left.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Day ends with a gap, preceeded by heating. Shift right is allowed.
 *
 * Expected: Shift left is not allowed, shift right is allowed.
 */
function testEndOfDayGap() {
  const gapStart             = {datetime: "2023-10-25T20:30Z", value: 8.1966};
  const previousHeatingStart = {datetime: "2023-10-25T18:00Z", value: 7.6374};
  const previousHeatingEnd   = {datetime: "2023-10-25T20:15Z", value: 8.1966};

  const dayStart   = time.toZDT("2023-10-25T21:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT30M");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), false, "Checking that shift left is not allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), true, "Checking that shift right is allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'right', "Checking shift direction is right.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Middle of the day gap, shift left allowed, shift right too expensive.
 *
 * Expected: Shift left is allowed, shift right is not allowed.
 */
function testShiftRightTooExpensive() {
  const gapStart             = {datetime: "2023-11-15T12:00Z", value: 23.6494};
  const previousHeatingStart = {datetime: "2023-11-15T11:00Z", value: 19.3218};
  const previousHeatingEnd   = {datetime: "2023-11-15T11:45Z", value: 19.3218};
  const nextHeatingStart     = {datetime: "2023-11-15T13:00Z", value: 20.0869};
  const nextHeatingEnd       = {datetime: "2023-11-15T13:00Z", value: 20.0869};

  const dayStart   = time.toZDT("2023-11-15T22:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT60M");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 3.6;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), true, "Checking that shift left is allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), false, "Checking that shift right is not allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'left', "Checking shift direction is left.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Middle of the day gap, shift left too expensive, shift right allowed.
 *
 * Expected: Shift left is not allowed, shift right is allowed.
 */
function testShiftLeftTooExpensive() {
  const gapStart             = {datetime: "2023-11-15T12:00Z", value: 23.6494};
  const previousHeatingStart = {datetime: "2023-11-15T11:00Z", value: 20.0869};
  const previousHeatingEnd   = {datetime: "2023-11-15T11:45Z", value: 20.0869};
  const nextHeatingStart     = {datetime: "2023-11-15T13:00Z", value: 19.3218};
  const nextHeatingEnd       = {datetime: "2023-11-15T13:00Z", value: 19.3218};

  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT60M");
  const dayStart   = time.toZDT("2023-11-15T22:00Z");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 3.6;

  const gap = new HeatingGap(gapStart, resolution);
  gap.setGapDuration(duration);
  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), false, "Checking that shift left is not allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), true, "Checking that shift right is allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'right', "Checking shift direction is right.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Middle of the day gap, which is too long to be shifted.
 *
 * Expected: Shift left is not allowed, shift right is not allowed.
 */
function testTooLongGap() {
  const gapStart             = {datetime: "2023-11-12T06:00Z", value: 7.1240};
  const previousHeatingStart = {datetime: "2023-11-12T05:00Z", value: 6.9826};
  const previousHeatingEnd   = {datetime: "2023-11-12T05:45Z", value: 6.9826};
  const nextHeatingStart     = {datetime: "2023-11-12T09:00Z", value: 8.0292};
  const nextHeatingEnd       = {datetime: "2023-11-12T09:45Z", value: 8.0292};

  const dayStart   = time.toZDT("2023-11-12T22:00Z");
  const resolution = time.Duration.parse("PT15M");
  const duration   = time.Duration.parse("PT3H");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);

  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);
  gap.setGapDuration(duration);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), false, "Checking that shift left is not allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), false, "Checking that shift right is not allowed.");
  assertBoolean(gap.getShiftDirection(threshold, priceLimit, dayStart), false, "Checking shift direction is false.");
}

/**
 * Tests the shiftLeftAllowed and shiftRightAllowed methods.
 *
 * Scenario: Middle of the day gap, both directions allowed.
 *
 * Expected: Both directions allowed, choosing cheaper.
 */
function testBothAllowed() {
  const gapStart             = {datetime: "2023-11-10T16:15Z", value: 12.5};
  const previousHeatingStart = {datetime: "2023-11-10T15:45Z", value: 11.5};
  const previousHeatingEnd   = {datetime: "2023-11-10T16:00Z", value: 11.5};
  const nextHeatingStart     = {datetime: "2023-11-10T16:30Z", value: 12.0};
  const nextHeatingEnd       = {datetime: "2023-11-10T16:45Z", value: 12.0};

  const dayStart   = time.toZDT("2023-11-10T22:00Z");
  const resolution = time.Duration.parse("PT15M");
  const threshold  = time.Duration.parse("PT1H");
  const priceLimit = 2;

  const gap = new HeatingGap(gapStart, resolution);

  gap.setPreviousHeatingStart(previousHeatingStart);
  gap.setPreviousHeatingEnd(previousHeatingEnd);
  gap.setNextHeatingStart(nextHeatingStart);
  gap.setNextHeatingEnd(nextHeatingEnd);

  assertBoolean(gap.shiftLeftAllowed(threshold, priceLimit), true, "Checking that shift left is allowed.");
  assertBoolean(gap.shiftRightAllowed(threshold, priceLimit, dayStart), true, "Checking that shift right allowed.");
  assertEqual(gap.getShiftDirection(threshold, priceLimit, dayStart), 'right', "Checking shift direction is right.");
}


// Export the test functions
module.exports = {
  testStartOfDayHeating,
  testEndOfDayHeating,
  testStartOfDayGap,
  testEndOfDayGap,
  testShiftRightTooExpensive,
  testShiftLeftTooExpensive,
  testTooLongGap,
  testBothAllowed
}