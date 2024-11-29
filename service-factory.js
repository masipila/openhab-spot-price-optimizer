/**
 * Spot price optimizer, service factory class for creating service instances.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */

class ServiceFactory {

  /**
   * Returns an instance of requested service.
   *
   * @param {string} name
   * @return {object}
   */
  get(name) {
    const { GenericOptimizer }       = require('./generic-optimizer.js');
    const { HeatingCalculator }      = require('./heating-calculator.js');
    const { ValidationHelper }       = require('./validation-helper.js');

    switch (name) {
      case "GenericOptimizer":
        return new GenericOptimizer();
      case "HeatingCalculator":
        return new HeatingCalculator();
      case "ValidationHelper":
        return new ValidationHelper();
      default:
        console.error(`service.factory.js: Invalid service class ${name} requested!`);
    }
  }

}

/**
 * Exports.
 */
module.exports = {
  ServiceFactory
}
