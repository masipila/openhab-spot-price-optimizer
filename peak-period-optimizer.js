/**
 * Spot price optimizer, class for avoiding morning and evening price peaks.
 */
const GenericOptimizer = require('openhab-spot-price-optimizer/generic-optimizer.js');

class PeakPeriodOptimizer extends GenericOptimizer.GenericOptimizer {

    /**
     * Constructor.
     */
    constructor(resolution) {
	super(resolution);
    }

    /**
     * Sets the control points of the previous day so that the last hours can be
     * considered in the optimization.
     *
     * @param array previousControlPoints
     *   Array of datetime-value control points
     */
    setPreviousControlPoints(previousControlPoints) {
	this.previousControlPoints = previousControlPoints;
    }

    /**
     * Sets optimization parameters.
     *
     * @param float onDuration
     *   Number or ON hours
     * @param Duration midDuration
     *   Minimum duration between the blocked periods.
     * @param int peaks
     *   Number of peaks to block.
     */
    setOptimizationParameters(onDuration, midDuration, peaks) {
	// Early exit if there are previous errors.
	if (this.error) {
	    console.error("peak-period-optimizer.js: Aborting optimization, see previous errors.");
	    return null;
	}

	this.onDuration = this.round(time.Duration.ofMinutes(Math.round(onDuration * 60)));
	this.midDuration = this.round(time.Duration.ofMinutes(Math.round(midDuration * 60)));

	// Adjust midDuration if it's longer than onDuration
	if (this.midDuration.compareTo(this.onDuration) > 0) {
	    console.log("peak-period-optimizer.js: midDuration adjusted to be equal to onDuration: " + this.onDuration);
	    this.midDuration = this.onDuration;
	}

	this.peaks = peaks;
	this.offDuration = this.priceWindowDuration.minus(this.onDuration);
	console.log("peak-period-optimizer.js: Optimization parameters: ON duration: " + this.onDuration + ", OFF duration: " + this.offDuration + ", mid duration: " + this.midDuration + ", number of peaks to block: " + this.peaks);

	// Check if the beginning of the day must be forced ON
	this.forcedStartDuration = this.getForcedStartDuration();

	// Split the OFF hours to N periods where N is 'peaks'
	this.blockPeriodDurations = this.calculateBlockPeriodDurations();

	// Check if the blocks will fit to the available duration, take the forced start into account.
	let available = this.onDuration.plus(this.offDuration);
	available = available.minus(this.forcedStartDuration);
	let requiredGap = this.calculateRequiredGap(this.blockPeriodDurations);
	if (available.compareTo(requiredGap) < 0) {
	    this.error = true;
	    console.error("peak-period-optimizer.js: Optimization not possible with given input arguments!");
	    console.error("peak-period-optimizer.js: The " + this.peaks + " block periods with " + this.midDuration + " between them require " + requiredGap + " but there is only " + available + " available after forcing " + this.forcedStartDuration + " ON at the beginning of the day.");
	}
    }

    /**
     * Blocks the most expensive peak periods based on the parameters defined by
     * setOptimizationParameters.
     */
    blockPeaks() {
	console.log("peak-period-optimizer.js: Starting optimization...");

	// Early exit if there are previous errors.
	if (this.error) {
	    console.error("peak-period-blocker.js: Aborting optimization, see previous errors.");
	    return null;
	}

	// Force the beginning of the day ON if needed
	if (this.forcedStartDuration) {
	    console.debug("peak-period-optimizer.js: Forcing the start of the day ON for " + this.forcedStartDuration);
	    this.setControlForPeriod(this.priceStart, this.forcedStartDuration, 1);
	}

	// Make a working copy of the block durations and find the times for each of them.
	let remainingBlocks = this.blockPeriodDurations;
	while (remainingBlocks.length > 0) {

	    // Get the first peak duration and remove it from the array.
	    let currentBlockDuration = remainingBlocks.shift();

	    // Skip the current block if the duration is 0 or negative.
	    if (currentBlockDuration.compareTo(time.Duration.ofHours(0)) <= 0) {
		continue;
	    }

	    this.blockPeak(currentBlockDuration, remainingBlocks)
	}
    }

