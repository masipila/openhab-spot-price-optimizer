const { assertAlmostEqual } = require('./test-utils');
const { assertEqual }       = require('./test-utils');
const { assertNull }        = require('./test-utils');
const { HeatingCalculator } = require('openhab-spot-price-optimizer/heating-calculator');
const { HeatingPeriod }     = require('openhab-spot-price-optimizer/heating-period');

/**
 * Tests the HeatingPeriod class.
 *
 * Scenario: Heating need is above the flexibility threshold
 *
 * Expected: Object is initialized with correct values.
 */
function testHeatingPeriodAboveFlexThreshold() {
  const start = time.toZDT('2023-11-01T00:00');
  const end = start.plusHours(6);
  const forecast = require('./test-data/forecast-2023-11-01-PT6H.json');
  const heatCurve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  const heatingCalculator = new HeatingCalculator();
  const heatingPeriod = new HeatingPeriod(heatingCalculator, start, end, forecast, heatCurve, 0.6, 1.0);
  assertAlmostEqual(heatingPeriod.getAvgTemp(), 2.33, 0.01, "Calculate average temperature on initialization");
  assertAlmostEqual(heatingPeriod.getHeatingNeed(), 1.68, 0.01, "Calculate heating need on initialization");
  assertAlmostEqual(heatingPeriod.getNonFlexNeed(), 0.67, 0.01, "Calculate non-flexible heating need on initialization");
  assertAlmostEqual(heatingPeriod.getFlexNeed(), 1.01, 0.01, "Calculate flexible heating need on initialization");
}

/**
 * Tests the HeatingPeriod class.
 *
 * Scenario: Heating need is below the flexibility threshold
 *
 * Expected: Object is initialized with correct values.
 */
function testHeatingPeriodBelowFlexThreshold() {
  const start = time.toZDT('2023-11-01T00:00');
  const end = start.plusHours(6);
  const forecast = require('./test-data/forecast-2023-11-01-PT6H.json');
  const heatCurve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  const heatingCalculator = new HeatingCalculator();
  const heatingPeriod = new HeatingPeriod(heatingCalculator, start, end, forecast, heatCurve, 0.5, 2.0);
  assertAlmostEqual(heatingPeriod.getAvgTemp(), 2.33, 0.01, "Calculate average temperature on initialization");
  assertAlmostEqual(heatingPeriod.getHeatingNeed(), 1.68, 0.01, "Calculate heating need on initialization");
  assertAlmostEqual(heatingPeriod.getNonFlexNeed(), 0, 0.01, "Calculate non-flexible heating need on initialization");
  assertAlmostEqual(heatingPeriod.getFlexNeed(), 1.68, 0.01, "Calculate flexible heating need on initialization");
}


// Export the test functions
module.exports = {
  testHeatingPeriodAboveFlexThreshold,
  testHeatingPeriodBelowFlexThreshold
}