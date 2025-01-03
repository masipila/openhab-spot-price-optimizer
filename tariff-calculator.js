/**
 * Class for calculating distribution prices with Caruna pricing logic.
 *
 * Deprecated. Use GenericTariffCalculator instead. This class will be removed
 * in future versions.
 */

const { Tariff } = require('./tariff.js');
const { GenericTariffCalculator } = require('./generic-tariff-calculator.js');

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

    this.distributionPrices = null;
    this.totalPrices        = null;

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

    // Transform the parameters to the GenericTariffCalculator format.
    let params = {
      start: this.start,
      end: this.end,
      spotItem: this.priceItems.spotItem,
      distributionItem: this.priceItems.distributionItem,
      totalItem: this.priceItems.totalItem
    };

    // Use GenericTariffCalculator for calculating the prices.
    if (this.product == 'night') {
      params.fallbackPrice = this.priceParams.price1 + this.priceParams.tax;
      const genericTariffCalculator = new GenericTariffCalculator(params);

      const t1 = new Tariff('night', (this.priceParams.price2 + this.priceParams.tax));
      t1.setHours([0, 1, 2, 3, 4, 5, 6, 22, 23]);
      genericTariffCalculator.addTariff(t1);
      genericTariffCalculator.calculate();
      this.distributionPrices = genericTariffCalculator.getDistributionPrices();
      this.totalPrices = genericTariffCalculator.getTotalPrices();
    }
    if (this.product == 'seasonal') {
      params.fallbackPrice = this.priceParams.price2 + this.priceParams.tax;
      const genericTariffCalculator = new GenericTariffCalculator(params);

      const t1 = new Tariff('winter-day', (this.priceParams.price1 + this.priceParams.tax));
      t1.setMonths([1, 2, 3, 11, 12]);
      t1.setWeekdays([1, 2, 3, 4, 5, 6]);
      t1.setHours([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
      genericTariffCalculator.addTariff(t1);
      genericTariffCalculator.calculate();
      this.distributionPrices = genericTariffCalculator.getDistributionPrices();
      this.totalPrices = genericTariffCalculator.getTotalPrices();
    }
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
