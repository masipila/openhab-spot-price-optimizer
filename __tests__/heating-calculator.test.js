const { assertAlmostEqual } = require('./test-utils');
const { HeatingCalculator } = require('openhab-spot-price-optimizer/heating-calculator');

/**
 * Tests the calculateHeatingHoursLinear method with multiple points.
 *
 * Scenario: PT24H period i.e. default multiplier.
 *
 * Expected: The method should return the correct heating need by interpolating between the correct points.
 */
function testCalculateHeatingHoursLinearMultiplePoints() {
  const heatingCalculator = new HeatingCalculator();
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 2,   hours: 7 },
    { temperature: 13,  hours: 2 }
  ];

  // Test temperature between -25 and 2 degrees
  let temperature = -10;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  let expected = 14.5555; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -10°C with multiple points");

  // Test temperature between 2 and 13 degrees
  temperature = 8;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 4.2727; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 8°C with multiple points");

  // Test temperature exactly at a curve point
  temperature = 2;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 7;
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 2°C (exact curve point) with multiple points");

  // Test temperature below minimum temperature
  temperature = -30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 24; // Max hours at coldest temperature
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -30°C (below curve) with multiple points");

  // Test temperature above maximum temperature
  temperature = 20;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 2; // Min hours at warmest temperature
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 20°C (above curve) with multiple points");
}

/**
 * Tests the calculateHeatingHoursLinear method with multiple points and PT6H period (multiplier 0.25).
 *
 * Expected: The method should return the correct heating need scaled by the multiplier.
 */
function testCalculateHeatingHoursLinearMultiplePointsPT6H() {
  const heatingCalculator = new HeatingCalculator();
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 2,   hours: 7 },
    { temperature: 13,  hours: 2 }
  ];

  const multiplier = 0.25; // For a 6-hour period

  // Test temperature between -25 and 2 degrees
  let temperature = -15;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, multiplier);
  let expected = 17.7037 * multiplier; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -15°C with multiple points and PT6H period");

  // Test temperature between 2 and 13 degrees
  temperature = 5;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, multiplier);
  expected = 5.6364 * multiplier; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 5°C with multiple points and PT6H period");

  // Test temperature exactly at a curve point
  temperature = -25;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, multiplier);
  expected = 24 * multiplier;
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -25°C (exact curve point) with multiple points and PT6H period");

  // Test temperature below minimum temperature
  temperature = -30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, multiplier);
  expected = 24 * multiplier; // Max hours at coldest temperature
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -30°C (below curve) with multiple points and PT6H period");

  // Test temperature above maximum temperature
  temperature = 20;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, multiplier);
  expected = 2 * multiplier; // Min hours at warmest temperature
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 20°C (above curve) with multiple points and PT6H period");
}

/**
 * Tests the calculateHeatingHoursLinear method with a more complex curve.
 *
 * Scenario: Curve with more points, testing interpolation in different segments.
 *
 * Expected: The method should interpolate correctly in each segment.
 */
function testCalculateHeatingHoursLinearComplexCurve() {
  const heatingCalculator = new HeatingCalculator();
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: -10, hours: 18 },
    { temperature: 0,   hours: 12 },
    { temperature: 10,  hours: 6 },
    { temperature: 20,  hours: 0 }
  ];

  // Test temperature between -25 and -10 degrees
  let temperature = -20;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  let expected = 22; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature -20°C with complex curve");

  // Test temperature between 0 and 10 degrees
  temperature = 5;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 9; // Calculated interpolation result
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 5°C with complex curve");

  // Test temperature exactly at a curve point
  temperature = 0;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  expected = 12;
  assertAlmostEqual(result, expected, 0.01, "Calculate heating hours for temperature 0°C (exact curve point) with complex curve");
}

// Export the test functions
module.exports = {
  testCalculateHeatingHoursLinearMultiplePoints,
  testCalculateHeatingHoursLinearMultiplePointsPT6H,
  testCalculateHeatingHoursLinearComplexCurve
};
