// Counters for tracking test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Compares two floating-point numbers and checks if they are equal within a given tolerance.
 * This is useful for handling floating-point precision issues in JavaScript.
 *
 * @param {number} actual - The actual value returned by the function being tested.
 * @param {number} expected - The expected value for the test.
 * @param {number} tolerance - The acceptable difference between the actual and expected values (e.g., 0.0001).
 * @param {string} message - A message describing the test case.
 */
function assertAlmostEqual(actual, expected, tolerance, message) {
  totalTests++;
  if (Math.abs(actual - expected) <= tolerance) {
    passedTests++;
    console.log(`***PASS***: ${message}`);
  }
  else {
    failedTests++;
    console.error(`***FAIL***: ${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

/**
 * Compares two values and checks if they are exactly equal.
 * This is useful for handling tests that involve integer or non-floating-point comparisons.
 *
 * @param {any} actual - The actual value returned by the function being tested.
 * @param {any} expected - The expected value for the test.
 * @param {string} message - A message describing the test case.
 */
function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`***PASS***: ${message}`);
  }
  else {
    failedTests++;
    console.error(`***FAIL***: ${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

/**
 * Asserts that two js-joda Duration or ZonedDateTime objects are equal.
 *
 * @param {Duration|ZonedDateTime} actual - The actual duration returned by the function being tested.
 * @param {Duration|ZonedDateTime} expected - The expected duration for the test.
 * @param {string} message - A message describing the test case.
 */
function assertEqualTime(actual, expected, message) {
  totalTests++;
  if (actual.equals(expected)) {
    passedTests++;
    console.log(`***PASS***: ${message}`);
  }
  else {
    failedTests++;
    console.error(`***FAIL***: ${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

/**
 * Asserts that the given value is null.
 * This is useful for testing whether a function returns null when expected.
 *
 * @param {any} actual - The actual value returned by the function being tested.
 * @param {string} message - A message describing the test case.
 */
function assertNull(actual, message) {
  totalTests++;
  if (actual === null) {
    passedTests++;
    console.log(`***PASS***: ${message}`);
  }
  else {
    failedTests++;
    console.error(`***FAIL***: ${message} - Expected: null, Got: ${actual}`);
  }
}

/**
 * Asserts that a given value is a boolean and matches the expected value (true or false).
 *
 * @param {boolean} actual - The actual boolean value returned by the function being tested.
 * @param {boolean} expected - The expected boolean value (true/false).
 * @param {string} message - A message describing the test case.
 */
function assertBoolean(actual, expected, message) {
  totalTests++;
  if (typeof actual === 'boolean' && actual === expected) {
    console.log(`***PASS***: ${message}`);
    passedTests++;
  } else {
    console.error(`***FAIL***: ${message} - Expected: ${expected}, Got: ${actual}`);
    failedTests++;
  }
}

/**
 * Displays the test summary after all tests are executed.
 */
function displayTestSummary() {
  console.log("TEST SUMMARY");
  console.log("------------");
  console.log(`Total tests run: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
}


// Export the utility functions for use in test files
module.exports = {
  assertAlmostEqual,
  assertEqual,
  assertEqualTime,
  assertNull,
  assertBoolean,
  displayTestSummary
};
