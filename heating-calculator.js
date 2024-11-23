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
   * Calculates the number of needed heating hours using a linear curve.
   *
   * @param array curve
   *   Array with two temperature-hours pairs defining the heating curve.
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

    // Calculate heat curve based on two constant points.
    // y = kx + b
    // x = temperature, y = number of needed hours.

    const p1 = {
      x : curve[0].temperature,
      y : curve[0].hours
    };
    const p2 = {
      x: curve[1].temperature,
      y: curve[1].hours
    };

    const k = (p1.y-p2.y) / (p1.x-p2.x);
    const b = p2.y - (k * p2.x);
    console.debug(`heating-calculator.js: heat curve = ${k}x + ${b}`);

    let hours = (k * temperature) + b;

    // Use max / min of the curve it the given value is out of range
    if (temperature < p1.x) {
      hours = p1.y;
    }
    else if (temperature > p2.x) {
      hours = p2.y;
    }

    // Scale the heating need with given multiplier.
    hours = (multiplier * hours);

    console.debug(`heating-calculator.js: Temperauture: ${temperature}, multiplier: ${multiplier}, heating need: ${hours}`);

    return hours;
  }

}

/**
 * Exports.
 */
module.exports = {
  HeatingCalculator
}