    /**
     * Blocks a single peak period.
     *
     * This method will find the potential unallocated periods that do not have control points yet.
     * It will find the most expensive period so that the remaining peak periods will still fit.
     *
     * @param Duration duration
     *   Duration of the peak period to block.
     * @param Duration[] remainingBlocks
     *   Array of the durations for the remaining peak periods that will be blocked next.
     */
    blockPeak(duration, remainingBlocks) {
	console.debug("peak-period-optimizer.js: PROCESSING A BLOCK WITH DURATION " + duration);
	console.debug("peak-period-optimizer.js: -------------------------------------");

	// Calculate the prices for all possible start hours, sort descending.
	let periodPrices = this.calculatePeriodPrices(duration, 'desc');

	// If this is the last remaining period, just block the most expensive period.
	if (remainingBlocks.length == 0) {
	    let last = time.toZDT(periodPrices[0].datetime);
	    this.setControlForPeriod(last, duration, 0);
	}

	// There are periods after this one. Find the most expensive period that can be used.
	else {
	    // Calculate how long gap is needed for the blocks remaining after this.
	    let requiredGap = this.calculateRequiredGap(remainingBlocks);

	    // Start from the most expensive period and check if the gap before/after is sufficient.
	    for (let i = 0; i < periodPrices.length; i++) {
		let datetime = time.toZDT(periodPrices[i].datetime);
		console.debug("peak-period-optimizer.js: Checking if " + datetime + " has enough gap (" + requiredGap + ") before or after the block...");
		let gapBefore = this.getGapBefore(datetime, this.midDuration);
		let gapAfter = this.getGapAfter(datetime, duration, this.midDuration);
		if (gapBefore.compareTo(requiredGap) >= 0 || gapAfter.compareTo(requiredGap) >= 0) {
		    console.debug("peak-period-optimizer.js: Allow the period just before the block");
		    this.setControlForPeriod(datetime.minus(this.midDuration), this.midDuration, 1);
		    console.debug("peak-period-optimizer.js: Block the period");
		    this.setControlForPeriod(datetime, duration, 0);
		    console.debug("peak-period-optimizer.js: Allow the period just after the block");
		    this.setControlForPeriod(datetime.plus(duration), this.midDuration, 1);
		    break;
		}
	    }
	}
    }

    /**
     * Checks if the beginning of the day must be forced ON because there were not
     * enough ON control points at the end of the previous day.
     *
     * return Duration
     *   Duration for the forced start.
     */
    getForcedStartDuration() {
	// Sort previous day's control points by datetime descending.
	this.previousControlPoints.sort((a, b) => (a.datetime > b.datetime) ? -1 : 1);

	// If no previous control points are found, force the beginning of the day ON.
	if (this.previousControlPoints.length == 0) {
	    console.log("peak-period-optimizer.js: No control points found for previous day. The beginning of the day will be forced ON for " + this.midDuration);
	    return this.midDuration;
	}

	// Calculate how long ON duration the previous day ended with.
	let previousOnDuration = time.Duration.ofHours(0);
	let i = 0;
	for (i; i < this.previousControlPoints.length; i++) {
	    if (this.previousControlPoints[i].value == 0) {
		break;
	    }
	}

	// Calculate how long ON duration must be forced at the beginning of the day.
	previousOnDuration = this.resolution.multipliedBy(i);
	let startDuration = this.midDuration.minus(previousOnDuration);
	if (startDuration.compareTo(time.Duration.ofHours(0)) < 0) {
	    startDuration = time.Duration.ofHours(0);
	}

	console.log("peak-period-optimizer.js: Previous day ended with " + previousOnDuration + " ON duration, the beginning of the day will be forced ON for " + startDuration);
	return startDuration;
    }

