/**
 * Class for calculating the estimated total load.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */
class LoadCalculator {

  /**
   * Constructor.
   */
  constructor() {
    this.loadData   = [];
    this.start      = null;
    this.end        = null;
    this.loadItem   = null;
    this.resolution = time.Duration.parse('PT15M');
  }

  /**
   * Initializes the service.
   *
   * @param {ZonedDateTime} start
   * @param {ZonedDateTime} end
   * @param {Item} item
   *   Total Load Item.
   * @param boolean reset
   *   Resets the total loads instead of adding new loads on top of them.
   *   Set to true for the first device in the optimization chain.
   *   Set to false for all others.
   */
  initialize(start, end, item, reset) {
    console.log(`load-calculator.js: Initializing total load calculation between ${start} and ${end}`);

    this.start = this.round(start);
    this.end   = this.round(end);
    this.loadItem = item;

    // Count of existing states in the total load timeseries.
    const n = this.loadItem.persistence.countBetween(this.start, this.end);

    // Initialize this.loadData
    let current = this.start;
    while (current.isBefore(this.end)) {
      let existingLoad = 0;
      if (reset == false && n > 0) {
        existingLoad = this.loadItem.persistence.persistedState(current.plusSeconds(1)).numericState;
      }
      this.loadData.push({ timestamp: current, load: existingLoad });
      current = current.plus(this.resolution);
    }

    console.debug("load-calculator.js: loads after initialization:");
    console.debug(JSON.stringify(this.loadData));
  }

  /**
   * Adds a static load between two times.
   *
   * @param {ZonedDateTime} start
   * @param {ZonedDateTime} end
   * @param {number} load in kW.
   */
  addStaticLoad(start, end, load) {
    console.log(`load-calculator.js: Adding ${load} kW static load between ${start} and ${end}.`);

    // Round start and end to next 15 min if needed.
    start = this.round(start);
    end   = this.round(end);

    // Validate that service is initialized.
    if (this.start === null || this.end === null) {
      console.error(`load-calculator.js: LoadCalculator has not been initialized!`);
      return;
    }

    // Validate start time.
    if (start.isBefore(this.start) || start.isAfter(this.end)) {
      console.error(`load-calculator.js: Start time ${start} is out of bounds!`);
      return;
    }

    // Validate end time.
    if (end.isBefore(this.start) || end.isAfter(this.end)) {
      console.error(`load-calculator.js: End time ${end} is out of bounds!`);
      return;
    }

    // Add the load.
    for (let i = 0; i < this.loadData.length; i++) {
      let current = this.loadData[i].timestamp;
      if (!current.isBefore(start) && current.isBefore(end)) {
        this.loadData[i].load += load;
      }
    }
  }

  /**
   * Adds a dynamic load based on control points read from persistence.
   *
   * @param {TimeSeries} timeseries
   *   Timeseries of control points.
   * @param {number} onLoad
   *   The load value in kW when the control point is 1 (ON).
   */
  addDynamicLoad(timeseries, onLoad) {
    console.log(`load-calculator.js: Adding ${onLoad} kW dynamic load based on control points.`);

    // Early exit if timeseries is empty
    if (!timeseries || timeseries.size == 0) {
      console.error("load-calculator.js: Empty timeseries provided as an input!");
      return;
    }

    // Validate that service is initialized.
    if (this.start === null || this.end === null) {
      console.error(`load-calculator.js: LoadCalculator has not been initialized!`);
      return;
    }

    // Validate that start and end are within the bounds
    const start = time.toZDT(timeseries.begin.toString());
    const end = time.toZDT(timeseries.end.toString());

    // Validate that the timeseries start matches the service start exactly.
    if (!start.isEqual(this.start)) {
      console.error(`load-calculator.js: Start time of the control points ${start} does not match the LoadCalculator start time ${this.start}.`);
      return;
    }

    // Validate end time.
    if (end.isAfter(this.end)) {
      console.error(`load-calculator.js: End time of the control points ${end} is out of bounds!`);
      return;
    }

    // Add the loads based on the provided control points.
    for (let i = 0; i < timeseries.states.length; i++) {
      let zdt = time.toZDT(timeseries.states[i][0].toString());
      let control = timeseries.states[i][1];
      if (control === "1") {
        this.loadData[i].load += onLoad;
      }
    }

    console.debug("load-calculator.js: loads:");
    console.debug(JSON.stringify(this.loadData));
  }

  /**
   * Rounds a ZonedDateTime to the next 15-minute interval.
   *
   * @param {ZonedDateTime} zdt
   *
   * @return {ZonedDateTime} Rounded ZonedDateTime
   */
  round(zdt) {
    const minutes = zdt.minute();
    const remainder = minutes % 15;
    const minutesToAdd = remainder === 0 ? 0 : (15 - remainder);
    return zdt.plusMinutes(minutesToAdd).withSecond(0).withNano(0);
  }

  /**
   * Returns a TimeSeries of the total loads.
   *
   * @return {TimeSeries}
   */
  getTimeSeries() {
    const ts = new items.TimeSeries('REPLACE');
    for (let i = 0; i < this.loadData.length; i++) {
      let zdt = this.loadData[i].timestamp;
      let value = String(this.loadData[i].load);
      ts.add(zdt, value);
    }
    console.debug(ts);
    return ts;
  }

}

/**
 * Exports.
 */
module.exports = {
  LoadCalculator
}
