/**
 * Spot price optimizer, HeatingPeriod class.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

class HeatingPeriod {

  /**
   * Constructor.
   *
   * @param HeatingCalculator heatingCalculator
   *   HeatingCalculator service
   * @param ZonedDateTime start
   *   Start of the heating period.
   * @param ZonedDateTime end
   *   End of the heating period.
   * @param Item forecastItem
   *   Foreacast Item
   * @param array heatCurve
   *   Array of temperature-hours pairs, representing the heat curve.
   * @param float flexDefault
   *   Default flexibility of the heating need, between 0 and 1 (0% - 100%).
   * @param float flexThreshold
   *   Flexibility will be set to 100% when the heating need is below this threshold.
   */
  constructor(heatingCalculator, start, end, forecastItem, heatCurve, flexDefault, flexThreshold) {
    this.heatingCalculator = heatingCalculator;
    this.start             = start;
    this.end               = end;
    this.duration          = time.Duration.between(start, end);
    this.forecastItem      = forecastItem;
    this.heatCurve         = heatCurve;
    this.flexDefault       = flexDefault;
    this.flexThreshold     = flexThreshold;

    // Check that weather forecast is available.
    if (!this.validateForecast()) {
      return null;
    }

    // If forecast duration is not 24H, scale the heating need.
    const multiplier = this.duration.seconds() / time.Duration.parse('PT24H').seconds();
    this.avgTemp = this.forecastItem.persistence.averageBetween(this.start, this.end).numericState;
    this.heatingNeed = this.heatingCalculator.calculateHeatingHoursLinear(this.heatCurve, this.avgTemp, multiplier);

    // Set default flexibility for this period.
    this.flexibility   = (this.heatingNeed < this.flexThreshold) ? 1.0 : this.flexDefault;
  }

  /**
   * Sets the heating need for the heating period.
   *
   * @param float heatingNeed
   */
  setHeatingNeed(heatingNeed) {
    this.heatingNeed = heatingNeed;
    this.flexibility = (this.heatingNeed < this.flexThreshold) ? 1.0 : this.flexDefault;
  }

  /**
   * Sets the flexibility to a new value.
   *
   * @param float flexibility.
   */
  setFlexibility(flexibility) {
    this.flexibility = flexibility;
  }

  /**
   * Returns heating period start.
   *
   * @return ZonedDateTime
   */
  getStart() {
    return this.start;
  }

  /**
   * Returns heating period end.
   *
   * @return ZonedDateTime
   */
  getEnd() {
    return this.end;
  }

  /**
   * Returns heating period average temperature.
   *
   * @return float
   */
  getAvgTemp() {
    if (this.avgTemp === null) {
      return null;
    }
    return parseFloat(this.avgTemp);
  }

  /**
   * Returns heating need for the heating period, in hours.
   *
   * @return float
   */
  getHeatingNeed() {
    if (this.heatingNeed === null) {
      return null;
    }
    return parseFloat(this.heatingNeed);
  }

  /**
   * Returns the non-flexible heating need for the heating period, in hours.
   *
   * @return float
   */
  getNonFlexNeed() {
    if (this.heatingNeed === null) {
      return null;
    }
    let need = (1-this.flexibility) * this.heatingNeed;
    return parseFloat(need);
  }

  /**
   * Returns the flexible heating need for the heating period, in hours.
   *
   * @return float
   */
  getFlexNeed() {
    let need = this.flexibility * this.heatingNeed;
    return parseFloat(need);
  }

  /**
   * Validates that forecast data exists for this period.
   */
  validateForecast() {
    const points = this.forecastItem.persistence.countBetween(this.start, this.end);
    if (points < this.duration.toHours()) {
      console.error('heating-calculator.js: Not enough forecast data available!');
      return false;
    }
    return true;
  }

  /**
   * Returns textual representation of the heating period.
   *
   * @return string
   */
  toString() {
    if (this.avgTemp === null || this.heatingNeed === null) {
      return "heating-period.js: Heating need could not be calculated!"
    }
    return `heating-period.js: ${this.start}: temperature ${this.getAvgTemp().toFixed(2)}, heating hours ${this.getHeatingNeed().toFixed(2)}, flexibility: ${this.flexibility}`;
  }
}

/**
 * Exports.
 */
module.exports = {
  HeatingPeriod
}