    /**
     * Calculates the durations of the peak periods that will be blocked.
     *
     * @return array
     *   Array of Duration objects.
     */
    calculateBlockPeriodDurations() {
	let durations = [];
	let remainingPeaks = this.peaks;
	let remainingDuration = this.offDuration;

	while (remainingPeaks > 0) {
	    let duration = this.round(remainingDuration.dividedBy(remainingPeaks));
	    durations.push(duration);
	    remainingDuration = remainingDuration.minus(duration);
	    remainingPeaks--;
	}
	console.log("peak-period-optimizer.js: Block period durations: " + durations);
	return durations;
    }

    /**
     * Calculates how long gap given block durations require.
     *
     * @param array blockDurations
     *   Array of Duration objects
     *
     * @return Duration
     *   Required Duration
     */
    calculateRequiredGap(blockDurations) {
	let requiredGap = time.Duration.ofHours(0);
	if (blockDurations.length < 1) {
	    return requiredGap;
	}
	// All except the last: add the duration of the block and the midDuration
	for (let i = 0; i < blockDurations.length - 1; i++) {
	    requiredGap = requiredGap.plus(blockDurations[i]);
	    requiredGap = requiredGap.plus(this.midDuration);
	}
	// Add the last block without midDuration
	requiredGap = requiredGap.plus(blockDurations[blockDurations.length - 1]);
	return requiredGap;
    }
    
    /**
     * Calculates the duration of the free gap before the block if the the block would
     * start at given time.
     *
     * @param ZonedDateTime start
     *   ZonedDateTime when the block period would start.
     *
     * @param Duration midDuration
     *   Duration that must be allowed just before the block.
     *
     * @return Duration
     *   Duration of the free gap just before the block and midDuration.
     */
    getGapBefore(start, midDuration) {
	start = start.minus(midDuration);
	let startDatetime = start.format(time.DateTimeFormatter.ISO_INSTANT)
	let i = this.prices.findIndex(item => item.datetime == startDatetime);
	let gap = time.Duration.ofHours(0);

	// Check if previous control points are found
	for (i; i >= 0; i--) {
	    if ("control" in this.prices[i]) {
		i++; // this one is not free, reverse counter by 1
		break;
	    }
	}
	let firstFree = time.toZDT(this.prices[i+1].datetime);
	gap = time.Duration.between(firstFree, start);
	console.debug("peak-period-optimizer.js: Free gap before " + start + ": " + gap);
	return gap;
    }

    /**
     * Calculates the duration of the free gap after the block if the the block would
     * start at given time.
     *
     * @param ZonedDateTime start
     *   ZonedDateTime when the block period would start.
     *
     * @param Duration duration
     *   Duration of the block period.
     *
     * @param Duration midDuration
     *   Duration that must be allowed just after the block.
     *
     * @return Duration
     *   Duration of the free gap just after the block and midDuration.
     */
    getGapAfter(start, duration, midDuration) {
	start = start.plus(duration);
	start = start.plus(midDuration);
	let startDatetime = start.format(time.DateTimeFormatter.ISO_INSTANT);
	let i = this.prices.findIndex(item => item.datetime == startDatetime);
	let gap = time.Duration.ofHours(0);

	// If startDateTime is not found, it is after the pricing window. There is no gap.
	if (i == -1) {
	    console.debug("peak-period-optimizer.js: Free gap after " + start + ": " + gap);
	    return gap;
	}

	// Check if previous control points are found
	for (i; i < this.prices.length; i++) {
	    if ("control" in this.prices[i]) {
		break;
	    }
	}
	let lastFree = time.toZDT(this.prices[i-1].datetime);
	gap = time.Duration.between(start, lastFree);
	gap = gap.plus(this.resolution);
	console.debug("peak-period-optimizer.js: Free gap after " + start + ": " + gap);
	return gap;
    }

}

/**
 * Exports.
 */
module.exports = {
    PeakPeriodOptimizer
}
