/**
 * Spot price optimizer, class for generic optimizing algorithms.
 */
class GenericOptimizer {

    /**
     * Constructor.
     */
    constructor() {
	// Initialize this.prices with an empty array just in case.
	this.prices = [];
    }

    /**
     * Sets the prices array.
     *
     * @param prices
     *   Array of spot prices as datetime-value pairs.
     */
    setPrices(prices) {
	this.prices = prices;
	console.debug('generic-optimizer.js: Spot prices');
	console.debug(this.prices);
    }

    /**
     * Finds N cheapest individual hours and allows them.
     *
     * @param int n
     *   Number of cheap hours to find.
     */
    allowHours(n) {
	console.log('generic-optimizer.js: Searching for ' + n + ' cheapest hours...');

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (n > this.prices.length) {
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.prices.length + " hour");
	    return null;
	}

	// Sort prices array by price
	this.prices.sort((a, b) => (a.value > b.value) ? 1 : -1);

	// Allow n cheapest hours.
	for (let i = 0; i < n; i++) {
	    this.prices[i]['control'] = 1;
	}

	// Return sort by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	console.debug('generic-optimizer.js: Spot prices and control values');
	console.debug(this.prices);
    }

    /**
     * Finds N most expensive individual hours and blocks them.
     *
     * @param int n
     *   Number of expensive hours to find.
     */
    blockHours(n) {
	console.log('generic-optimizer.js: Searching for ' + n + ' most expensive hours...');

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (n > this.prices.length) {
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.prices.length + " hour");
	    return null;
	}

	// Sort prices array by price.
	this.prices.sort((a, b) => (a.value > b.value) ? -1 : 1);

	// Block n most expensive hours.
	for (let i = 0; i < n; i++) {
	    this.prices[i]['control'] = 0;
	}

	// Return sort by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	console.debug('generic-optimizer.js: Spot prices and control values');
	console.debug(this.prices);
    }

    /**
     * Allows a period of N hours.
     *
     * @param int startIndex
     *   Index of the hour when the period starts.
     * @param int n
     *   Duration of the period to be allowed.
     * @param bool blockSurrounding
     *   Set to true to block the hours just before and after the period.
     */
    allowPeriod(n, blockSurrounding=false) {
	console.log('generic-optimizer.js: Searching for the cheapest ' + n + ' hour period...');

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (n > this.prices.length) {
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.prices.length + " hour");
	    return null;
	}

	// Ensure prices are sorted by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	// Find the index when the period starts.
	let startIndex = this.findPeriodStart(n, true);

	// Block the previous hour unless we are at the start of the pricing window.
	if (blockSurrounding && startIndex > 0) {
	    this.prices[startIndex-1]['control'] = 0;
	}

	// Allow the hours of the period.
	for (let i = startIndex; i < startIndex + n; i++) {
	    this.prices[i]['control'] = 1;
	}

	// Block the next hour after the period unless we are at the end of the pricing window.
	if (blockSurrounding && (startIndex + n < this.prices.length)) {
	    this.prices[startIndex+n]['control'] = 0;
	}

	console.debug('generic-optimizer.js: Spot prices and control values');
	console.debug(this.prices);
    }

    /**
     * Blocks a period of N hours.
     *
     * @param int startIndex
     *   Index of the hour when the period starts.
     * @param int n
     *   Duration of the period to be blocked.
     * @param bool allowSurrounding
     *   Set to true to allow the hours just before and after the period.
     */
    blockPeriod(n, allowSurrounding=false) {
	console.log('generic-optimizer.js: Searching for the most expensive ' + n + ' hour period...');

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	// Early exit if not enough prices are available.
	if (n > this.prices.length) {
	    console.error("generic-optimizer.js: Optimization aborted. " + n + " hours requested but there are prices only for " + this.prices.length + " hour");
	    return null;
	}

	// Ensure prices are sorted by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	// Find the index when the period starts.
	let startIndex = this.findPeriodStart(n, false);

	// Allow the previous hour unless we are at the beginning of the pricing window.
	if (allowSurrounding && startIndex > 0) {
	    this.prices[startIndex-1]['control'] = 1;
	}

	// Block the hours of the period.
	for (let i = startIndex; i < startIndex + n; i++) {
	    this.prices[i]['control'] = 0;
	}

	// Allow the next hour after the period unless we are at the end of the pricing window.
	if (allowSurrounding && (startIndex + n < this.prices.length)) {
	    this.prices[startIndex+n]['control'] = 1;
	}

	console.debug('generic-optimizer.js: Spot prices and control values');
	console.debug(this.prices);
    }

    /**
     * Allows all remaining hours that don't have a control value yet.
     */
    allowRemainingHours() {
	console.log("generic-optimizer.js: Allowing all remaining hours...");

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	for (let i = 0; i < this.prices.length; i++) {
	    if ("control" in this.prices[i] == false) {
		this.prices[i]['control'] = 1;
	    }
	}
	console.debug(this.prices);
    }

    /**
     * Blocks all remaining hours that don't have a control value yet.
     */
    blockRemainingHours() {
	console.log("generic-optimizer.js: Blocking all remaining hours...");

	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	for (let i = 0; i < this.prices.length; i++) {
	    if ("control" in this.prices[i] == false) {
		this.prices[i]['control'] = 0;
	    }
	}
	console.debug(this.prices);
    }

    /**
     * Finds the cheapest / most expensive period in this.prices and returns the index of
     * the hour when this period starts.
     *
     * @param int n
     *   Duration of the period to find.
     * @param bool findCheapest
     *   Set to true to find cheapest period (default) and false to find the most expensive period.
     *
     * @return int
     *   Index of the hour when the period starts.
     */
    findPeriodStart(n, findCheapest=true) {
	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
	    return null;
	}

	let bestSum = 0;
	let startIndex = 0;
    
	// Ensure prices are sorted by datetime.
	this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

	// Loop through the starting hours and calculate the sum for the period starting at that hour.
	for (let i = 0; i <= this.prices.length - n; i++) {
	    console.debug("generic-optimizer.js: Analyzing " + n + " hour period starting at index " + i);
	    let controlFound = false;
	    let sum = 0;

	    // Calculate the sum and bail out if a control value is already found within this period.
	    for (let j = i; j < i + n; j++) {
		if ("control" in this.prices[j]) {
		    console.debug("generic-optimizer.js: Index " + j + " already has a control value.");
		    controlFound = true;
		    break;
		}	    
		sum += this.prices[j]['value'];
	    }

	    // Skip to next if a control value is found within currently investigated period.
	    if (controlFound == true) {
		continue;
	    }
	
	    // Set initial value for the bestSum after the first investigated period.
	    if (i == 0) {
		bestSum = sum;
	    }

	    // If the currently investigated period is better than the previously best,
	    // use this as the new best period.
	    if (findCheapest && sum < bestSum) {
		bestSum = sum;
		startIndex = i;
	    }
	    else if (!findCheapest && sum > bestSum) {
		bestSum = sum;
		startIndex = i;
	    }
	}
	console.log('generic-optimizer.js: Period starts at index: ' + startIndex + ', sum: ' + bestSum);
	return startIndex; 
    }

    /**
     * Returns the control points prepared by the other methods.
     *
     * The final control points must be an array of datetime-value pairs where value is either 1 or 0.
     * Our prices are currently an array of datetime-value-control points. Transform this array
     * so that we remove the current values (spot prices) and renames the 'control' elements as 'values'.
     */
    getControlPoints() {
	// Early exit if prices are not available. Countries on EET might have 1 hour from previous day.
	if (this.prices.length < 2) {
	    console.error("generic-optimizer.js: No prices available, aborting optimization!");
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
