const { assertAlmostEqual } = require('./test-utils');
const { HeatingCalculator } = require('openhab-spot-price-optimizer/heating-calculator');

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario: PT24H period i.e. default multiplier.
 *
 * Expected: The method should return the heating need.
 */
function testCalculateHeatingHoursLinear() {
  const heatingCalculator = new HeatingCalculator();
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  const temperature = 1.52;
  const result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 7.25, 0.01, "Calculate heating hours for temperature 1.52°C with 24H data");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario:
 * - PT24H period i.e. default multiplier.
 * - Upper and lower limits of the heat curve
 *
 * Expected: The method should return the upper / lower limit of heat curve.
 */
function testCalculateHeatingHoursLinearCurveLimits() {
  const heatingCalculator = new HeatingCalculator();
  let curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];

  // Lower limit of the curve i.e. max heating.
  let temperature = -25;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 24, 0.01, "Calculate heating hours for temperature -25°C with 24H period");

  // Upper limit of the curve i.e. no heating
  temperature = 13;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 0, 0.01, "Calculate heating hours for temperature 13°C with 24H period");

  // Upper limit of the curve with always minimum amout of heating
  curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 2 }
  ];
  temperature = 30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 2, 0.01, "Calculate heating hours for temperature 30°C with 24H period");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario: PT6H period i.e. multiplier 0.25.
 *
 * Expected: The method should return the heating need.
 */
function testCalculateHeatingHoursLinearPT6H() {
  const heatingCalculator = new HeatingCalculator();
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  const temperature = 2.33;
  const result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, 0.25);
  assertAlmostEqual(result, 1.68, 0.01, "Calculate heating hours for temperature 2.33°C with 6H period");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario:
 * - PT6H period i.e. multiplier 0.25.
 * - Upper and lower limits of the heat curve
 *
 * Expected:
 * - The method should return the upper / lower limit of heat curve.
 * - But scaled to the duration of the heating period.
 */
function testCalculateHeatingHoursLinearPT6HCurveLimits() {
  const heatingCalculator = new HeatingCalculator();
  let curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];

  // Lower limit of the curve i.e. max heating.
  let temperature = -25;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, 0.25);
  assertAlmostEqual(result, 6, 0.01, "Calculate heating hours for temperature -25°C with 6H period");

  // Upper limit of the curve i.e. no heating
  temperature = 13;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, 0.25);
  assertAlmostEqual(result, 0, 0.01, "Calculate heating hours for temperature 13°C with 6H period");

  // Upper limit of the curve with always minimum amout of heating
  curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 2 }
  ];
  temperature = 30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature, 0.25);
  assertAlmostEqual(result, 0.5, 0.01, "Calculate heating hours for temperature 30°C with 6H period");
}

// Export the test functions
module.exports = {
  testCalculateHeatingHoursLinear,
  testCalculateHeatingHoursLinearCurveLimits,
  testCalculateHeatingHoursLinearPT6H,
  testCalculateHeatingHoursLinearPT6HCurveLimits
}