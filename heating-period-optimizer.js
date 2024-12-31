/**
 * Spot price optimizer, Controller for heating optimizations.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

const { HeatingPeriod }     = require('./heating-period.js');
const { HeatingGap }        = require('./heating-gap.js');

class HeatingPeriodOptimizer {

  /**
   * Constructor.
   *
   * @param ZonedDateTime start
   *   Start of the optimization period.
   * @param ZonedDateTime end
   *   End of the optimization period.
   * @param object parameters
   *   Parameters object.
   */
  constructor(start, end, parameters, serviceFactory) {
    console.log('heating-period-optimizer.js: Starting heating period optimizer...');
    console.log('-----------------------------------------------------------------');
    this.genericOptimizer  = serviceFactory.get('GenericOptimizer');
    this.heatingCalculator = serviceFactory.get('HeatingCalculator');
    this.validator         = serviceFactory.get('ValidationHelper');
    this.periods = [];
    this.error = false;

    // Validate parameters.
    if (!this.validateParameters(start, end, parameters)) {
      this.error = true;
    }

    // Only proceed with remaining initialization if all validations passed.
    if (!this.error) {
      this.start             = start;
      this.end               = end;
      this.priceItem         = items.getItem(parameters.priceItem);
      this.forecastItem      = items.getItem(parameters.forecastItem);
      this.numberOfPeriods   = parameters.numberOfPeriods;
      this.heatCurve         = parameters.heatCurve;
      this.dropThreshold     = parameters.dropThreshold;
      this.shortThreshold    = parameters.shortThreshold;
      this.periodOverlap     = (parameters.periodOverlap == undefined) ? 0 : parameters.periodOverlap;
      this.flexDefault       = (parameters.flexDefault == undefined)   ? 0 : parameters.flexDefault;
      this.flexThreshold     = (parameters.flexThreshold == undefined) ? 0 : parameters.flexThreshold;
      this.gapThreshold      = (parameters.gapThreshold == undefined)  ? 0 : parameters.gapThreshold;
      this.shiftPriceLimit   = (parameters.shiftPriceLimit == undefined) ? 0 : parameters.shiftPriceLimit;
      this.adjustment        = (parameters.heatingNeedAdjustment == undefined) ? 0 : parameters.heatingNeedAdjustment;

      // Read prices, validate them and pass them to GenericOptimizer.
      const pricePoints = this.priceItem.persistence.countBetween(this.start, this.end);
      const duration = time.Duration.between(this.start, this.end).toHours();

      if (pricePoints < duration) {
        console.error('heating-period-optimizer.js: Prices not available, aborting optimization!');
        this.error = true;
      }

      this.genericOptimizer.setParameters(parameters);
    }
  }

  /**
   * Optimizes all heating periods
   */
  optimize() {
    // Early exit if the error flag is set.
    if (this.error) {
      console.error('heating-period-optimizer.js: Optimization aborted, see previous errors.');
      return null;
    }

    this.calculateHeatingNeeds();
    this.adjustHeatingNeeds();
    this.adjustHeatingNeedForTemperatureDrops();
    this.allocateNonFlexHeatingNeeds();
    this.allocateFlexHeatingNeeds();
    this.genericOptimizer.blockAllRemaining();
    this.mergeShortPeriods();
    this.fixGaps();
  }

  /**
   * Creates heating periods and calculates heating needs for them.
   */
  calculateHeatingNeeds() {
    console.log('heating-period-optimizer.js: Calculating heating need for the heating periods.');
    const duration = time.Duration.between(this.start, this.end).dividedBy(this.numberOfPeriods);

    // Calculate the need also for the -1, +1 and +2 periods for heating need compensations.
    for (let i=-1; i < (this.numberOfPeriods + 2); i++) {
      let periodStart = this.start.plus(duration.multipliedBy(i));
      let periodEnd = periodStart.plus(duration);
      let period = new HeatingPeriod(this.heatingCalculator, periodStart, periodEnd, this.forecastItem, this.heatCurve, this.flexDefault, this.flexThreshold);
      this.periods.push(period);
      console.log(period);
    }
  }

  /**
   * Adjusts the heating need based on heating need adjustment factor.
   */
  adjustHeatingNeeds() {
    if (this.adjustment != 0) {
      const periodAdjustment = this.adjustment / this.numberOfPeriods;
      console.log(`heating-period-optimizer.js: Applying heating need adjustment ${periodAdjustment}h for each period.`);
      for (let i = 0; i < this.periods.length; i++) {
        // Calculate the new heating need.
        var need = this.periods[i].getHeatingNeed() + periodAdjustment;

        // Ensure the heating need doesn't go out of bounds.
        if (need < 0) {
          need = 0;
        }
        if (need > (24 / this.numberOfPeriods)) {
          need = 24/this.numberOfPeriods;
        }

        // Update the heating need.
        this.periods[i].setHeatingNeed(need);
        console.log(this.periods[i]);
      }
    }
  }

  /**
   * Ajdusts the heating need and flexibility when it's getting colder.
   *
   * If the current period is significantly colder than the previous,
   * reduce the flexibility of current and next period to zero.
   *
   * If the next two periods are significantly colder than the current:
   * - The heating need of the second period is copied to the first period.
   * - Flexibility of the current and next two periods is set to zero.
   */
  adjustHeatingNeedForTemperatureDrops() {
    // Early exit if the temperature drop parameter is not set.
    if (this.dropThreshold == undefined) {
      console.log('heating-period-optimizer.js: Temperature drop handling not active.');
      return null;
    }

    console.log('heating-period-optimizer.js: Checking for significant temperature drops...');
    let dropDetected = false;

    // Note: period at index 0 is for yesterday.
    for (let i=0; i <= this.numberOfPeriods; i++) {
      let delta1 = (this.periods[i+1].getAvgTemp() - this.periods[i].getAvgTemp());
      let delta2 = (this.periods[i+2].getAvgTemp() - this.periods[i+1].getAvgTemp());
      console.debug(`heating-period-optimizer.js: Period: ${i}: delta 1 ${delta1.toFixed(2)}., delta 2 ${delta2.toFixed(2)}`);

      // Next two periods are both signifcantly colder than their previous.
      if (delta1 < -1*this.dropThreshold && delta2 < -1*this.dropThreshold) {
        console.log(`heating-period-optimizer.js: Big temperature drop detected after period starting at ${this.periods[i].getStart()}, adjusting heating hours and flexibility of this and next two periods.`);
        this.periods[i].setHeatingNeed(this.periods[i+1].getHeatingNeed());
        this.periods[i+1].setHeatingNeed(this.periods[i+2].getHeatingNeed());
        this.periods[i].setFlexibility(0);
        this.periods[i+1].setFlexibility(0);
        this.periods[i+2].setFlexibility(0);
        dropDetected = true;
      }
      else if (delta1 < -1*this.dropThreshold) {
        console.log(`heating-period-optimizer.js: Temperature drop detected after period starting at ${this.periods[i].getStart()}, adjusting flexibility of this and next period.`);
        this.periods[i].setFlexibility(0);
        this.periods[i+1].setFlexibility(0);
        dropDetected = true;
      }
    }
    if (dropDetected) {
      console.log('heating-period-optimizer.js: Heating periods after temperature drop compensations:');
      for (let i=0; i < (this.periods.length); i++) {
        console.log(this.periods[i]);
      }
    }
  }

  /**
   * Allocates the non-flexible heating need for each heating period.
   */
  allocateNonFlexHeatingNeeds() {
    console.log("heating-period-optimizer.js: Optimizing the non-flexible heating need.");

    // Note: period at index 0 is for yesterday (temperature drops).
    for (let i=1; i <= this.numberOfPeriods; i++) {
      let nonFlexHours = this.periods[i].getNonFlexNeed();
      let a = this.periods[i].getStart();
      let b = this.periods[i].getEnd();

      // Allow the mid-day periods to overlap.
      if (i > 1) {
        a = a.minusHours(this.periodOverlap);
      }
      if (i < this.numberOfPeriods) {
        b = b.plusHours(this.periodOverlap);
      }

      this.genericOptimizer.allowInPieces(nonFlexHours, a, b);
    }
  }

  /**
   * Allocates the flexible heating need from each heating period.
   */
  allocateFlexHeatingNeeds() {
    console.log("heating-period-optimizer.js: Optimizing the flexible heating need.");
    let flexHours = 0;

    // Note: period at index 0 is for yesterday (temperature drops).
    for (let i=1; i <= this.numberOfPeriods; i++) {
      flexHours += this.periods[i].getFlexNeed();
    }
    this.genericOptimizer.allowInPieces(flexHours, this.start, this.end);
  }

  /**
   * Merges short heating periods together.
   *
   * If the duration of a heating period is less than the threshold, check if
   * the price limit allows the heating to be combined with previous or next
   * heating.
   */
  mergeShortPeriods() {
    // Early exit if the merge threshold parameter is not set.
    if (this.shortThreshold == undefined) {
      console.log('heating-period-optimizer.js: Short period merging not active.');
      return null;
    }

    const shortDuration = time.Duration.ofMinutes(this.shortThreshold * 60);
    let reCalculate  = true;

    while (reCalculate) {
      console.log('heating-period-optimizer.js: Checking if there are too short heating periods...');
      let gaps = this.findGaps();
      console.debug(JSON.stringify(gaps));

      // Consider this as the last iteration unless otherwise stated below.
      reCalculate = false;

      for (let i = 0; i < gaps.length; i++) {
        let previousHeatingDuration = gaps[i].getPreviousHeatingDuration();

        if (previousHeatingDuration != null && previousHeatingDuration.compareTo(shortDuration) < 0) {
          console.log(`heating-period-optimizer.js: Short ${previousHeatingDuration} heating at ${gaps[i].getPreviousHeatingStartTime()}`);

          let previousGap = (i > 0) ? gaps[i-1] : null;
          let direction = this.getShortPeriodShiftDirection(gaps[i], previousGap);

          // Skip to next gap if shift is not allowed to either direction.
          if (direction == false) {
            console.log("heating-period-optimizer.js: Short heating period can't be merged to any direction");
            continue;
          }

          // If the heating period needs to be shifted left, the shift is relative
          // to the previous gap, not the current gap.
          if (direction == 'left') {
            this.shiftHeating(previousGap, direction);
            reCalculate = true;
            break;
          }
          else if (direction == 'right') {
            this.shiftHeating(gaps[i], direction);
            reCalculate = true;
            break;
          }
        }
      }
    }
  }


  /**
   * Adjusts heating periods to avoid short breaks between them.
   *
   * This can be used to reduce the number of compressor starts with
   * on/off heat pumps.
   */
  fixGaps() {
    // Early exit if gap parameters are 0.
    if (this.gapThreshold == 0 || this.shiftPriceLimit == 0) {
      console.log('heating-period-optimizer.js: Gap handling not active.');
      return null;
    }

    let durationThreshold = time.Duration.ofMinutes(Math.round(60*this.gapThreshold));
    let points            = this.genericOptimizer.getPrices();
    let resolution        = this.genericOptimizer.getResolution();
    let reCalculate       = true;

    while (reCalculate) {
      console.log("heating-period-optimizer.js: Checking if there are short gaps...");
      let gaps = this.findGaps();
      console.debug(JSON.stringify(gaps));

      // Consider this as the last iteration unless otherwise stated below.
      reCalculate = false;

      for (let i = 0; i < gaps.length; i++) {
        // Skip to next gap if shift is not allowed to either direction.
        let direction = gaps[i].getShiftDirection(durationThreshold, this.shiftPriceLimit, this.start);
        if (direction == false) {
          continue;
        }

        // Break the for-loop after fixing the first possible gap and re-calculate gaps.
        console.log("heating-period-optimizer.js: " + gaps[i]);
        this.shiftHeating(gaps[i], direction);
        reCalculate = true;
        break;
      }
    }
  }

  /**
   * Returns a list of gaps between the heating periods.
   *
   * @return array
   *   Array of HeatingGap objects.
   */
  findGaps() {
    let gaps                      = [];
    let points                    = this.genericOptimizer.getPrices();
    let gapContinues              = false;
    let heatingContinues          = false;
    let previousHeatingStartPoint = null;

    // Loop through control points and find all gaps
    for (let i=0; i < points.length; i++) {

      // HEATING IS OFF: Either the gap just started or gap continues.
      if (points[i].control == 0) {
        heatingContinues = false;

        // New gap starts now.
        if (gapContinues == false) {
          gaps.push(new HeatingGap(points[i], this.genericOptimizer.getResolution()));

          // Set previousHeatingStart and end for the newly created gap.
          gaps[gaps.length-1].setPreviousHeatingStart(previousHeatingStartPoint);
          if (i > 0) {
            gaps[gaps.length-1].setPreviousHeatingEnd(points[i-1]);
          }

          // Set the nextheatingEnd for the previous gap, if one exists.
          if (gaps.length > 1) {
            gaps[gaps.length-2].setNextHeatingEnd(points[i-1]);
          }
          gapContinues = true;
        }

        // Gap continues.
        else {
          gaps[gaps.length -1].increaseDuration();
          gapContinues = true;
        }
      }

      // HEATING IS ON: Either heating just started or continues.
      else if (points[i].control == 1) {
        gapContinues = false;

        // Heating starts now.
        if (heatingContinues == false) {

          // Take a note of the heating start for later use.
          previousHeatingStartPoint = points[i];

          // Update the gap that just ended, if one exists.
          if (gaps.length > 0) {
            gaps[gaps.length - 1].setNextHeatingStart(points[i]);

            // Set gap end time & price, unless we're at the beginning of the day.
            if (i > 0) {
              gaps[gaps.length - 1].setGapEnd(points[i-1]);
            }
          }
        }
        heatingContinues = true;
      }
    }

    return gaps;
  }

  /**
   * Determines the optimal shift direction for too short heating periods.
   *
   * @param HeatingGap currentGap
   * @param HeatingGap previousGap
   *
   * @return string|boolean
   *   'right', 'left' or false if shift is not possible.
   */
  getShortPeriodShiftDirection(currentGap, previousGap) {
    let direction;
    let shiftPrice;
    let shiftLeftPrice;
    let shiftRightPrice;

    // If previous gap doesn't have previous heating, there is no heating
    // period in that direction that we could merge with.
    if (previousGap === null || previousGap.getPreviousHeatingEndTime() === null) {
      shiftLeftPrice = null;
    }
    else {
      shiftLeftPrice = previousGap.getGapStartPrice();
    }

    // If current gap doesn't have next heating, there is no heating period
    // in that direction that we could merge with.
    shiftRightPrice = currentGap.getGapEndPrice();

    if (shiftRightPrice === null && shiftLeftPrice === null) {
      console.debug("heating-period-optimizer.js: no heating periods in either direction.");
      return false;
    }

    if (shiftRightPrice === null) {
      console.debug("heating-period-optimizer.js: shift right not possible, no heating periods in that direction.");
      direction = 'left';
      shiftPrice = shiftLeftPrice;
    }

    else if (shiftLeftPrice === null) {
      console.debug("heating-period-optimizer.js: shift left not possible, no heating periods in that direction.");
      direction = 'right';
      shiftPrice = shiftRightPrice;
    }

    // If direction is not determined yet, determine by prices.
    else {
      console.debug('heating-period-optimizer.js: Compare prices');

      if (shiftLeftPrice < shiftRightPrice) {
        direction = 'left';
        shiftPrice = shiftLeftPrice;
      }
      else {
        direction = 'right';
        shiftPrice = shiftRightPrice;
      }
    }

    console.log(`heating-period-optimizer.js: Shift direction ${direction}, shiftPrice ${shiftPrice}`);

    // Check if the price threshold allows shift to the cheaper direction.
    if (shiftPrice > currentGap.getPreviousHeatingStartPrice() + this.shiftPriceLimit) {
      console.log(`heating-period-optimizer.js: Unable to move short heating period ${direction}, restricted by shiftPriceLimit ${this.shiftPriceLimit}`);
      return false;
    }
    return direction;
  }

  /**
   * Shifts heating control points to the given direction.
   *
   * @param HeatingGap gap
   *
   * @param string direction
   *   'left' or 'right.
   */
  shiftHeating(gap, direction) {
    if (direction == 'left') {
      this.shiftHeatingLeft(gap);
    }
    else if (direction == 'right') {
      this.shiftHeatingRight(gap);
    }
  }

  /**
   * Shifts heating control points on the right side of the gap to the left.
   *
   * @param HeatingGap gap
   */
  shiftHeatingLeft(gap) {
    console.log("heating-period-optimizer.js: Shift heating period to the left.");
    let resolution = this.genericOptimizer.getResolution();
    this.genericOptimizer.setControlForPeriod(gap.getGapStartTime(), gap.getGapDuration(), 1);
    this.genericOptimizer.setControlForPeriod(gap.getNextHeatingEndTime().minus(gap.getGapDuration()).plus(resolution), gap.getGapDuration(), 0);
    console.debug("heating-period-optimizer.js: Control points after shift:");
    console.debug(JSON.stringify(this.genericOptimizer.getPrices()));
  }

  /**
   * Shifts heating control points on the left side of the gap to the right.
   *
   * @param HeatingGap gap
   */
  shiftHeatingRight(gap) {
    console.log("heating-period-optimizer.js: Shift heating period to the right.");
    this.genericOptimizer.setControlForPeriod(gap.getGapStartTime(), gap.getGapDuration(), 1);
    this.genericOptimizer.setControlForPeriod(gap.getPreviousHeatingStartTime(), gap.getGapDuration(), 0);
    console.debug("heating-period-optimizer.js: Control points after shift:");
    console.debug(JSON.stringify(this.genericOptimizer.getPrices()));
  }

  /**
   * Returns control points.
   *
   * @return array
   *   Array of datetime-value pairs.
   */
  getControlPoints() {
    return this.genericOptimizer.getControlPoints();
  }

  /**
   * Validates optimization parameters.
   *
   * @param array parameters
   *
   * @return boolean
   */
  validateParameters(start, end, parameters) {

    if (end.isBefore(start)) {
      console.error("heating-period-optimizer.js: period end can't be before period start!");
      return false;
    }

    if (!this.validator.validateNumber(parameters.numberOfPeriods, true, 1, 24, true)) {
      console.error("heating-period-optimizer.js: Validation failed: numberOfPeriods must be a positive integer between 1 and 24 (inclusive).");
      return false;
    }

    if (!this.validator.validateNumber(parameters.periodOverlap, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: periodOverlap must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateNumber(parameters.dropThreshold, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: dropThreshold must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateNumber(parameters.shortThreshold, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: shortThreshold must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateNumber(parameters.flexDefault, false, 0, 1)) {
      console.error("heating-period-optimizer.js: Validation failed: flexDefault must be a number between 0 and 1 (inclusive).");
      return false;
    }

    if (!this.validator.validateNumber(parameters.flexThreshold, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: flexThreshold must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateNumber(parameters.gapThreshold, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: gapThreshold must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateNumber(parameters.shiftPriceLimit, false, 0)) {
      console.error("heating-period-optimizer.js: Validation failed: shiftPriceLimit must be a number >= 0.");
      return false;
    }

    if (!this.validator.validateItemParameters(parameters)) {
      return false;
    }
    if (!this.validator.validateHeatCurve(parameters.heatCurve)) {
      return false;
    }

    // All validations passed.
    return true;
  }

}

/**
 * Exports.
 */
module.exports = {
  HeatingPeriodOptimizer
}
