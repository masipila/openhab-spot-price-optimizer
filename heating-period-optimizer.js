/**
 * Spot price optimizer, Controller for heating optimizations.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

const HeatingPeriod = require('./heating-period.js');
const HeatingGap    = require('./heating-gap.js');

class HeatingPeriodOptimizer {

  /**
   * Constructor.
   *
   * @param Influx influx
   *   Influx service.
   * @param GenericOptimizer genericOptimzer
   *   GenericOptimizer service.
   * @param HeatingCalculator heatingCalculator
   *   HeatingCalculator service.
   * @param ZonedDateTime start
   *   Start of the optimization period.
   * @param ZonedDateTime end
   *   End of the optimization period.
   * @param object parameters
   *   Parameters object.
   */
  constructor(influx, genericOptimizer, heatingCalculator, start, end, parameters) {
    console.log('heating-period-optimizer.js: Starting heating period optimizer...');
    console.log('-----------------------------------------------------------------');
    this.influx            = influx;
    this.genericOptimizer  = genericOptimizer;
    this.heatingCalculator = heatingCalculator;

    // Validate start and end and early exit if invalid.
    if (end.isBefore(start)) {
      console.error("heating-period-optimizer.js: period end can't be before period start!");
      this.error = true;
      return null;
    }

    // Validate parameters and early exit if invalid.
    this.error = (this.validateParameters(parameters)) ? false : true;
    if (this.error) {
      return null;
    }

    // Required parameters.
    this.start             = start;
    this.end               = end;
    this.priceItem         = parameters.priceItem;
    this.forecastItem      = parameters.forecastItem;
    this.numberOfPeriods   = parameters.numberOfPeriods;
    this.heatCurve         = parameters.heatCurve;

    // Optional parameters.
    this.dropThreshold     = parameters.dropThreshold;
    this.shortThreshold    = parameters.shortThreshold;
    this.flexDefault       = (parameters.flexDefault == undefined)   ? 0 : parameters.flexDefault;
    this.flexThreshold     = (parameters.flexThreshold == undefined) ? 0 : parameters.flexThreshold;
    this.gapThreshold      = (parameters.gapThreshold == undefined)  ? 0 : parameters.gapThreshold;
    this.shiftPriceLimit     = (parameters.shiftPriceLimit == undefined) ? 0 : parameters.shiftPriceLimit;

    this.genericOptimizer.setPrices(this.influx.getPoints(this.priceItem, this.start, this.end));
    this.periods = [];
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
      let forecast = this.influx.getPoints(this.forecastItem, periodStart, periodEnd);
      let period = new HeatingPeriod.HeatingPeriod(this.heatingCalculator, periodStart, periodEnd, forecast, this.heatCurve, this.flexDefault, this.flexThreshold);
      this.periods.push(period);
      console.log(period);
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

      // Allow the mid-day periods to slide by +/- 1 hour to get better results.
      if (i > 1) {
        a = a.minusHours(1);
      }
      if (i < this.numberOfPeriods) {
        b = b.plusHours(1);
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
          gaps.push(new HeatingGap.HeatingGap(points[i], this.genericOptimizer.getResolution()));

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
   */
  validateParameters(parameters) {
    let isValid = true;

    // numberOfPeriods must be a positive integer
    if (!Number.isInteger(parameters.numberOfPeriods) || parameters.numberOfPeriods <= 0) {
      console.error("heating-period-optimizer.js: Validation failed: numberOfPeriods must be a positive integer.");
      isValid = false;
    }

    // dropThreshold is optional. If set, it must be a number >= 0
    if (parameters.dropThreshold !== undefined &&
      (typeof parameters.dropThreshold !== 'number' || parameters.dropThreshold < 0)) {
      console.error("heating-period-optimizer.js: Validation failed: dropThreshold must be a number >= 0.");
      isValid = false;
    }

    // dropThreshold is optional. If set, it must be a number >= 0
    if (parameters.shortThreshold !== undefined &&
      (typeof parameters.shortThreshold !== 'number' || parameters.shortThreshold < 0)) {
      console.error("heating-period-optimizer.js: Validation failed: shortThreshold must be a number >= 0.");
      isValid = false;
    }

    // flexDefault is optional. If set, it must be a number between 0 and 1 (inclusive)
    if (parameters.flexDefault !== undefined &&
      (typeof parameters.flexDefault !== 'number' || parameters.flexDefault < 0 || parameters.flexDefault > 1)) {
      console.error("heating-period-optimizer.js: Validation failed: flexDefault must be a number between 0 and 1 (inclusive).");
      isValid = false;
    }

    // flexThreshold is optional. If set, it must be a number >= 0
    if (parameters.flexThreshold !== undefined &&
      (typeof parameters.flexThreshold !== 'number' || parameters.flexThreshold < 0)) {
      console.error("heating-period-optimizer.js: Validation failed: flexThreshold must be a number >= 0.");
      isValid = false;
    }

    // gapThreshold is optional. If set, it must be a number >= 0
    if (parameters.gapThreshold !== undefined &&
      (typeof parameters.gapThreshold !== 'number' || parameters.gapThreshold < 0)) {
      console.error("heating-period-optimizer.js: Validation failed: gapThreshold must be a number >= 0.");
      isValid = false;
    }

    // shiftPriceLimit is optional. If set, it must be a number >= 0
    if (parameters.shiftPriceLimit !== undefined &&
      (typeof parameters.shiftPriceLimit !== 'number' || parameters.shiftPriceLimit < 0)) {
      console.error("heating-period-optimizer.js: Validation failed: shiftPriceLimit must be a number >= 0.");
      isValid = false;
    }

    // priceItem must be a non-empty string
    if (typeof parameters.priceItem !== 'string' || parameters.priceItem.trim() === "") {
      console.error("heating-period-optimizer.js: Validation failed: priceItem must be a non-empty string.");
      isValid = false;
    }

    // forecastItem must be a non-empty string
    if (typeof parameters.forecastItem !== 'string' || parameters.forecastItem.trim() === "") {
      console.error("heating-period-optimizer.js: Validation failed: forecastItem must be a non-empty string.");
      isValid = false;
    }

    // heatCurve must be an array with length 2
    if (!Array.isArray(parameters.heatCurve) || parameters.heatCurve.length !== 2) {
      console.error("heating-period-optimizer.js: Validation failed: heatCurve must be an array with 2 points.");
      isValid = false;
    }

    return isValid;
  }
}

/**
 * Exports.
 */
module.exports = {
  HeatingPeriodOptimizer
}
