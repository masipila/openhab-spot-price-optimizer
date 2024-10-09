/**
 * Spot price optimizer, HeatingGap class.
 */

class HeatingGap {

  /**
   * Constructor.
   *
   * @param object point
   *   Pricepoint object as datetime-value pair.
   * @param Duration resolution
   *   Resolution of the price point time series.
   */
  constructor(point, resolution) {
    this.resolution                = resolution;
    this.gapStartTime              = time.toZDT(point.datetime);
    this.gapStartPrice             = point.value;
    this.gapEndTime                = null;
    this.gapEndPrice               = null;
    this.gapDuration               = resolution;
    this.previousHeatingStartTime  = null;
    this.previousHeatingStartPrice = null;
    this.previousHeatingEndTime    = null;
    this.previousHeatingEndPrice   = null;
    this.previousHeatingDuration   = null;
    this.nextHeatingStartTime      = null;
    this.nextHeatingStartPrice     = null;
    this.nextHeatingEndTime        = null;
    this.nextHeatingEndPrice       = null;
    this.nextHeatingDuration       = null;
  }

  /**
   * Returns the gap start datetime.
   *
   * @return ZonedDateTime
   */
  getGapStartTime() {
    return this.gapStartTime;
  }

  /**
   * Returns the gap start price
   *
   * @return float
   */
  getGapStartPrice() {
    return this.gapStartPrice;
  }

  /**
   * Returns the gap end datetime.
   *
   * @return ZonedDateTime
   */
  getGapEndTime() {
    return this.gapEndTime;
  }

  /**
   * Returns the gap end price
   *
   * @return float
   */
  getGapEndPrice() {
    return this.gapEndPrice;
  }

  /**
   * Returns gap duration
   *
   * @return Duration
   */
  getGapDuration() {
    return this.gapDuration;
  }

  /**
   * Returns the start time of the previous heating period.
   *
   * @return ZonedDateTime|null
   */
  getPreviousHeatingStartTime() {
    return this.previousHeatingStartTime;
  }

  /**
   * Returns the start price of the previous heating period.
   *
   * @return float|null
   */
  getPreviousHeatingStartPrice() {
    return this.previousHeatingStartPrice;
  }

  /**
   * Returns the end time of the previous heating period.
   *
   * @return ZonedDateTime|null
   */
  getPreviousHeatingEndTime() {
    return this.previousHeatingEndTime;
  }

  /**
   * Returns the end price of the previous heating period.
   *
   * @return float|null
   */
  getPreviousHeatingEndPrice() {
    return this.previousHeatingEndPrice;
  }

  /**
   * Returns the duration of the previous heating period.
   *
   * @return Duration|null
   */
  getPreviousHeatingDuration() {
    return this.previousHeatingDuration;
  }

  /**
   * Returns the start time of the next heating period.
   *
   * @return ZonedDateTime|null
   */
  getNextHeatingStartTime() {
    return this.nextHeatingStartTime;
  }

  /**
   * Returns the start price of the previous heating period.
   *
   * @return float|null
   */
  getNextHeatingStartPrice() {
    return this.nextHeatingStartPrice;
  }

  /**
   * Returns the end time of the previous heating period.
   *
   * @return ZonedDateTime|null
   */
  getNextHeatingEndTime() {
    return this.nextHeatingEndTime;
  }

  /**
   * Returns the end price of the previous heating period.
   *
   * @return float|null
   */
  getNextHeatingEndPrice() {
    return this.nextHeatingEndPrice;
  }

  /**
   * Returns the duration of the next heating period.
   *
   * @return Duration|null
   */
  getNextHeatingDuration() {
    return this.nextHeatingDuration;
  }

  /**
   * Sets the gap end time and price.
   *
   * @param object point
   *   datetime-value pair.
   */
  setGapEnd(point) {
    if (point != null) {
      this.gapEndTime  = time.toZDT(point.datetime);
      this.gapEndPrice = point.value;
    }
  }

  /**
   * Sets the start time and start price for the next heating period.
   *
   * @param object point
   *   datetime-value pair.
   */
  setNextHeatingStart(point) {
    if (point != null) {
      this.nextHeatingStartTime  = time.toZDT(point.datetime);
      this.nextHeatingStartPrice = point.value;
    }
  }

  /**
   * Sets the end time and end price for the next heating period.
   *
   * @param object point
   *   datetime-value pair.
   */
  setNextHeatingEnd(point) {
    if (point != null) {
      this.nextHeatingEndTime  = time.toZDT(point.datetime);
      this.nextHeatingEndPrice = point.value;
    }
    if (this.nextHeatingStartTime != null && this.nextHeatingEndTime != null) {
      this.nextHeatingDuration = time.Duration.between(this.nextHeatingStartTime, this.nextHeatingEndTime).plus(this.resolution);
      }
  }

  /**
   * Sets the start time and start price for the previous heating period.
   *
   * @param object point
   *   datetime-value pair.
   */
  setPreviousHeatingStart(point) {
    if (point != null) {
      this.previousHeatingStartTime  = time.toZDT(point.datetime);
      this.previousHeatingStartPrice = point.value;
    }
  }

