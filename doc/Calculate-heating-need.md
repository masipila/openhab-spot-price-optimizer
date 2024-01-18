# HeatingCalculator usage example: Calculating the heating need based on a weather forecast
[In a separate documentation page](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Heating-contol-points-example.md) we created a solution that optimizes heating of a house so that morning and evening peaks are avoided. That solution reads the number of heating hours from an Item called `HeatingHours`.

This documentation page gives an example how the `HeatingHours` Item can be automatically updated based on tomorrow's weather forecast so that you don't need to change the number of heating hours manually every day.

# Pre-requisites
- You have already created an Item called `HeatingHours` as instructed on the other documentation page.
  - [PeakPeriodOptimizer usage example: Optimizing heating of the house](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Heating-contol-points-example.md)
- [Fetching of weather forecast from FMI API is working](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/FMI-example.md)
 
# Create a Rule 'CalculateHeatingHours'
- This rule will read the weather forecast and calculate how many hours of heating will be needed tomorrow
- Schedule this Rule to be triggered in the afternoon
- The rule will update the `HeatingHours` item.

## Inline script action for the rule
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Influx = require('openhab-spot-price-optimizer/influx.js');
HeatingCalculator = require('openhab-spot-price-optimizer/heating-calculator.js');

// Create objects.
dh = new DateHelper.DateHelper();
influx = new Influx.Influx();
heatingCalculator = new HeatingCalculator.HeatingCalculator();

// Read weather forecast from the database and calculate average temperature.
start = dh.getMidnight('start');
stop = dh.getMidnight('stop');
forecast = influx.getPoints('FMIForecastTemperature', start, stop);
heatingCalculator.setForecast(forecast);
averageTemperature = heatingCalculator.calculateAverageTemperature();

// Calculate the number of required heating hours using a linear curve.
// Adjust the two points to be suitable for your house.
curve = [
  {"temperature": -40, "hours": 24},
  {"temperature": 18, "hours": 2}
];
hours = heatingCalculator.calculateHeatingHoursLinear(curve, averageTemperature);

// Failsafe: Only update the HeatingHours item if weather forecast was available.
if (hours != null) {
  // Add more hours if there is a significant temperature drop during the day.
  hours += heatingCalculator.calculateTemperatureDropCompensation();

  item = items.getItem("HeatingHours");
  item.sendCommand(hours);
}
```
