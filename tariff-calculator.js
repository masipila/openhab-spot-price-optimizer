/**
 * Class for calculating distribution prices with Caruna pricing logic.
 *
 * If your grid operator has other pricing logic than this, feel free
 * to post a feature request on openHAB community forum.
 */
class TariffCalculator {

  /**
   * Constructor.
   *
   * @param ZonedDateTime start
   * @param ZonedDateTime end
   * @param string product
   *   Distribution product: 'night' or 'seasonal'
   * @param object priceParams
   *   Object with price parameters.
   * @param object priceItems
   *   Object with price items
   */
  constructor(start, end, product, priceParams, priceItems) {
    this.start = start;
    this.end = end;
    this.product = product;
    this.priceParams = priceParams;
    this.priceItems = priceItems;

    // Initialize time series
    this.distributionPrices = new items.TimeSeries('REPLACE');
    this.totalPrices        = new items.TimeSeries('REPLACE');

    // Calculate prices.
    this.calculate();
  }

  /**
   * Calculates distribution and total prices.
   */
  calculate() {
    console.log("tariff-calculator.js: Calculating distribution and total prices...");

    // Early exit for invalid product argument
    const whitelist = ['night', 'seasonal'];
    if (!whitelist.includes(this.product)) {
      console.error(`tariff-calculator.js: Invalid distribution product ${this.product}`);
      return null;
    }

    // Read spot prices from persistence
    const spotPrices = this.priceItems.spotItem.persistence.getAllStatesBetween(this.start, this.end);
    // Calculate distribution price and total price for the same timestamps.
    for (let i = 0; i < spotPrices.length; i++) {
      let current = spotPrices[i].timestamp;

      // Calculate distribution price
      let distributionPrice;
      switch (this.product) {
        case 'night':
          distributionPrice = this.calculatePriceNightDistribution(current, this.priceParams);
          break;
        case 'seasonal':
          distributionPrice = this.calculatePriceSeasonalDistribution(current, this.priceParams);
          break;
      }
      // Calculate total price
      let totalPrice = spotPrices[i].numericState + distributionPrice;

      // Add points to timeseries
      this.distributionPrices.add(current, distributionPrice.toFixed(2));
      this.totalPrices.add(current, totalPrice.toFixed(2));
    }
  }

  /**
   * Returns price for given datetime using Night Distribution.
   *
   * @param ZonedDateTime zdt
   *   Datetime to calculate the tariff for.
   * @param object priceParams
   *   Object with the following keys: price1, price2, tax
   *
   * @return float
   *   Tariff c/kWh at the given time.
   */
  calculatePriceNightDistribution(zdt, priceParams) {
    console.debug("tariff-calculator.js: Calculating fee for hour: " + zdt.toString());

    // Day
    if (zdt.isBetweenTimes('06:59', '22:00')) {
      console.debug("tariff-calculator.js: Day");
      return (priceParams.price1+priceParams.tax);
    }

    // If we're still here it's night
    console.debug("tariff-calculator.js: Night");
    return (priceParams.price2+priceParams.tax);
  }

  /**
   * Returns price for given datetime using Seasonal Distribution.
   *
   * @param ZonedDateTime zdt
   *   Datetime to calculate the tariff for.
   * @param object priceParams
   *   Object with the following keys: price1, price2, tax
   *
   * @return float
   *   Tariff c/kWh at the given time.
   */
  calculatePriceSeasonalDistribution(zdt, priceParams) {
    console.debug("tariff-calculator.js: Calculating fee for hour: " + zdt.toString());

    // Summer price
    if (zdt.monthValue() >= 4 && zdt.monthValue() <= 10) {
      console.debug("tariff-calculator.js: Summer");
      return (priceParams.price2+priceParams.tax);
    }

    // Winter Sundays
    if (zdt.dayOfWeek() == time.DayOfWeek.SUNDAY) {
      console.debug("tariff-calculator.js: Sunday");
      return (priceParams.price2+priceParams.tax);
    }

    // Winter daytime (except Sundays which has been covered already).
    if (zdt.isBetweenTimes('06:59', '22:00')) {
      console.debug("tariff-calculator.js: Winter day");
      return (priceParams.price1+priceParams.tax);
    }

    // If we're still here it's winter night time
    console.debug("tariff-calculator.js: Winter night");
    return (priceParams.price2+priceParams.tax);
  }

  /**
   * Returns distribution prices.
   *
   * @return TimeSeries
   */
  getDistributionPrices() {
    return this.distributionPrices;
  }

  /**
   * Returns total prices.
   *
   * @return TimeSeries
   */
  getTotalPrices() {
    return this.totalPrices;
  }

}

/**
 * Exports.
 */
module.exports = {
  TariffCalculator
}
