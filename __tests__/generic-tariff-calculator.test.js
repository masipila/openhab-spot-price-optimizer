const { assertEqual, assertEqualTime }  = require('./test-utils');
const { Tariff } = require('openhab-spot-price-optimizer/tariff');
const { GenericTariffCalculator } = require('openhab-spot-price-optimizer/generic-tariff-calculator');

function testGenericTariffCalculatorConstructor() {
  const parameters = {
    start: time.toZDT("2023-11-01T00:00:00Z"),
    end: time.toZDT("2023-11-30T23:59:59Z"),
    fallbackPrice: 0.1,
  };

  const calculator = new GenericTariffCalculator(parameters);

  // Assertions
  assertEqual(calculator.start, parameters.start, "Start date should be initialized correctly");
  assertEqual(calculator.end, parameters.end, "End date should be initialized correctly");
  assertEqual(calculator.fallbackPrice, parameters.fallbackPrice, "Fallback price should be initialized correctly");
  assertEqual(calculator.tariffs.length, 0, "Tariffs list should be empty initially");
}

function testGenericTariffCalculatorWithProvidedTariffs() {
  // Mock spot prices
  const spotPrices = [
    { timestamp: time.toZDT("2023-07-01T10:00:00Z"), numericState: 0.2 }, // Matches summer
    { timestamp: time.toZDT("2023-12-01T08:00:00Z"), numericState: 0.3 }, // Matches winter-day
    { timestamp: time.toZDT("2023-12-01T22:00:00Z"), numericState: 0.4 }, // Matches winter-night
    { timestamp: time.toZDT("2023-12-03T10:00:00Z"), numericState: 0.5 }  // Matches winter-sunday
  ];

  const mockSpotItem = {
    persistence: {
      getAllStatesBetween: () => spotPrices
    }
  };

  // Initialize the calculator
  const calculator = new GenericTariffCalculator({
    start: "2023-12-01T00:00:00Z",
    end: "2023-12-31T23:59:59Z",
    fallbackPrice: 1.0,
    spotItem: mockSpotItem
  });

  // Create tariffs
  const winterDay = new Tariff("winter-day", 2.1);
  winterDay.setMonths([1, 2, 3, 11, 12]);
  winterDay.setWeekdays([1, 2, 3, 4, 5, 6]);
  winterDay.setHours([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  calculator.addTariff(winterDay);

  const winterSunday = new Tariff("winter-sunday", 3.1);
  winterSunday.setMonths([1, 2, 3, 11, 12]);
  winterSunday.setWeekdays([7]);
  calculator.addTariff(winterSunday);

  const winterNight = new Tariff("winter-night", 4.1);
  winterNight.setMonths([1, 2, 3, 11, 12]);
  winterNight.setHours([0, 1, 2, 3, 4, 5, 6, 22, 23]);
  calculator.addTariff(winterNight);

  const summer = new Tariff("summer", 5.1);
  summer.setMonths([4, 5, 6, 7, 8, 9, 10]);
  calculator.addTariff(summer);

  // Run calculation
  calculator.calculate();

  // Retrieve calculated prices
  const distributionPrices = calculator.getDistributionPrices();
  const totalPrices = calculator.getTotalPrices();

  // Assertions
  assertEqual(
    distributionPrices.states[0][1],
    "5.10",
    "Spot price 2023-07-01T10:00:00Z should match summer tariff"
  );
  assertEqual(
    totalPrices.states[0][1],
    "5.30",
    "Total price should be the sum of spot price and summer tariff"
  );

  assertEqual(
    distributionPrices.states[1][1],
    "2.10",
    "Spot price 2023-12-01T08:00:00Z should match winter-day tariff"
  );
  assertEqual(
    totalPrices.states[1][1],
    "2.40",
    "Total price should be the sum of spot price and winter-day tariff"
  );

  assertEqual(
    distributionPrices.states[2][1],
    "4.10",
    "Spot price 2023-12-01T22:00:00Z should match winter-night tariff"
  );
  assertEqual(
    totalPrices.states[2][1],
    "4.50",
    "Total price should be the sum of spot price and winter-night tariff"
  );

  assertEqual(
    distributionPrices.states[3][1],
    "3.10",
    "Spot price 2023-12-03T10:00:00Z should match winter-sunday tariff"
  );
  assertEqual(
    totalPrices.states[3][1],
    "3.60",
    "Total price should be the sum of spot price and winter-sunday tariff"
  );

  assertEqual(calculator.tariffs.length, 4, "Tariff list should have 4 entries");
  assertEqual(calculator.tariffs[1].getName(), "winter-sunday", "Tariff name should match what was added.");
}

function testGenericTariffCalculatorFallbackPrice() {
  // Mock spot prices that do not match any tariff
  const spotPrices = [
    { timestamp: time.toZDT("2023-03-01T23:00:00Z"), numericState: 0.4 }, // Does not match winter-night
    { timestamp: time.toZDT("2023-06-01T08:00:00Z"), numericState: 0.5 }  // Does not match summer
  ];

  const mockSpotItem = {
    persistence: {
      getAllStatesBetween: () => spotPrices
    }
  };

  // Initialize the calculator
  const calculator = new GenericTariffCalculator({
    start: "2023-06-01T00:00:00Z",
    end: "2023-06-30T23:59:59Z",
    fallbackPrice: 1.0,
    spotItem: mockSpotItem
  });

  // Add tariffs
  const winterNight = new Tariff("winter-night", 5.50);
  winterNight.setMonths([1, 2, 11, 12]); // Excludes March
  calculator.addTariff(winterNight);

  const summer = new Tariff("summer", 4.50);
  summer.setMonths([4, 5, 7, 8, 9, 10]); // Excludes June
  calculator.addTariff(summer);

  // Run calculation
  calculator.calculate();

  // Retrieve calculated prices
  const distributionPrices = calculator.getDistributionPrices();
  const totalPrices = calculator.getTotalPrices();

  // Assertions
  assertEqual(
    distributionPrices.states[0][1],
    "1.00",
    "Spot price 2023-04-01T23:00:00Z should use fallback price"
  );
  assertEqual(
    totalPrices.states[0][1],
    "1.40",
    "Total price should be the sum of spot price and fallback price"
  );

  assertEqual(
    distributionPrices.states[1][1],
    "1.00",
    "Spot price 2023-06-01T08:00:00Z should use fallback price"
  );
  assertEqual(
    totalPrices.states[1][1],
    "1.50",
    "Total price should be the sum of spot price and fallback price"
  );

}

function testCalculateWithoutSpotPrices() {
  const mockSpotItem = {
    persistence: {
      getAllStatesBetween: () => [] // No spot prices
    }
  };

  const calculator = new GenericTariffCalculator({
    start: time.toZDT("2023-11-01T00:00:00Z"),
    end: time.toZDT("2023-11-01T23:59:59Z"),
    fallbackPrice: 0.1,
    spotItem: mockSpotItem
  });

  calculator.calculate();

  const distributionPrices = calculator.getDistributionPrices();
  const totalPrices = calculator.getTotalPrices();

  console.log(distributionPrices);
  // Assertions
  assertEqual(distributionPrices.size, 0, "Distribution prices should be empty without spot prices");
  assertEqual(totalPrices.size, 0, "Total prices should be empty without spot prices");
}

// Export the test functions
module.exports = {
  testGenericTariffCalculatorConstructor,
  testGenericTariffCalculatorWithProvidedTariffs,
  testGenericTariffCalculatorFallbackPrice,
  testCalculateWithoutSpotPrices
}
