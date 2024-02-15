/**
 * Spot price optimizer, class for generic optimizing algorithms.
 */
class GenericOptimizer {

    /**
     * Constructor.
     *
     * @param string resolution
     *   Resolution of the spot price time series.
     */
    constructor(resolution = 'PT15M') {
	this.prices = [];
	this.resolution = time.Duration.parse(resolution);
	this.error = false;
    }

    /**
     * Sets the prices array.
     *
     * @param array prices
     *   Array of spot prices as datetime-value pairs.
     */
    setPrices(prices) {
	// Countries East from CET will have some hours fetched the day before.
	// Calculate the offset between local time zone and CET/CEST.
	const local = time.toZDT();
	const cet = local.withZoneSameLocal(time.ZoneId.of("Europe/Berlin"));
	const offset = time.ChronoUnit.HOURS.between(local, cet);

	// Check that there is enough prices.
	const duration = this.resolution.multipliedBy(prices.length);
	if (duration.compareTo(time.Duration.ofHours(offset + 1)) < 0) {
	    this.error = true;
	    console.error("generic-optimizer.js: Not enough prices for optimizations!");
	    return null;
	}

	this.prices = prices;
	this.priceStart = time.toZDT(this.prices[0].datetime);
	this.priceEnd = time.toZDT(this.prices[this.prices.length - 1].datetime).plus(this.resolution);
	this.priceWindowDuration = time.Duration.between(this.priceStart, this.priceEnd);

	console.log("generic-optimizer.js: price window " + this.priceStart + " - " + this.priceEnd);
	console.debug("generic-optimizer.js: price window duration: " + this.priceWindowDuration);
	console.debug(JSON.stringify(this.prices));
    }

    /**
     * Finds N cheapest individual hours and allows them.
     *
     * Input parameter is taken as a number (instead of a Duration) so that it's easy to
     * pass the value from an Item.
     *
     * @param int n
     *   Number of cheap hours to find.
     */
    allowIndividualHours(n) {
	console.log('generic-optimizer.js: Searching for ' + n + ' cheapest hours...');
	const duration = time.Duration.ofHours(1);

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (time.Duration.ofHours(n).compareTo(this.priceWindowDuration) > 0) {
	    this.error = true;
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.priceWindowDuration);
	    return null;
	}

