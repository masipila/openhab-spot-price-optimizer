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

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/eeadee1e-2db8-460c-bd56-bb0117b9da3e)

## Inline script action for the rule
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');
HeatingCalculator = require('openhab-spot-price-optimizer/heating-calculator.js');

// Create objects.
influx = new Influx.Influx();
heatingCalculator = new HeatingCalculator.HeatingCalculator();

//If the script is called after 14.00, read tomorrow's forecast from the database. Otherwise for today.
start = time.toZDT('00:00');
if (time.toZDT().isBetweenTimes('14:00', '23:59')) {
  start = start.plusDays(1);    
}
stop = start.plusDays(1);
forecast = influx.getPoints('FMIForecastTemperature', start, stop);
heatingCalculator.setForecast(forecast);

// Calculate average temperature.
averageTemperature = heatingCalculator.calculateAverageTemperature();

// Calculate the number of required heating hours using a linear curve.
// Adjust the two points to be suitable for your house.
curve = [
  {"temperature": -38, "hours": 24},
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
# Notes
It's perfectly fine if you wish to use some other Binding to fetch the weather forecast from a provider of your choice. The script above can easily be modified so that you read the average temperature from the Item provided by the Binding you use. As long as you can set the averageTemperature variable to contain the value from the correct Item, you can calculate the number of needed heating hours with this line in the script above.

```Javascript
hours = heatingCalculator.calculateHeatingHoursLinear(curve, averageTemperature);
```

Every house is different and requires different amount of heating on different temperatures. The `HeatingCalculator` class uses a linear curve to calculate the number of heating hours on different temperatures. You can experiment how the curve looks like with different parameters for example at https://www.omnicalculator.com/math/line-equation-from-two-points (use temperature as the X parameter and hours as the Y parameter).

The example script above reads the `FMIForecastTemperature` from the database and calculates the average temperature from that. If your house is on a windy place you might want to use the [wind chill compensated temperature](https://en.wikipedia.org/wiki/Wind_chill#North_American_and_United_Kingdom_wind_chill_index) ("feels like" temperature) instead of the temperature. [FMI example](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/FMI-example.md) has an example how to calculate and save `FMIForecastWindChillTemp`.

The end of the script above includes a temperature drop compensation which adds more heating hours if there is a big drop in the temperature during the day. If there is a temperature drop of N degres, N/2 heating hours will be returned as a compensation, rounded up. If you don't want to include this compensation in your calculations, remove the corresponding line from the inline script.
