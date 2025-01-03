/**
 * Class for distribution tariffs.
 *
 * Copyright Markus Sipilä 2024. Published under Eclipse Public Licence v 2.0.
 */
class Tariff {

  /**
   * Constructor.
   *
   * @param {string} name
   * @param {number} price
   */
  constructor(name, price) {
    this.name = name;
    this.price = price;

    this.months = [];
    for (let i = 1; i <= 12; i++) {
      this.months.push(i);
    }

    this.weekdays = [];
    for (let i = 1; i <= 7; i++) {
      this.weekdays.push(i);
    }

    this.hours = [];
    for (let i = 1; i <= 23; i++) {
      this.hours.push(i);
    }
  }

  /**
   * Restricts the list of monhts.
   *
   * @param {number[]} list - An array of month numbers (1-12).
   */
  setMonths(list) {
    if (!this.validateInput(list, 1, 12)) {
      return;
    }
    this.months = list;
  }

  /**
   * Restricts the list of weekdays.
   *
   * @param {number[]} list - An array of month numbers (1-7).
   */
  setWeekdays(list) {
    if (!this.validateInput(list, 1, 7)) {
      return;
    }
    this.weekdays = list;
  }

  /**
   * Restricts the list of hours.
   *
   * @param {number[]} list - An array of hour numbers (0-23).
   */
  setHours(list) {
    if (!this.validateInput(list, 0, 23)) {
      return;
    }
    this.hours = list;
  }

  /**
   * Returns the name of this tariff.
   *
   * @return {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Returns the price of this tariff.
   *
   * @return {number}
   */
  getPrice() {
    return this.price;
  }

  /**
   * Checks if the given ZonedDateTime matches the tariff's months, weekdays, and hours.
   *
   * @param {ZonedDateTime} zdt.
   * @returns {boolean}
   *   True if the zdt matches the tariff criteria, false otherwise.
   */
  matches(zdt) {
    const month = zdt.monthValue();
    const weekday = zdt.dayOfWeek().value();
    const hour = zdt.hour();

    return (
      this.months.includes(month) &&
      this.weekdays.includes(weekday) &&
      this.hours.includes(hour)
    );
  }

  /**
   * Validates that the input is an array and that values are within the range.
   *
   * @param {*} input - The input to validate.
   * @param {number} min - The minimum valid value.
   * @param {number} max - The maximum valid value.
   * @returns {boolean} - True if the input is valid, false otherwise.
   */
  validateInput(input, min, max) {
    if (!Array.isArray(input)) {
      console.error(`tariff.js: Invalid input: Expected an array, got ${typeof input}`);
      return false;
    }

    for (const value of input) {
      if (typeof value !== 'number' || value < min || value > max) {
        console.error(`tariff.js: Invalid input: Value ${value} is out of range (${min}-${max}) or not a number.`);
        return false;
      }
    }

    return true;
  }

}

/**
 * Exports.
 */
module.exports = {
  Tariff
}
