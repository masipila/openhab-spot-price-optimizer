/**
 * Spot price optimizer, class for generic optimizing algorithms.
 */
class GenericOptimizer {

  /**
   * Constructor.
   *
   * The resolution of the price time series is defaulted to PT15M.
   */
  constructor() {
    this.prices = [];
    this.resolution = time.Duration.parse('PT15M');
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

    console.log(`generic-optimizer.js: price window ${this.priceStart} - ${this.priceEnd} (${this.priceWindowDuration})`);
    console.debug(JSON.stringify(this.prices));
  }

  /**
   * Returns the prices array.
   *
   * @return array
   */
  getPrices() {
    return this.prices;
  }

  /**
   * Returns the price resolution.
   *
   * @return Duration
   */
  getResolution() {
    return this.resolution;
  }

  /**
   * Allows the cheapest individual slots.
   *
   * Wrapper function for optimizeInPieces.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easier to pass the value from an Item.
   *
   * @param float hours
   *   Total duration to allow, in number of hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  allowInPieces(hours, startConstraint=null, endConstraint=null) {
    this.optimizeInPieces('allow', hours, startConstraint, endConstraint);
  }

  /**
   * Blocks the most expensive individual slots.
   *
   * Wrapper function for optimizeInPieces.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param float hours
   *   Total duration to allow, in number of hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  blockInPieces(hours, startConstraint=null, endConstraint=null) {
    this.optimizeInPieces('block', hours, startConstraint, endConstraint);
  }

  /**
   * Allows the cheapest consecutive period of N hours.
   *
   * Wrapper function for optimizePeriod.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param float hours
   *   Duration of the period to be allowed in hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  allowPeriod(hours, startConstraint=null, endConstraint=null) {
    this.optimizePeriod('allow', hours, startConstraint, endConstraint);
  }

  /**
   * Blocks the most expensive consecutive period of N hours.
   *
   * Wrapper function for optimizePeriod.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param float hours
   *   Duration of the period to be allowed in hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  blockPeriod(hours, startConstraint=null, endConstraint=null) {
    this.optimizePeriod('block', hours, startConstraint, endConstraint);
  }

  /**
   * Allows all remaining times that don't have a control value yet.
   *
   * Wrapper for setAllRemaining.
   *
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  allowAllRemaining(startConstraint=null, endConstraint=null) {
    this.setAllRemaining('allow', startConstraint, endConstraint);
  }

  /**
   * Blocks all remaining times that don't have a control value yet.
   *
   * Wrapper for setAllRemaining.
   *
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  blockAllRemaining(startConstraint=null, endConstraint=null) {
    this.setAllRemaining('block', startConstraint, endConstraint);
  }

  /**
   * Finds N cheapest individual hours and allows them.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param float hours
   *   Number of cheap hours to find.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  allowIndividualHours(hours, startConstraint=null, endConstraint=null) {
    // Early exit if non-positive number of hours is requested.
    if (!this.validateRequestedHours(hours)) {
      return null;
    }

    console.log(`generic-optimizer.js: allow ${hours.toFixed(2)} hours in chunks of 1 hour...`);

    // Allow in chunks of 1 hour. Add remainder to the first chunk.
    let firstHours = 0;
    if (hours >= 1) {
      firstHours = 1 + (hours % 1);
      this.optimizePeriod('allow', firstHours, startConstraint, endConstraint);
    }

    // Allow all remaining in chunks of 1 hour.
    let remainingHours = hours - firstHours;
    while (remainingHours > 0) {
      this.optimizePeriod('allow', 1, startConstraint, endConstraint);
      remainingHours--;
    }
  }

  /**
   * Finds N most expensive individual hours and blocks them.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param float hours
   *   Number of expensive hours to find.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  blockIndividualHours(hours, startConstraint=null, endConstraint=null) {
    // Early exit if non-positive number of hours is requested.
    if (!this.validateRequestedHours(hours)) {
      return null;
    }

    console.log(`generic-optimizer.js: block ${hours.toFixed(2)} hours in chunks of 1 hour...`);

    // Block in chunks of 1 hour. Add remainder to the first chunk.
    let firstHours = 0;
    if (hours >= 1) {
      firstHours = 1 + (hours % 1);
      this.optimizePeriod('block', firstHours, startConstraint, endConstraint);
    }

    // Block all remaining in chunks of 1 hour.
    let remainingHours = hours - firstHours;
    while (remainingHours > 0) {
      this.optimizePeriod('block', 1, startConstraint, endConstraint);
      remainingHours--;
    }
  }

  /**
   * Optimize in resolution pieces
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's
   * easy to pass the value from an Item.
   *
   * @param string operation
   *   'allow' or 'block'
   * @param float hours
   *   Duration in hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  optimizeInPieces(operation, hours, startConstraint = null, endConstraint = null) {
    // Early exit if invalid operation is requested.
    if (operation != 'allow' && operation != 'block') {
      console.error("generic-optmizer.js: operation argument must be either 'allow' or 'block'.");
      this.error = true;
      return null;
    }
    // Early exit if negative number of hours is requested.
    if (!this.validateRequestedHours(hours)) {
      return null;
    }
    // Early exit if previous errors have been flagged.
    if (this.error) {
      console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
      return null;
    }

    // Convert from hours to a Duration, ensure it matches price resolution.
    let remainingDuration = this.round(time.Duration.ofMinutes(Math.round(60*hours)));

    // Set constraints and calculate the duration of the optimization window.
    if (startConstraint == null) {
      startConstraint = this.priceStart;
    }
    if (endConstraint == null) {
      endConstraint = this.priceEnd;
    }
    let window = time.Duration.between(startConstraint, endConstraint);

    // Early exit if requested duration is longer than the price window.
    if (remainingDuration.compareTo(window) > 0) {
      this.error = true;
      console.error(`generic-optimizer.js: Optimization aborted. ${remainingDuration} requested but price window is only ${window}`);
      return null;
    }

    console.log(`generic-optimizer.js: ${operation} ${remainingDuration} in slots of ${this.resolution} between ${startConstraint} and ${endConstraint}`);

    // Sorted by price, cheapest or most expensive first depending on operation.
    if (operation == 'allow') {
      this.prices.sort((a, b) => (a.value >= b.value) ? 1 : -1);
    }
    else {
      this.prices.sort((a, b) => (a.value < b.value) ? 1 : -1);
    }

    // Allow / block first possible slots.
    const controlValue = (operation == 'allow') ? 1 : 0;

    for (let i = 0; i < this.prices.length; i++) {
      if ("control" in this.prices[i]) {
        continue;
      }
      let current = time.toZDT(this.prices[i].datetime);
      if (current.isBefore(startConstraint)) {
        continue;
      }
      if (current.isEqual(endConstraint) || current.isAfter(endConstraint)) {
        continue;
      }
      if (remainingDuration.isZero()) {
        break;
      }

      this.prices[i].control = controlValue;
      remainingDuration = remainingDuration.minus(this.resolution);
    }

    // Return sort by datetime.
    this.prices.sort((a, b) => (a.datetime >= b.datetime) ? 1 : -1);
  }

  /**
   * Optimizes a consecutive period of given duration.
   *
   * Input parameter is taken as a number (instead of a Duration) so that it's easy to
   * pass the value from an Item. Using a float e.g. 1.25 hours is accepted.
   *
   * @param string operation
   *   'allow' or 'block'
   * @param float hours
   *   Duration in hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  optimizePeriod(operation, hours, startConstraint=null, endConstraint=null) {
    // Early exit if invalid operation is requested.
    if (operation != 'allow' && operation != 'block') {
      console.error("generic-optmizer.js: operation argument must be either 'allow' or 'block'.");
      this.error = true;
      return null;
    }
    // Early exit if negative number of hours is requested.
    if (!this.validateRequestedHours(hours)) {
      this.error = true;
      return null;
    }
    // Early exit if previous errors have been flagged.
    if (this.error) {
      console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
      return null;
    }
    // Early exit (without error flag), if requested duration is 0.
    if (hours == 0) {
      return null;
    }

    console.log(`generic-optimizer.js: ${operation} ${hours.toFixed(2)} hours as a consecutive period...`);

    // Convert hours (which can be a float) to a Duration.
    const duration = this.round(time.Duration.ofMinutes(Math.round(hours*60)));

    // Set constraints and calculate the duration of the optimization window.
    if (startConstraint == null) {
      startConstraint = this.priceStart;
    }
    if (endConstraint == null) {
      endConstraint = this.priceEnd;
    }
    let window = time.Duration.between(startConstraint, endConstraint);

    // Early exit if not enough prices are available within the constraints.
    if (duration.compareTo(this.priceWindowDuration) > 0) {
      this.error = true;
      console.error(`generic-optimizer.js: Optimization aborted. ${duration} requested but price window is only ${window}`);
      return null;
    }

    // Allow / block the first possible period, based on operation.
    const sort = (operation == 'allow') ? 'asc' : 'desc';
    const prices = this.calculatePeriodPrices(duration, sort, startConstraint, endConstraint);

    if (prices.length > 0) {
      const controlValue = (operation == 'allow') ? 1 : 0;
      const start = time.toZDT(prices[0].datetime);
      this.setControlForPeriod(start, duration, controlValue);
      console.debug('generic-optimizer.js: Optimizing a consecutive period of ' + duration + ' starting at ' + start);
    }
    else {
      console.error('generic-optimizer.js: Could not optimize a consecutive period of ' + duration + '! No consecutive periods available!');
      this.error = true;
    }

    // Return sort by datetime.
    this.prices.sort((a, b) => (a.datetime >= b.datetime) ? 1 : -1);
  }

  /**
   * Allows or blocks all remaining slots that don't have a control value yet.
   *
   * @param string operation
   *   'allow' or 'block'
   * @param float hours
   *   Duration in hours.
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   */
  setAllRemaining(operation, startConstraint=null, endConstraint=null) {
    console.log(`generic-optimizer.js: ${operation} all remaining...`);

    // Early exit if invalid operation is requested.
    if (operation != 'allow' && operation != 'block') {
      console.error("generic-optmizer.js: operation argument must be either 'allow' or 'block'.");
      this.error = true;
      return null;
    }

    // Early exit if previous errors have been flagged.
    if (this.error) {
      console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
      return null;
    }

    // Set constraints
    if (startConstraint == null) {
      startConstraint = this.priceStart;
    }
    if (endConstraint == null) {
      endConstraint = this.priceEnd;
    }

    // Allow / block all remaining within constraints
    const controlValue = (operation == 'allow') ? 1 : 0;

    for (let i = 0; i < this.prices.length; i++) {
      if ("control" in this.prices[i]) {
        continue;
      }
      let current = time.toZDT(this.prices[i].datetime);
      if (current.isBefore(startConstraint)) {
        continue;
      }
      if (current.isEqual(endConstraint) || current.isAfter(endConstraint)) {
        continue;
      }
      this.prices[i]['control'] = controlValue;
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
      console.warn("generic-optimizer.js: Datetime " + datetime + " not found in prices array, unable to set control points!");
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
   * @param ZonedDateTime startConstraint
   *   Optional. Earliest possible start time.
   * @param ZonedDateTime endConstraint
   *   Optional. Latest possible end time.
   *
   * @return array
   *   Array of datetime-sum pairs.
   */
  calculatePeriodPrices(duration, sort='asc', startConstraint=null, endConstraint=null) {
    let periodPrices = [];

    // Early exit if duration is zero.
    if (duration.isZero()) {
      return periodPrices;
    }

    // Set constraints.
    if (startConstraint == null) {
      startConstraint = this.priceStart;
    }
    if (endConstraint == null) {
      endConstraint = this.priceEnd;
    }

    // Early exit if prices are not available.
    if (this.error) {
      console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
      return periodPrices;
    }

    // Early exit if duration is 0.
    if (duration.isZero() == true) {
      return periodPrices;
    }

    // Ensure prices are sorted by datetime.
    this.prices.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);

    let iterationStart = this.priceStart;

    // If end constraint is set and is earlier than price end, use that instead.
    let lastStart = this.priceEnd.minus(duration);
    if (endConstraint && endConstraint.isBefore(this.priceEnd)) {
      lastStart = endConstraint.minus(duration);
    }

    let i = 0;

    // Calculate the sum for the period starting at each index.
    while (iterationStart.isBefore(lastStart) || iterationStart.isEqual(lastStart)) {
      console.debug("generic-optimizer.js: Analyzing period starting at " + iterationStart + " (index " + i + ")");
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

      // Do not allow current iteration if startConstraint restricts it.
      if (iterationStart.isBefore(startConstraint)) {
        console.debug('generic-optimizer.js: Current iteration start ' + iterationStart + ' not allowed by start constraint ' + startConstraint + ', skipping.');
        controlFound = true;
      }

      // If previous control points were not found, add sum of this period to the result array.
      if (controlFound == false) {
        console.debug("generic-optimizer.js: " + sum);
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
      periodPrices.sort((a, b) => (a.sum >= b.sum) ? 1 : -1);
    }
    else {
      periodPrices.sort((a, b) => (a.sum >= b.sum) ? -1 : 1);
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
    let points = [];

    // Early exit if there have been errors.
    if (this.error) {
      console.error("generic-optimizer.js: Aborting optimization, see previous errors!");
      return null;
    }

    for (let i = 0; i < this.prices.length; i++) {
      points[i] = {
        datetime: this.prices[i]['datetime'],
        value: this.prices[i]['control']
      }
    }

    return points;
  }

  /**
   * Validates the requested amount of hours.
   *
   * @param float hours
   *
   * @return bool
   */
  validateRequestedHours(hours) {
    if (hours === undefined || hours === null) {
      console.error("generic-optimizer.js: Aborting optimization, undefined/null input parameter!");
      this.error = true;
      return false;
    }

    if (hours < 0) {
      console.error(`generic-optimizer.js: Aborting optimization, negative duration of ${hours} requested!`);
      return false;
    }

    const requestDuration = time.Duration.ofMinutes(60 * hours);
    if (requestDuration.compareTo(this.priceWindowDuration) > 0) {
      console.error(`generic-optimizer.js: Aborting optimization, requested duration ${requestDuration} is longer than the price window!`);
      return false;
    }

    return true;
  }

}

/**
 * Exports.
 */
module.exports = {
  GenericOptimizer
};
