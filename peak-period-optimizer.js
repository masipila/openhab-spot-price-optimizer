/**
 * Spot price optimizer, class for avoiding morning and evening peaks.
 */
const GenericOptimizer = require('openhab-spot-price-optimizer/generic-optimizer.js');

class PeakPeriodOptimizer extends GenericOptimizer.GenericOptimizer {

    /**
     * Constructor.
     */
    constructor(prices) {
	super(prices);
    }

    /**
     * Blocks two expensive peak periods, typically morning and evening peaks.
     *
     * Durations of the two peak periods are determined by the given heating
     * hours so that the given number of heating hours will be allowed.
     *
     * @param int heatingHours
     *   Number or needed heating hours
     */
    blockPeaksAndAllowRest(heatingHours) {
	let blockDurations = this.calculateBlockDurations(heatingHours);

	// Block the peaks, forcing the surrounding hours to be allowed.
	for (let i = 0; i < blockDurations.length; i++) {
	    this.blockPeriod(blockDurations[i], true);  
	}

	// Allow all remaining hours
	this.allowRemainingHours();
    }
    
    /**
     * Calculates the durations for the morning and evening peak periods
     * based on the given number of heating hours.
     *
     * Example 1: If 12 heating hours are required, 12 hours will be blocked.
     *   Duration for morning peak period block: 6 hours
     *   Duration for evening peak period block: 6 hours
     *
     * Example 2: If 15 heating hours are required, 9 hours will be blocked.
     *   Duration for the most expensive peak period block: 5 hours
     *   Duration for the second most expensive peak period block: 4 hours
     *
     * @param int heatingHours
     *   Number or needed heating hours
     *
     * @return int[]
     *   Array with 2 integers, indicating the duration of the peak periods. 
     */
    calculateBlockDurations(heatingHours) {
	// Graceful default for unexpected input: don't block anything. 
	let blockDurations = [0, 0];

	// Calculate the durations for the blocks
	if (heatingHours >= 0 && heatingHours <= 23) {
	    let expensiveHours = 24 - heatingHours;
	    let a = Math.ceil(expensiveHours/2);
	    let b = expensiveHours - a;
	    blockDurations = [a, b];
	}
    
	console.debug('peak-period-optimizer.js: durations for the blocks...');
	console.debug(blockDurations);
	return blockDurations;
    }

}

/**
 * Exports.
 */
module.exports = {
    PeakPeriodOptimizer
}
