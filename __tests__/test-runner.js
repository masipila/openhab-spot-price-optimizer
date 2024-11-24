// List of test files
const testFiles = [
  './heating-calculator.test.js',
  './heating-period.test.js',
  './heating-gap.test.js',
  './generic-optimizer.test.js',
  './heating-period-optimizer.test.js'
];

const { displayTestSummary } = require('./test-utils');

// Function to run all tests
function run() {
  console.log(`---------------------`);
  console.log(`TEST EXECUTIONS START`);
  console.log(`---------------------`);
  for (const testFile of testFiles) {
    const tests = require(testFile);
    console.log('------------------------------');
    console.log(`Running tests from ${testFile}`);
    console.log('------------------------------');
    // Iterate over all exported functions and execute them
    for (const testName in tests) {
      if (typeof tests[testName] === 'function') {
        console.log(`RUNNING TEST: ${testName}`);
        tests[testName]();  // Run each test function
      }
    }
  }
  displayTestSummary();
}

// Export the run function
module.exports = {
  run
};
