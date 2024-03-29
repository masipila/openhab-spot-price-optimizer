/**
 * Spot price optimizer, class for calculating how much heating is needed.
 */
class HeatingCalculator {

    /**
     * Constructor.
     */
    constructor() {
    }

    /**
     * Sets the weather foreacast.
     *
     * @param array forecast
     *   Array of datetime-value pairs.
     */
    setForecast(forecast) {
	this.forecast = forecast;
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
	console.log('heating-calculator.js: Calculating number of heating hours with linear curve...');

	// Early exit if no weather forecast is available.
	if (this.forecast.length < 1) {
	    console.error("heating-calculator.js: Empty forecast provided as an input!");
	    return null;
	}

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
	}

	const k = (p1.y-p2.y) / (p1.x-p2.x);
	const b = p2.y - (k * p2.x);

	console.log('heating-calculator.js: y = ' + k + 'x + ' + b);
	let raw = k * temperature + b;

	// Round to nearest 0.25
	let y = (Math.round(raw * 4) / 4).toFixed(2);
	if (temperature < p1.x) {
	    y = p1.y;
	}
	if (temperature > p2.x) {
	    y = p2.y;
	}

	console.log('heating-calculator.js: Number of needed hours before compensations: ' + y);
	return y;
    }

    /**
     * Calculates a compensation for significant temperature drops.
     *
     * Average temperatures between the first and second half of the forecast
     * period are compared. If there is a temperature drop of N degres, N/2 heating
     * hours will be returned as a compensation, rounded up.
     *
     * @return int
     *   Number of heating hours to add as a compensation for the temperature drop.
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
	// Early exit if no weather forecast is available.
	if (this.forecast.length < 1) {
	    console.error("heating-calculator.js: Empty forecast provided as an input!");
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

	console.log('heating-calculator.js: average temperature (' + mode + '): ' + avg);
	return avg;
    }
}

/**
 * Exports.
 */
module.exports = {
    HeatingCalculator
}
