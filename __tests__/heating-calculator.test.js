const { assertAlmostEqual } = require('./test-utils');
const { assertNull }        = require('./test-utils');
const { HeatingCalculator } = require('openhab-spot-price-optimizer/heating-calculator');

/**
 * Tests the calculateAverageTemperature method.
 *
 * Scenario: Weather forecast array contains data in expected format.
 *
 * Expected: The method should return average temperature.
 */
function testCalculateAverageTemperature() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = require('./test-data/forecast-2023-11-01.json');
  heatingCalculator.setForecast(forecast);
  const result = heatingCalculator.calculateAverageTemperature();
  assertAlmostEqual(result, 2.31, 0.01, "Calculate average temperature with 24H forecast data.");
}

/**
 * Tests the calculateAverageTemperature method.
 *
 * Scenario: When the forecast array is empty.
 *
 * Expected: The method should return null.
 */
function testCalculateAverageTemperatureEmptyForecast() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = [];
  heatingCalculator.setForecast(forecast);
  const result = heatingCalculator.calculateAverageTemperature();
  assertNull(result, "Calculate average temperature with empty forecast data.");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario: Weather forecast array contains PT24H worth of data.
 *
 * Expected: The method should return the heating need.
 */
function testCalculateHeatingHoursLinear() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = require('./test-data/forecast-2023-11-01.json');
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  heatingCalculator.setForecast(forecast);
  const temperature = 1.52;
  const result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 7.25, 0.01, "Calculate heating hours for temperature 1.52°C with 24H data");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario:
 * - Weather forecast array contains PT24H worth of data.
 * - Upper and lower limits of the heat curve
 *
 * Expected: The method should return the upper / lower limit of heat curve.
 */
function testCalculateHeatingHoursLinearCurveLimits() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = require('./test-data/forecast-2023-11-01.json');

  let curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  heatingCalculator.setForecast(forecast);

  // Lower limit of the curve i.e. max heating.
  let temperature = -25;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 24, 0.01, "Calculate heating hours for temperature -25°C with 24H data");

  // Upper limit of the curve i.e. no heating
  temperature = 13;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 0, 0.01, "Calculate heating hours for temperature 13°C with 24H data");

  // Upper limit of the curve with always minimum amout of heating
  curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 2 }
  ];
  heatingCalculator.setForecast(forecast);
  temperature = 30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 2, 0.01, "Calculate heating hours for temperature 30°C with 24H data");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario: Weather forecast array contains PT24H worth of data.
 *
 * Expected: The method should return the heating need.
 */
function testCalculateHeatingHoursLinearPT6H() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = require('./test-data/forecast-2023-11-01-PT6H.json');
  const curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  heatingCalculator.setForecast(forecast);
  const temperature = 2.33;
  const result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 1.68, 0.01, "Calculate heating hours for temperature 2.33°C with 6H data");
}

/**
 * Tests the calculateHeatingHoursLinear method.
 *
 * Scenario:
 * - Weather forecast array contains PT6H worth of data.
 * - Upper and lower limits of the heat curve
 *
 * Expected:
 * - The method should return the upper / lower limit of heat curve.
 * - But scaled to the duration of the heating period.
 */
function testCalculateHeatingHoursLinearPT6HCurveLimits() {
  const heatingCalculator = new HeatingCalculator();
  const forecast = require('./test-data/forecast-2023-11-01-PT6H.json');
  let curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 0 }
  ];
  heatingCalculator.setForecast(forecast);

  // Lower limit of the curve i.e. max heating.
  let temperature = -25;
  let result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 6, 0.01, "Calculate heating hours for temperature -25°C with 24H data");

  // Upper limit of the curve i.e. no heating
  temperature = 13;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 0, 0.01, "Calculate heating hours for temperature 13°C with 24H data");

  // Upper limit of the curve with always minimum amout of heating
  curve = [
    { temperature: -25, hours: 24 },
    { temperature: 13,  hours: 2 }
  ];
  heatingCalculator.setForecast(forecast);
  temperature = 30;
  result = heatingCalculator.calculateHeatingHoursLinear(curve, temperature);
  assertAlmostEqual(result, 0.5, 0.01, "Calculate heating hours for temperature 30°C with 24H data");
}

// Export the test functions
module.exports = {
  testCalculateAverageTemperature,
  testCalculateAverageTemperatureEmptyForecast,
  testCalculateHeatingHoursLinear,
  testCalculateHeatingHoursLinearCurveLimits,
  testCalculateHeatingHoursLinearPT6H,
  testCalculateHeatingHoursLinearPT6HCurveLimits
}