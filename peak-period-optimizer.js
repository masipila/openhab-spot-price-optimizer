/**
 * Spot price optimizer, class for avoiding morning and evening price peaks.
 */
const GenericOptimizer = require('openhab-spot-price-optimizer/generic-optimizer.js');

class PeakPeriodOptimizer extends GenericOptimizer.GenericOptimizer {

    /**
     * Constructor.
     */
    constructor() {
	super();
    }

    /**
     * Blocks two expensive peak periods, typically morning and evening peaks.
     *
     * Durations of the two peak periods are calculated from the given number of
     * allowed hours. The minimum number of allowed hours between the two blocks
     * is given as the second argument.
     *
     * @param int allowedHours
     *   Number or allowed hours
     * @param int middleHours
     *   Minimum number of hours between the two blocked periods.
     */
    blockPeaks(allowedHours, middleHours) {
	let blockDurations = this.calculateBlockDurations(allowedHours);

	// Block the peaks, forcing the surrounding hours to be allowed.
	for (let i = 0; i < blockDurations.length; i++) {
	    this.blockPeriod(blockDurations[i], middleHours);
	}
    }
    
    /**
     * Calculates the durations for the morning and evening peak periods
     * based on the given number of hours.
     *
     * Example 1: If 14 hours are required, 10 hours will be blocked.
     *   Duration for morning peak period block: 5 hours
     *   Duration for evening peak period block: 5 hours
     *
     * Example 2: If 15 hours are required, 9 hours will be blocked.
     *   Duration for the most expensive peak period block: 5 hours
     *   Duration for the second most expensive peak period block: 4 hours
     *
     * @param int allowedHours
     *   Number or needed hours
     *
     * @return int[]
     *   Array with 2 integers, indicating the duration of the peak periods. 
     */
    calculateBlockDurations(allowedHours) {
	// Graceful default for unexpected input: don't block anything. 
	let blockDurations = [0, 0];

	// Calculate the durations for the blocks
	if (allowedHours >= 0 && allowedHours <= 23) {
	    let expensiveHours = 24 - allowedHours;
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
