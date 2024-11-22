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
   * @param string resolution
   *   Use the same resolution that you have for spot prices, e.g. 'PT60M' or 'PT15M'.
   */
  constructor(resolution) {
    this.resolution = time.Duration.parse(resolution);
  }

  /**
   * Returns distribution prices between 'start' and 'end'.
   *
   * @param ZonedDateTime start
   *   Start time
   * @param ZonedDateTime end
   *   End time.
   * @param string product
   *   Distribution product to use: 'night' or 'seasonal'
   * @param object priceParams
   *   Price parameters for given distribution product.
   *
   * @return TimeSeries
   *   TimeSeries of distribution prices.
   */
  getPrices(start, end, product, priceParams) {
    console.log("tariff-calculator.js: Calculating distribution prices...");
    const ts = new items.TimeSeries('REPLACE');

    // Early exit for invalid product argument
    const whitelist = ['night', 'seasonal'];
    if (!whitelist.includes(product)) {
      console.error("tariff-calculator.js: Invalid distribution product " + product);
      return ts;
    }

    let current = start;
    while (current.isBefore(end)) {
      let price;
      if (product == 'night') {
        price = this.calculatePriceNightDistribution(current, priceParams);
      }
      else {
        price = this.calculatePriceSeasonalDistribution(current, priceParams);
      }
      ts.add(current, price.toFixed(2));
      current = current.plus(this.resolution);
    }

    console.debug(ts);
    return ts;
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
   * Returns total elecricity prices by summing spot prices and distribution prices.
   *
   * @param ZonedDateTime start
   * @param ZonedDateTime end
   * @param Item spotItem
   * @param Item distributionItem
   *
   * @return TimeSeries
   *   TimeSeries for total electricity prices.
   */
  getTotalPrices(start, end, spotItem, distributionItem) {
    console.log("tariff-calculator.js: Calculating total price...");
    const ts = new items.TimeSeries('REPLACE');

    // Read spot and distribution prices from persistence service.
    const spotPrices = spotItem.persistence.getAllStatesBetween(start, end);
    const distributionPrices = distributionItem.persistence.getAllStatesBetween(start, end);

    // Early exit if the are mismatch between the spot and distribution prices.
    if (spotPrices.length != distributionPrices.length) {
      console.error(`tariff-calculator.js: Aborting total price calculation! Different number of spot prices (${spotPrices.length}) and distribution prices (${distributionPrices.length})!`);
      return ts;
    }

    // Calculate the total prices.
    for (let i = 0; i < spotPrices.length; i++) {
      let datetime = spotPrices[i].timestamp;
      let spotPrice = spotPrices[i].numericState;
      let distributionPrice = distributionPrices[i].numericState;
      let totalPrice = spotPrice + distributionPrice;
      ts.add(datetime, totalPrice.toFixed(2));
    }
    console.debug(ts);
    return ts;
  }
}

/**
 * Exports.
 */
module.exports = {
  TariffCalculator
}
