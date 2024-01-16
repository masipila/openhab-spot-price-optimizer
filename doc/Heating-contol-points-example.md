# Usage example: Optimizing heating of the house
This documenation page gives an example how to use the `PeakPeriodBlocker` class of the `openhab-spot-price-optimizer` module to optimize the heating of a house.

The picture below illustrates how the heating of a house is optimized so that the morning and evening spot price peaks are avoided. In order to optimize the heating of a house, you need to first know how much of heating is needed on a given temperature. However, optimizing the heating has also other objectives than just finding the cheapest hours of the day, because the house may cool down too much if there are too many hours without heating.

The `PeakPeriodBlocker` class extends the basic capabilities provided by the `GenericOptimizer`. The idea of the PeakPeriodBlocker is to block the most expensive peaks and allow the rest.

# Pre-requisites
- The heating system can be controlled with an openHAB Item.
  - [See an example how to control a ground source heat pump via openHAB](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Nibe-example.md)
- Number of heating hours is determined and stored to an openHAB Item
  - TODO See an example how to calculate the number of heating hours based on weather forecast
- Fetching of spot prices is working
  - [See an example of how to fetch spot prices from Entso-E API](./Entso-E-example.md)
 
# Create two new Items

## Create an Item 'HeatingHours'
- In order to optimize the heating, our optimizing script needs to know how many hours the house needs to be heated.
- We don't want to hard code this number to our script, so let's create an Item `HeatingHours` which we can easily update with an user interface widget or automatically based on a weather forecast.
- TOOD: Link to weather forecast page
- [See example of a Control parameters page](./Control-parameters-UI-example.md)
  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fc0e1cdc-dc44-4dc5-a0b4-55c07342fd65)

## Create an item 'HeatPumpCompressorControl'
- The script below will find optimal time when the heating should be on and write `HeatPumpCompressorControl` _control points_ to the Influx database.
- The type of this Item must be Number.
- [See an example of control point visualization chart that renders control points with spot prices](./Control-point-visualization.md)

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/e178a888-bd5c-42f2-845c-db5503ec87ee)

# Create a Rule 'HeatPumpCompressorControlOptimizer' to find an optimal schedule
- This rule will create the _control points_ for each hour of the day
- Control point value 1 means the heating will be ON during that hour and value 0 means that heating will be OFF during that hour.
- This Rule will be triggered whenever the Item `HeatingHours` changes. We will also invoke this Rule right after the spot prices have been fetched.

## Inline script action for the rule
- The following rule first reads the SpotPrice values from midnight to midnight
- It then reads how many hours the heating needs to be ON from the `HeatingHours` item and calculates how many hours the heating can be OFF.
  - If for example 16 heating hours will be needed, then 8 hours can be blocked.
  - The number of blocked hours (8 in this example) is divided into two periods, 4 and 4 hours in this example.
- The algorithm searches the most expensive consecutive peak period (4 hours in this example) and blocks them with a control value 0.
  - The hours just before and after this peak period will be allowed with a control value 1. This guarantees that the two blocked periods will not be right after each other.
- The algorithm then searches the most expensive consecutive peak period (4 hours in this example) from those hours that do not yet have a block nor allow control point and blocks it.
- After this, all remaining hours are allowed.
- Finally, the control points will be saved to InfluxDB as `HeatPumpCompressorControl`.

The picture below illustrates the steps of the optimization algorithm.

KUVA

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Influx = require('openhab-spot-price-optimizer/influx.js');
PeakPeriodOptimizer = require('openhab-spot-price-optimizer/peak-period-optimizer.js');

// Create objects.
dh = new DateHelper.DateHelper();
influx = new Influx.Influx();
optimizer = new PeakPeriodOptimizer.PeakPeriodOptimizer();

// Read spot prices from InfluxDB and pass them for the optimizer.
start = dh.getMidnight('start');
stop = dh.getMidnight('stop');
prices = influx.getPoints('SpotPrice', start, stop);
optimizer.setPrices(prices);

// Read desired amount of heating hours from the HeatingHours item.
item = items.getItem("HeatingHours");
heatingHours = Math.round(item.state);

// Optimize the heating hours avoiding the peaks and write them to the database.
optimizer.blockPeaksAndAllowRest(heatingHours);
points = optimizer.getControlPoints();
influx.writePoints('nibe_control', points);
```

## Invoke this Rule also after the spot prices have been fetched
- The rule was defined to be run every time after the item `HeatingHours` changes. But what if this value is kept unchanged day after a day?
- The solution is to modify the previously created `FetchSpotPrices` Rule so that we execute the `HeatPumpCompressorControlOptimizer` Rule as an additional action immeidately after the spot prices have been fetched.
- Go to edit the previously created `FetchSpotPrices` Rule and add the action as illustrated in the picture below.

![image](fetch-spot-price-execute-boiler-optimization.png)

# Create a Rule 'HeatPumpCompressorHourly' to toggle the compressor ON and OFF
- This rule will run every full hour and turn the compressor ON or OFF based on the control point of that hour
- If the compressor is currently OFF and the control point for the new hour is 1, the compressor will be turned ON and vice versa.

## Inline script action for the rule
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
dh = new DateHelper.DateHelper();
influx = new Influx.Influx();

// Read the control value for the current hour from the database.
start = dh.getCurrentHour();
control = influx.getCurrentControl('HeatPumpCompressorControl', start);

// HeatPumpCompressor: Send the commands if state change is needed.
item = items.getItem("HeatPumpCompressor");
if (item.state == "ON" && control == 0) {
  console.log("HeatPumpCompressor: Send OFF")
  item.sendCommand('OFF'); 
}
else if (item.state == "OFF" && control == 1) {
  console.log("HeatPumpCompressor: Send ON")
  item.sendCommand('ON');
}
else {
  console.log("HeatPumpCompressor: No state change needed")
}
```
