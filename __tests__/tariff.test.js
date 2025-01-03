const { assertEqual }  = require('./test-utils');
const { Tariff } = require('openhab-spot-price-optimizer/tariff');

// Test constructor behavior
function testTariffConstructor() {
  const tariff = new Tariff("Standard", 0.15);

  // Assertions
  assertEqual(tariff.name, "Standard", "Tariff name should be initialized correctly");
  assertEqual(tariff.price, 0.15, "Tariff price should be initialized correctly");
  assertEqual(tariff.months.length, 12, "Tariff months should include all months (1-12)");
  assertEqual(tariff.weekdays.length, 7, "Tariff weekdays should include all days (1-7)");
  assertEqual(tariff.hours.length, 23, "Tariff hours should include all hours (0-23)");
}

// Test setMonths method
function testSetMonths() {
  const tariff = new Tariff("Standard", 0.15);

  // Valid input
  tariff.setMonths([1, 2, 3]);
  assertEqual(JSON.stringify(tariff.months), JSON.stringify([1, 2, 3]), "Tariff months should be updated correctly");

  // Invalid input: non-array
  tariff.setMonths("invalid");
  assertEqual(JSON.stringify(tariff.months), JSON.stringify([1, 2, 3]), "Tariff months should not change on invalid input");

  // Invalid input: out of range
  tariff.setMonths([0, 13]);
  assertEqual(JSON.stringify(tariff.months), JSON.stringify([1, 2, 3]), "Tariff months should not change on out-of-range input");
}

// Test setWeekdays method
function testSetWeekdays() {
  const tariff = new Tariff("Standard", 0.15);

  // Valid input
  tariff.setWeekdays([1, 5, 7]);
  assertEqual(JSON.stringify(tariff.weekdays), JSON.stringify([1, 5, 7]), "Tariff weekdays should be updated correctly");

  // Invalid input: non-array
  tariff.setWeekdays(123);
  assertEqual(JSON.stringify(tariff.weekdays), JSON.stringify([1, 5, 7]), "Tariff weekdays should not change on invalid input");

  // Invalid input: out of range
  tariff.setWeekdays([0, 8]);
  assertEqual(JSON.stringify(tariff.weekdays), JSON.stringify([1, 5, 7]), "Tariff weekdays should not change on out-of-range input");
}

// Test setHours method
function testSetHours() {
  const tariff = new Tariff("Standard", 0.15);

  // Valid input
  tariff.setHours([0, 12, 23]);
  assertEqual(JSON.stringify(tariff.hours), JSON.stringify([0, 12, 23]), "Tariff hours should be updated correctly");

  // Invalid input: non-array
  tariff.setHours("invalid");
  assertEqual(JSON.stringify(tariff.hours), JSON.stringify([0, 12, 23]), "Tariff hours should not change on invalid input");

  // Invalid input: out of range
  tariff.setHours([-1, 24]);
  assertEqual(JSON.stringify(tariff.hours), JSON.stringify([0, 12, 23]), "Tariff hours should not change on out-of-range input");
}

// Test matches method
function testMatches() {
  const tariff = new Tariff("Standard", 0.15);

  // Restrict criteria
  tariff.setMonths([1]);
  tariff.setWeekdays([1, 7]);
  tariff.setHours([0, 12, 23]);

  // Mock ZonedDateTime objects
  const mockZDT1 = { monthValue: () => 1, dayOfWeek: () => ({ value: () => 1 }), hour: () => 0 }; // Matches
  const mockZDT2 = { monthValue: () => 2, dayOfWeek: () => ({ value: () => 1 }), hour: () => 0 }; // Doesn't match month
  const mockZDT3 = { monthValue: () => 1, dayOfWeek: () => ({ value: () => 3 }), hour: () => 0 }; // Doesn't match weekday
  const mockZDT4 = { monthValue: () => 1, dayOfWeek: () => ({ value: () => 1 }), hour: () => 22 }; // Doesn't match hour

  // Assertions
  assertEqual(tariff.matches(mockZDT1), true, "Tariff should match for valid input");
  assertEqual(tariff.matches(mockZDT2), false, "Tariff should not match for invalid month");
  assertEqual(tariff.matches(mockZDT3), false, "Tariff should not match for invalid weekday");
  assertEqual(tariff.matches(mockZDT4), false, "Tariff should not match for invalid hour");
}

// Test empty criteria
function testEmptyCriteria() {
  const tariff = new Tariff("Standard", 0.15);

  // Set empty criteria
  tariff.setMonths([]);
  tariff.setWeekdays([]);
  tariff.setHours([]);

  // Mock ZonedDateTime
  const mockZDT = { monthValue: () => 1, dayOfWeek: () => ({ value: () => 1 }), hour: () => 0 };

  // Assertions
  assertEqual(tariff.matches(mockZDT), false, "Tariff should not match when criteria are empty");
}


// Export the test functions
module.exports = {
  testTariffConstructor,
  testSetMonths,
  testSetWeekdays,
  testSetHours,
  testMatches,
  testEmptyCriteria
}