	// Allow n cheapest hours.
	for (let i = 0; i < n; i++) {
	    let prices = this.calculatePeriodPrices(duration, 'asc');
	    if (prices.length > 0) {
		let start = time.toZDT(prices[0].datetime);
		this.setControlForPeriod(start, duration, 1);
	    }
	}
    }

    /**
     * Finds N most expensive individual hours and blocks them.
     *
     * Input parameter is taken as a number (instead of a Duration) so that it's easy to
     * pass the value from an Item.
     *
     * @param int n
     *   Number of expensive hours to find.
     */
    blockIndividualHours(n) {
	console.log('generic-optimizer.js: Searching for ' + n + ' most expensive hours...');
	const duration = time.Duration.ofHours(1);

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (time.Duration.ofHours(n).compareTo(this.priceWindowDuration) > 0) {
	    this.error = true;
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.priceWindowDuration);
	    return null;
	}

	// Allow n most expensive hours.
	for (let i = 0; i < n; i++) {
	    let prices = this.calculatePeriodPrices(duration, 'desc');
	    if (prices.length > 0) {
		let start = time.toZDT(prices[0].datetime);
		this.setControlForPeriod(start, duration, 0);
	    }
	}
    }

    /**
     * Allows the cheapest period of N hours.
     *
     * Input parameter is taken as a number (instead of a Duration) so that it's easy to
     * pass the value from an Item.
     *
     * @param int n
     *   Duration of the period to be allowed in hours.
     */
    allowCheapestPeriod(n) {
	console.log('generic-optimizer.js: Allowing the cheapest ' + n + ' hour period...');
	const duration = time.Duration.ofHours(n);

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (time.Duration.ofHours(n).compareTo(this.priceWindowDuration) > 0) {
	    this.error = true;
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.priceWindowDuration);
	    return null;
	}

	// Allow the cheapest period.
	let prices = this.calculatePeriodPrices(duration, 'asc');
	if (prices.length > 0) {
	    let start = time.toZDT(prices[0].datetime);
	    this.setControlForPeriod(start, duration, 1);
	}
    }

    /**
     * Blocks the most expensive period of N hours.
     *
     * Input parameter is taken as a number (instead of a Duration) so that it's easy to
     * pass the value from an Item.
     *
     * @param int n
     *   Duration of the period to be blocked in hours.
     */
    blockMostExpensivePeriod(n) {
	console.log('generic-optimizer.js: Blocking the most expensive ' + n + ' hour period...');
	const duration = time.Duration.ofHours(n);

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (time.Duration.ofHours(n).compareTo(this.priceWindowDuration) > 0) {
	    this.error = true;
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.priceWindowDuration);
	    return null;
	}

	// Block the most expensive period.
	let prices = this.calculatePeriodPrices(duration, 'desc');
	if (prices.length > 0) {
	    let start = time.toZDT(prices[0].datetime);
	    this.setControlForPeriod(start, duration, 0);
	}
    }

    /**
     * Allows all remaining times that don't have a control value yet.
     */
    allowAllRemaining() {
	console.log("generic-optimizer.js: Allowing all remaining slots...");

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	for (let i = 0; i < this.prices.length; i++) {
	    if ("control" in this.prices[i] == false) {
		this.prices[i]['control'] = 1;
	    }
	}
	console.debug(JSON.stringify(this.prices));
    }

    /**
     * Blocks all remaining times that don't have a control value yet.
     */
    blockAllRemaining() {
	console.log("generic-optimizer.js: Blocking all remaining slots...");

	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	for (let i = 0; i < this.prices.length; i++) {
	    if ("control" in this.prices[i] == false) {
		this.prices[i]['control'] = 0;
	    }
	}
	console.debug(JSON.stringify(this.prices));
    }

    /**
     * Allows or blocks a period of N hours starting at given datetime.
     *
     * @param ZonedDateTime start
     *   Start of the period
     * @param Duration duration
     *   Duration of the period.
     * @param int control
     *   Control value to be set.
     */
    setControlForPeriod(start, duration, control) {
	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	// Calculate the end of the period.
	let end = start.plus(duration);

	// Ensure prices are sorted by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	// Find the start index from the prices array.
	let datetime = start.format(time.DateTimeFormatter.ISO_INSTANT);
	let index = this.prices.findIndex(item => item.datetime == datetime);
	if (index < 0) {
	    console.error("generic-optimizer.js: Datetime " + datetime + " not found in prices array, unable to set control points!");
	    return null;
	}

	// Set the control points for the period
	let current = start;

	while (current.isBefore(end)) {
	    if (index in this.prices) {
		this.prices[index]['control'] = control;
		current = current.plus(this.resolution);
		index++;
	    }
	    else {
		console.debug("generic-optimizer.js: " + current + " not found in the prices array, skipping.");
		break;
	    }
	}
	console.debug('generic-optimizer.js: Spot prices and control values:');
	console.debug(JSON.stringify(this.prices));
    }

    /**
     * Calculates the cumulative prices for all possible start times for a given duration.
     *
     * If a previous control point already exists, that period is not considered.
     *
     * @param Duration duration
     *   Duration of the period to find.
     * @param string sort
     *   Sort the result 'asc' or 'desc'. Default 'asc'.
     *
     * @return array
     *   Array of datetime-sum pairs.
     */
    calculatePeriodPrices(duration, sort='asc') {
	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	let periodPrices = [];

	// Early exit if duration is 0.
	if (duration.isZero() == true) {
	    return periodPrices;
	}

	// Ensure prices are sorted by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	let iterationStart = this.priceStart;
	let lastStart = this.priceEnd.minus(duration);
	let i = 0;

	// Calculate the sum for the period starting at each index.
	while (iterationStart.isBefore(lastStart) || iterationStart.isEqual(lastStart)) {
	    // console.debug("generic-optimizer.js: Analyzing period starting at " + iterationStart + " (index " + i + ")");
	    let current = iterationStart;
	    let iterationEnd = iterationStart.plus(duration);

	    let j = i;
	    let sum = 0;
	    let controlFound = false;

	    // Calculate the sum for the current iteration
	    while (current.isBefore(iterationEnd)) {
		// Break out if prices array does not have enough values (might happen on time zones other than CET)
		if (!j in this.prices) {
		    console.log("element " + j + " not found in prices array!");
		    controlFound = true;
		    break;
		}

		// Break out if a control value is already found
		if ("control" in this.prices[j]) {
		    // console.debug("generic-optimizer.js: " + current + " already has a control value, period starting at " + iterationStart + " not considered.");
		    controlFound = true;
		    break;
		}

		sum += this.prices[j]['value'];
		current = current.plus(this.resolution);
		j++;
	    }

	    // If previous control points were not found, add sum of this period to the result array.
	    if (controlFound == false) {
		// console.debug("generic-optimizer.js: " + sum);
		let point = {
		    datetime: this.prices[i].datetime,
		    sum: sum
		}
		periodPrices.push(point);
	    }

	    // Proceed to next iteration.
	    iterationStart = iterationStart.plus(this.resolution);
	    i++;
	}

	// Sort the prices array
	if (sort == 'asc') {
	    periodPrices.sort((a, b) => (a.sum > b.sum) ? 1 : -1);
	}
	else {
	    periodPrices.sort((a, b) => (a.sum > b.sum) ? -1 : 1);
	}
	console.debug("generic-optimizer.js: Cumulative prices for unallocated periods...");
	console.debug(JSON.stringify(periodPrices));
	return periodPrices;
    }

    /**
     * Rounds a Duration to be compatible with the resolution of the prices.
     *
     * If the resolution is PT60M, this method will round the source duration to the
     * full hour. If the resolution is PT15M, the source duration will be rounded to
     * the next quarter.
     *
     * @param Duration duration
     *   Source duration.
     *
     * @return Duration
     *   Rounded duration.
     */
    round(duration) {
	let seconds = duration.get(time.ChronoUnit.SECONDS);
	let resolution = this.resolution.get(time.ChronoUnit.SECONDS);
	let n = Math.ceil(seconds / resolution);
	let result = this.resolution.multipliedBy(n);
	return result;
    }

    /**
     * Returns the control points prepared by the other methods.
     *
     * The final control points must be an array of datetime-value pairs where value is either 1 or 0.
     * Our prices are currently an array of datetime-value-control points. Transform this array
     * so that we remove the current values (spot prices) and renames the 'control' elements as 'values'.
     */
    getControlPoints() {
	// Early exit if prices are not available.
	if (this.error) {
	    console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
	    return null;
	}

	for (let i = 0; i < this.prices.length; i++) {
	    this.prices[i]['value'] = this.prices[i]['control'];
	    delete this.prices[i]['control'];
	}

	return this.prices;
    }
}

/**
 * Exports.
 */
module.exports = {
    GenericOptimizer
};
