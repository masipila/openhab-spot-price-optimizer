/**
 * Spot price optimizer, helper service for input validation.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

class ValidationHelper {

  /**
   * Validates that the input is a valid number.
   *
   * @param number input
   *   Input to validate.
   * @param boolean required
   *   Defines if the input is required or not.
   * @param number min
   *   Optional minimum allowed value, use null to not enforce.
   * @param number max
   *   Optional maximum allowed value, use null to not enforce.
   * @param boolean mustBeInteger
   *   Optional flag to require integer input.
   *
   * @return boolean
   */
  validateNumber(input, required, min = null, max = null, mustBeInteger = false) {
    // Check if input is undefined or null
    if (input === undefined || input === null) {
      // Return true if not required, false if required
      return !required;
    }

    // If we're still here, input is provided. Check if it's a number.
    if (typeof input !== 'number' || isNaN(input)) {
      return false;
    }

    // Check if input must be an integer
    if (mustBeInteger && !Number.isInteger(input)) {
      return false;
    }

    // Check minimum value
    if (min !== null && input < min) {
      return false;
    }
    // Check maximum value
    if (max !== null && input > max) {
      return false;
    }

    // All validations passed
    return true;
  }

  /**
   * Validates item name parameters
   *
   * @param array parameters
   *
   * @return boolean
   */
  validateItemParameters(parameters) {
    const requiredItems = ['priceItem', 'forecastItem', 'controlItem'];
    for (let prop of requiredItems) {
      if (!parameters.hasOwnProperty(prop) || !parameters[prop]) {
        console.error(`heating-period-optimizer.js: Validation failed: Missing required parameter '${prop}'.`);
        return false;
      }

      // Try to load the Item.
      let itemName = parameters[prop];
      let item = items.getItem(itemName, true);
      if (item === null) {
        console.error(`heating-period-optimizer.js: Validation failed: Item '${itemName}' not found.`);
        return false;
      }
    }

    // All validations passed
    return true;
  }

  /**
   * Validates heat curve
   *
   * @param array heatCurve
   *   Array of temperature-hours objects.
   *
   * @return boolean
   */
  validateHeatCurve(heatCurve) {
    // heatCurve must be an array with at least 2 objects.
    if (!Array.isArray(heatCurve) || heatCurve.length < 2) {
      console.error("heating-period-optimizer.js: Validation failed: heatCurve must be an array with at least 2 points.");
      return false;
    }

    // All heatCurve must have temperature and hour attributes.
    for (let i = 0; i < heatCurve.length; i++) {

      // Check that temperature exists.
      if (!heatCurve[i].hasOwnProperty('temperature')) {
        console.error("heating-period-optimizer.js: Validation failed: All heatCurve points must have a temperature.");
        return false;
      }

      // Check that number of hours exist.
      if (!heatCurve[i].hasOwnProperty('hours')) {
        console.error("heating-period-optimizer.js: Validation failed: All heatCurve points must have number of hours.");
        return false;
      }

      // Check that temperature is a number.
      if (!this.validateNumber(heatCurve[i].temperature, true)) {
        console.error("heating-period-optimizer.js: Validation failed: All heatCurve temperatures must be numbers.");
        return false;
      }

      // Check that heating hours is between 0 and 24.
      if (!this.validateNumber(heatCurve[i].hours, true, 0, 24)) {
        console.error("heating-period-optimizer.js: Validation failed: All heatCurve heating hours must be between 0 and 24 (inclusive).");
        return false;
      }
      // Check that the temperature is > than the previous point.
      if (i > 0 && (heatCurve[i].temperature <= heatCurve[i-1].temperature)) {
        console.error("heating-period-optimizer.js: Validation failed: The temperature of each heatCurve point must be greater than the previous.");
        return false;
      }

      // Check that the heating hour is smaller than the previous point.
      if (i > 0 && i < heatCurve.length && heatCurve[i].hours >= heatCurve[i-1].hours) {
        console.error("heating-period-optimizer.js: Validation failed: Each heatCurve point must have less heating hours than the previous.");
        return false;
      }

    }

    // All validations passed.
    return true;
  }

}

/**
 * Exports.
 */
module.exports = {
  ValidationHelper
}
