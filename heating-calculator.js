/**
 * Spot price optimizer, class for calculating how much heating is needed.
 */
class HeatingCalculator {

  /**
   * Constructor.
   */
  constructor() {
    this.error = false;
  }

  /**
   * Sets the weather foreacast.
   *
   * @param array forecast
   *   Array of datetime-value pairs.
   */
  setForecast(forecast) {
    // Validate forecast
    if (!forecast || forecast.length < 2) {
      console.error("heating-calculator.js: Invalid forecast data provided.");
      console.error(JSON.stringify(forecast));
      this.error = true;
      return null;
    }

    this.forecast = forecast;
    this.forecastStart = time.toZDT(this.forecast[0].datetime);
    this.resolution = time.Duration.between(this.forecastStart, time.toZDT(this.forecast[1].datetime));
    this.forecastEnd = time.toZDT(this.forecast[this.forecast.length - 1].datetime).plus(this.resolution);
    this.forecastDuration = time.Duration.between(this.forecastStart, this.forecastEnd);
    console.debug(JSON.stringify(this.forecast));
  }

  /**
   * Calculates the number of needed heating hours using a linear curve.
   *
   * @param array curve
   *   Array with two temperature-hours pairs defining the heating curve.
   * @param int temperature
   *   Average temperature of the day.
   *
   * @return float
   *   Number of needed heating hours.
   *   If forecast is not available, null will be returned.
   */
  calculateHeatingHoursLinear(curve, temperature) {
    // Validate heat curve.
    if (!this.validateHeatCurve(curve)) {
      console.error("heating-calculator.js: Invalid heat curve provided.");
      console.error(JSON.stringify(curve));
      this.error = true;
      return null;
    }

    // Early exit if there were previous errors.
    if (this.error) {
      console.error("heating-calculator.js: Aborting calculations, see previous errors!");
      return null;
    }

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
    console.debug('heating-calculator.js: hours = ' + k + 'x + ' + b);

    let hours = (k * temperature) + b;

    // Use max / min of the curve it the given value is out of range
    if (temperature < p1.x) {
      hours = p1.y;
    }
    else if (temperature > p2.x) {
      hours = p2.y;
    }

    // If forecast duration is not 24H, scale the heating need.
    const multiplier = this.forecastDuration.seconds() / time.Duration.parse('PT24H').seconds();
    hours = (multiplier * hours);

    console.debug('heating-calculator.js: ' + this.forecastStart + ' - ' + this.forecastEnd + ': ' + temperature + ', ' + hours);

    return hours;
  }

  /**
   * Calculates a compensation for significant temperature drops.
   *
   * Average temperatures between the first and second half of the forecast
   * period are compared. If there is a temperature drop of N degres, N/2
   * heating hours will be returned as a compensation, rounded up.
   *
   * DEPRECATED: not used with heating-period-optimizer. This method is kept for
   * backwards compatibility with peak-period-optimizer.
   *
   * @return int
   *   Number of heating hours to add to compensate the temperature drop.
   *   If forecast is not available, null will be returned.
   */
  calculateTemperatureDropCompensation() {
    // Early exit if no weather forecast is available.
    if (this.forecast.length < 1) {
      console.error("heating-calculator.js: Empty forecast provided as an input!");
      return null;
    }

    let compensation = 0;
    let avg1 = this.calculateAverageTemperature('first');
    let avg2 = this.calculateAverageTemperature('second');

    // Check if there is a temperature drop.
    let diff = avg2 - avg1;
    if (diff < 0) {
      compensation = Math.floor(-1 * diff / 2);
    }
    console.log("heating-calculator.js: Temperature drop compensation: " + compensation);
    return compensation;
  }

  /**
   * Calculates an average temperature.
   *
   * @param string mode
   *   full: calculate average from full forecast duration, default.
   *   first: calculate average from first half of forecast duration.
   *   second: calculate average from second half of forecast duration.
   *
   * @return float
   *   Average temperature for the range.
   *   If forecast is not available, null will be returned.
   */
  calculateAverageTemperature(mode = 'full') {
    // Early exit if there were previous errors.
    if (this.error) {
      console.error("heating-calculator.js: Aborting calculations, see previous errors!");
      return null;
    }

    let sum = null;
    let avg = null;

    let start = 0;
    let stop = this.forecast.length - 1;

    switch (mode) {
      case 'first':
        start = 0;
        stop = Math.floor(this.forecast.length / 2) - 1;
        break;
      case 'second':
        start = Math.floor(this.forecast.length / 2);
        stop = this.forecast.length - 1;
        break;
    }
    for (let i = start; i <= stop; i++) {
      sum += this.forecast[i].value;
    }

    // Avoid division by zero if forecast is empty.
    let duration = stop-start+1;
    if (duration) {
      avg = sum / duration;
    }
    console.debug('heating-calculator.js: average temperature (' + mode + '): ' + avg);
    return avg;
  }

  /**
   * Validates the heat curve.
   *
   * @param array curve
   *   Array of temperature-hours pairs
   * @return bool
   */
  validateHeatCurve(curve) {
    if (!curve) {
      return false;
    }
    if (curve.length < 2) {
      return false;
    }
    for (let i = 0; i < curve.length; i++) {
      if (!curve[i].hasOwnProperty('temperature')) {
        return false;
      }
      if (!curve[i].hasOwnProperty('hours')) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Exports.
 */
module.exports = {
  HeatingCalculator
}