  /**
   * Sets the end time and end price for the previous heating period.
   *
   * @param object point
   *   datetime-value pair.
   */
  setPreviousHeatingEnd(point) {
    if (point != null) {
      this.previousHeatingEndTime  = time.toZDT(point.datetime);
      this.previousHeatingEndPrice = point.value;

      if (this.previousHeatingStartTime != null && this.previousHeatingEndTime != null) {
        this.previousHeatingDuration = time.Duration.between(this.previousHeatingStartTime, this.previousHeatingEndTime).plus(this.resolution);
      }
    }
  }

  /**
   * Inreases the duration of the gap by the resolution.
   */
  increaseDuration() {
    this.gapDuration = this.gapDuration.plus(this.resolution);
  }

  /**
   * Sets the duration to the give value.
   *
   * @param Duration duration
   */
  setGapDuration(duration) {
    this.gapDuration = duration;
  }

  /**
   * Returns the direction the heating can be shifted, or false.
   *
   * @param Duration durationThreshold
   *   Maximum allowed shift between heating periods unless heating duration is less than shortThreshold.
   * @param float priceLimit
   *   Limits how much more expensive the price can be after the shift.
   * @param ZonedDateTime priceStart
   *   Start time of the pricing array, used to avoid causing a gap at the start of the day.
   *
   * @return string|bool
   *   'left', 'right' or false, if heating cannot be shifted.
   */
  getShiftDirection(durationThreshold, priceLimit, priceStart) {
    let shiftLeftAllowed  = this.shiftLeftAllowed(durationThreshold, priceLimit);
    let shiftRightAllowed = this.shiftRightAllowed(durationThreshold, priceLimit, priceStart);

    if (!shiftLeftAllowed && !shiftRightAllowed) {
      return false;
    }
    if (shiftLeftAllowed && !shiftRightAllowed) {
      return 'left';
    }
    if (!shiftLeftAllowed && shiftRightAllowed) {
      return 'right';
    }
    console.debug("heating-gap.js: Both directions allowed, choosing cheaper.");
    if (this.gapStartPrice <= this.nextHeatingEndPrice) {
      return 'left';
    }
    return 'right';
  }

  /**
   * Checks if a gap can be closed by shifting the next heating left.
   *
   * @param Duration durationThreshold
   *   Maximum allowed shift.
   * @param float priceLimit
   *   Limits how much more expensive the price can be after the shift.
   *
   * @return bool
   *   True, if gap can be shifted left. False otherwise.
   */
  shiftLeftAllowed(durationThreshold, priceLimit) {
    if (this.gapDuration.compareTo(durationThreshold) > 0) {
      console.debug("heating-gap.js: " + this + ", shifting next heating left not allowed, limited by duration threshold.");
      return false;
    }
    if (this.nextHeatingEndTime == null) {
      console.debug("heating-gap.js: " + this + ", shifting next heating left not allowed, end of the day heating/gap.");
      return false;
    }
    if (this.gapStartPrice - this.nextHeatingEndPrice > priceLimit) {
      console.debug("heating-gap.js: " + this + ", shifting next heating left not allowed, limited by price threshold");
      return false;
    }
    console.debug("heating-gap.js: " + this +", shifting next heating left allowed.")
    return true;
  }

  /**
   * Checks if a gap can be closed by shifting the previous heating right.
   *
   * @param Duration durationThreshold
   *   Maximum allowed shift.
   * @param float priceLimit
   *   Limits how much more expensive the price can be after the shift.
   *
   * @return bool
   *   True, if heating before the gap can be shifted right. False otherwise.
   */
  shiftRightAllowed(durationThreshold, priceLimit, priceStart) {
    if (this.gapDuration.compareTo(durationThreshold) > 0) {
      console.debug("heating-gap.js: " + this + ", shifting previous heating right not allowed, limited by duration threshold.");
      return false;
    }
    if (this.previousHeatingStartTime != null && this.previousHeatingStartTime.isEqual(time.toZDT(priceStart))) {
      console.debug("heating-gap.js: " + this + ", shifting previous heating right not allowed, start of the day heating.");
      return false;
    }
    if (this.previousHeatingStartTime == null) {
      console.debug("heating-gap.js: " + this + ", shifting previous heating right not allowed, start of the day gap.");
      return false;
    }
    if (this.gapStartPrice - this.previousHeatingStartPrice > priceLimit) {
      console.debug("heating-gap.js: " + this + ", shifting previous heating right not allowed, limited by price threshold");
      return false;
    }
    console.debug("heating-gap.js: " + this +", shifting previous heating right allowed.")
    return true;
  }

  /**
   * Returns textual representation of the gap.
   *
   * @return string
   */
  toString() {
    return `${this.gapDuration} gap starting at ${this.gapStartTime}`;
  }
}

/**
 * Exports.
 */
module.exports = {
  HeatingGap
}
