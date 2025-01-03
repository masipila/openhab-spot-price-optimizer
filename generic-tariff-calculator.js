/**
 * Class for calculating distribution prices.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

class GenericTariffCalculator {

  /**
   * Constructor.
   *
   * @param {object} parameters
   *   Object with following properities:
   *   - {ZonedDateTime} start
   *   - {ZonedDateTime} end
   *   - {number} fallbackPrice
   *   - {Item} spotItem
   */
  constructor(parameters) {
    this.start = parameters.start;
    this.end   = parameters.end;
    this.fallbackPrice = parameters.fallbackPrice;
    this.spotItem = parameters.spotItem;

    this.tariffs = [];
    this.distributionPrices = new items.TimeSeries('REPLACE');
    this.totalPrices        = new items.TimeSeries('REPLACE');
  }

  /**
   * Adds new tariff to the calculator.
   *
   * @param {Tariff} tariff
   */
  addTariff(tariff) {
    this.tariffs.push(tariff);
  };

  /**
   * Calculates distribution price and total price for the given period.
   */
  calculate() {
    console.log("generic-tariff-calculator.js: Calculating distribution and total prices...");

    // Read spot prices from persistence
    const spotPrices = this.spotItem.persistence.getAllStatesBetween(this.start, this.end);

    // Early exit if spot prices are not available.
    if (spotPrices.length < 1) {
      console.error(`generic-tariff-calculator.js: Aborting tariff calculations, no spot prices available for ${this.start} - ${this.end}`);
    }

    // Calculate distribution prices and total prices for the same timestamps as spot prices.
    for (let i = 0; i < spotPrices.length; i++) {
      let current = spotPrices[i].timestamp;
      let distributionPrice = null;

      // Find the first tariff that matches.
      for (let j = 0; j < this.tariffs.length; j++) {
        let t = this.tariffs[j];
        if (t.matches(current)) {
          console.debug(`${current}: match to ${t.getName()} (${t.getPrice()})`);
          distributionPrice = t.getPrice();
          break;
        }
        else {
          console.debug(`${current}: no match to ${t.getName()}`);
        }
      }
      // If no tariff was found, use the fallback price.
      if (distributionPrice === null) {
        console.debug(`${current}: Fallback price (${this.fallbackPrice})`);
        distributionPrice = this.fallbackPrice;
      }

      // Calculate total price.
      let totalPrice = spotPrices[i].numericState + distributionPrice;

      // Add points to timeseries
      this.distributionPrices.add(current, distributionPrice.toFixed(2));
      this.totalPrices.add(current, totalPrice.toFixed(2));
    }
  }

  /**
   * Returns distribution prices.
   *
   * @return {TimeSeries}
   */
  getDistributionPrices() {
    return this.distributionPrices;
  }

  /**
   * Returns total prices.
   *
   * @return {TimeSeries}
   */
  getTotalPrices() {
    return this.totalPrices;
  }

}

/**
 * Exports.
 */
module.exports = {
  GenericTariffCalculator
}
