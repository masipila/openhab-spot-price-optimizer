/**
 * Spot price optimizer, class for calculating how much heating is needed.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */
class HeatingCalculator {

  /**
   * Constructor.
   */
  constructor() {
  }

  /**
   * Calculates the number of needed heating hours using a piecewise linear curve.
   *
   * @param array curve
   *   Array of temperature-hours pairs defining the heating curve.
   *   Must be ordered from coldest to warmest temperatures.
   * @param float temperature
   *   Average temperature of the period.
   * @param float multiplier
   *   Scale the heating need with this multiplier. Use when period is shorter than 24h.
   *
   * @return float
   *   Heating need in hours.
   */
  calculateHeatingHoursLinear(curve, temperature, multiplier = 1) {
    console.debug('heating-calculator.js: Calculating number of heating hours with linear curve...');

    let hours;

    // If the temperature is below the lowest point, use the maximum heating hours.
    if (temperature <= curve[0].temperature) {
      hours = curve[0].hours;
      console.debug(`heating-calculator.js: Temperature below curve range. Using maximum hours: ${hours}`);
    }
    // If the temperature is above the highest point, use the minimum heating hours.
    else if (temperature >= curve[curve.length - 1].temperature) {
      hours = curve[curve.length - 1].hours;
      console.debug(`heating-calculator.js: Temperature above curve range. Using minimum hours: ${hours}`);
    }
    // Otherwise, find the correct segment and interpolate.
    else {
      // Iterate through the curve to find the correct segment.
      for (let i = 0; i < curve.length - 1; i++) {
        let t1 = curve[i].temperature;
        let t2 = curve[i + 1].temperature;

        // Check if the temperature falls between two points.
        if (temperature >= t1 && temperature <= t2) {
          let y1 = curve[i].hours;
          let y2 = curve[i + 1].hours;

          // Calculate the slope (k) and intercept (b) for the segment.
          const k = (y1 - y2) / (t1 - t2);
          const b = y2 - (k * t2);
          console.debug(`heating-calculator.js: Heat curve between ${t1}°C and ${t2}°C is y = ${k}x + ${b}`);

          // Calculate the heating hours using the linear equation.
          hours = (k * temperature) + b;
          console.debug(`heating-calculator.js: Interpolated hours: ${hours} at temperature: ${temperature}°C`);
          break;
        }
      }
    }

    // Scale the heating need with the given multiplier.
    hours = multiplier * hours;
    console.debug(`heating-calculator.js: Final heating need: ${hours} hours (multiplier applied)`);
    return hours;
  }

}

/**
 * Exports.
 */
module.exports = {
  HeatingCalculator
}
