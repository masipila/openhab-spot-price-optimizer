const { assertBoolean } = require('./test-utils');
const { ValidationHelper } = require('openhab-spot-price-optimizer/validation-helper');

function testValidateNumber() {
  const validator = new ValidationHelper();

  // Input is required but missing (undefined)
  assertBoolean(validator.validateNumber(undefined, true), false, 'Input is required but missing (undefined).');

  // Input is required but missing (null)
  assertBoolean(validator.validateNumber(null, true), false, 'Input is required but missing (null).');

  // Input is optional and missing (undefined)
  assertBoolean(validator.validateNumber(undefined, false), true, 'Input is optional and missing (undefined).');

  // Input is optional and missing (null)
  assertBoolean(validator.validateNumber(null, false), true, 'Input is optional and missing (null).');

  // Input is not a number (string)
  assertBoolean(validator.validateNumber('5', true), false, 'Input is not a number (string).');

  // Input is not an integer
  assertBoolean(validator.validateNumber(5.3, true, null, null, true), false, 'Input is not an integer.');

  // Input is an integer
  assertBoolean(validator.validateNumber(5, true, null, null, true), true, 'Input is an integer');

  // Input is smaller than minimum allowed.
  assertBoolean(validator.validateNumber(-1, true, 0), false, 'Input is smaller than minimum allowed.');

  // Input equals the minimum allowed.
  assertBoolean(validator.validateNumber(0, true, 0), true, 'Input equals minimum allowed.');

  // Input is greater than the minimum allowed.
  assertBoolean(validator.validateNumber(100, true, 0), true, 'Input is greater than minimum allowed.');

    // Input is smaller than maximum allowed.
  assertBoolean(validator.validateNumber(14, true, 0, 24), true, 'Input is smaller than maximum allowed.');

  // Input equals the maximum allowed.
  assertBoolean(validator.validateNumber(24, true, 0, 24), true, 'Input equals maximum allowed.');

  // Input is greater than the maximum allowed.
  assertBoolean(validator.validateNumber(25, true, 0, 24), false, 'Input is greater than maximum allowed.');
}

/**
 * Tests validateHeatCurve
 */
function testValidateHeatCurve() {
  const validator = new ValidationHelper();
  let heatCurve;

  // Valid heat curve.
  heatCurve = [
    {temperature : -25, hours: 24},
    {temperature : 2, hours: 7},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), true, "Valid heat curve with three points.");

  // Too few points.
  heatCurve = [
    {temperature : -25, hours: 24},
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Only one point should fail validation.");

  // Undefined variable.
  let invalid;
  assertBoolean(validator.validateHeatCurve(invalid), false, "Undefined heat curve should fail validation.");

  // One point missing temperature.
  heatCurve = [
    {temperature : -25, hours: 24},
    {hours: 7},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid heat curve, on point missing temperature.");
  // One point missing hours.
  heatCurve = [
    {temperature : -25, hours: 24},
    {temperature : 0},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid heat curve, on point missing hours.");

  // Temperature is not a number
  heatCurve = [
    {temperature : "foo", hours: 24},
    {temperature : 0, hours: 7},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid heat curve, temperature must be a number.");
  // Hours is not a valid number
  heatCurve = [
    {temperature : -25, hours: 24},
    {temperature : 0, hours: 25},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid heat curve, hours must be a number <= 24");

  // Point temperatures must greater than the previous point.
  heatCurve = [
    {temperature : -25, hours: 24},
    {temperature : -30, hours: 20},
    {temperature : 13, hours: 2}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid order of points (temperature).");

  // Point hours must be smaller than the previous point.
  heatCurve = [
    {temperature : -25, hours: 24},
    {temperature : 0, hours: 10},
    {temperature : 13, hours: 10}
  ];
  assertBoolean(validator.validateHeatCurve(heatCurve), false, "Invalid order of points (hours).");

}

// Export the test functions
module.exports = {
  testValidateNumber,
  testValidateHeatCurve
}