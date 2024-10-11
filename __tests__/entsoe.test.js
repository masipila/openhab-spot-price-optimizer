const { assertEqual } = require('./test-utils');
const { Entsoe } = require('openhab-spot-price-optimizer/entsoe');

/**
 * Test: Entso-E API response with one TimeSeries and one Period.
 */
function testOneTimeSeriesOnePeriod() {
  const start = time.toZDT('2024-10-05T22:00Z');
  const end = time.toZDT('2024-10-06T22:00Z');

  // Create an instance of the Entsoe class and mock the API call response.
  const entsoe = new Entsoe();
  entsoe.makeApiCall = function(start, end) {
    return require('./test-data/entsoe-1-1.xml.js');
  };

  // Call the method under test
  const prices = entsoe.getSpotPrices(start, end, 1.255);
  const expected = require('./test-data/entsoe-prices-1-day.json');

  // Assert that the returned prices match the expected ones
  assertEqual(JSON.stringify(prices), JSON.stringify(expected), "The spot prices should match the expected values.");
}

/**
 * Test: Entso-E API response with one TimeSeries and two Periods.
 */
function testOneTimeSeriesTwoPeriods() {
  const start = time.toZDT('2024-10-04T22:00Z');
  const end = time.toZDT('2024-10-06T22:00Z');

  // Create an instance of the Entsoe class and mock the API call response.
  const entsoe = new Entsoe();
  entsoe.makeApiCall = function(start, end) {
    return require('./test-data/entsoe-1-2.xml.js');
  };

  // Call the method under test
  const prices = entsoe.getSpotPrices(start, end, 1.255);
  const expected = require('./test-data/entsoe-prices-2-days.json');

  // Assert that the returned prices match the expected ones
  assertEqual(JSON.stringify(prices), JSON.stringify(expected), "The spot prices should match the expected values.");
}

/**
 * Test: Entso-E API response with one TimeSeries and two Periods.
 */
function testTwoTimeSeriesOnePeriod() {
  const start = time.toZDT('2024-10-04T22:00Z');
  const end = time.toZDT('2024-10-06T22:00Z');

  // Create an instance of the Entsoe class and mock the API call response.
  const entsoe = new Entsoe();
  entsoe.makeApiCall = function(start, end) {
    return require('./test-data/entsoe-2-1.xml.js');
  };

  // Call the method under test
  const prices = entsoe.getSpotPrices(start, end, 1.255);
  const expected = require('./test-data/entsoe-prices-2-days.json');

  // Assert that the returned prices match the expected ones
  assertEqual(JSON.stringify(prices), JSON.stringify(expected), "The spot prices should match the expected values.");
}

/**
 * Test: Entso-E API response with two TimeSeries and two Periods each.
 */
function testTwoTimeSeriesTwoPeriods() {
  const start = time.toZDT('2024-10-02T22:00Z');
  const end = time.toZDT('2024-10-06T22:00Z');

  // Create an instance of the Entsoe class and mock the API call response.
  const entsoe = new Entsoe();
  entsoe.makeApiCall = function(start, end) {
    return require('./test-data/entsoe-2-2.xml.js');
  };

  // Call the method under test
  const prices = entsoe.getSpotPrices(start, end, 1.255);
  const expected = require('./test-data/entsoe-prices-4-days.json');

  // Assert that the returned prices match the expected ones
  assertEqual(JSON.stringify(prices), JSON.stringify(expected), "The spot prices should match the expected values.");
}

/**
 * Test: Entso-E API response with an A03 curve with gaps in it.
 */
function testA03Gap() {
  const start = time.toZDT('2024-10-10T22:00Z');
  const end = time.toZDT('2024-10-11T22:00Z');

  // Create an instance of the Entsoe class and mock the API call response.
  const entsoe = new Entsoe();
  entsoe.makeApiCall = function(start, end) {
    return require('./test-data/entsoe-a03-gap.xml.js');
  };

  // Call the method under test
  const prices = entsoe.getSpotPrices(start, end, 1.255);
  const expected = require('./test-data/entsoe-prices-a03-gap.json');

  // Assert that the returned prices match the expected ones
  assertEqual(JSON.stringify(prices), JSON.stringify(expected), "The spot prices should match the expected values.");
}



// Export the test function
module.exports = {
  testOneTimeSeriesOnePeriod,
  testOneTimeSeriesTwoPeriods,
  testTwoTimeSeriesOnePeriod,
  testTwoTimeSeriesTwoPeriods,
  testA03Gap
};
