# PeakPeriodBlocker usage example: Optimizing heating of the house
This documenation page gives an example how to use the `PeakPeriodBlocker` class of the `openhab-spot-price-optimizer` to optimize the heating of a house.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/3538f84b-c09b-432d-a22a-d2208a882c68)

The picture above illustrates how the heating of a house is optimized so that the morning and evening spot price peaks are avoided. In order to optimize the heating of a house, we first tell the optimizing algorithm how many heating hours are needed. The 14 green bars in the picture above represent the hours when heating is allowed to be ON.

Optimizing the heating has also other objectives than just finding the cheapest hours of the day because the house may cool down too much if there are too many hours without heating. The idea of the `PeakPeriodBlocker` optimizing algorithm is to block the most expensive price peaks and allow the rest. In the example above:
- 14 hours of heating is needed
- That means that 24 - 14 = 10 hours can be blocked
- The 10 hours is divided into two periods, 5 hours each.
- The algorithm searches two most expensive 5 hours price peaks and blocks them.

The minimum number of hours between the two block periods is configurable.

# Pre-requisites
- The heating system can be controlled with an openHAB Item.
  - [See an example how to control a ground source heat pump via openHAB](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Nibe-example.md)
- Fetching of spot prices is working
  - [See an example of how to fetch spot prices from Entso-E API](./Entso-E-example.md)
 
# Create three new Items

## Create an Item 'HeatingHours'
- In order to optimize the heating, our optimizing script needs to know how many hours the house needs to be heated. In the example above, there are 14 heating hours.
- We don't want to hard code this number to our script, so let's create an Item `HeatingHours` which can easily be updated with an user interface widget or automatically based on a weather forecast.
- The type of this Item must be Number.
- TOOD: Link to weather forecast page
- [See example of a Control parameters page](./Control-parameters-UI-example.md)
  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/84e5801f-b7df-492b-855e-37d18ef2e41b)

## Create an Item 'MidHeatingHours'
- In the example above, there are three heating hours between the two 5 hour blocks
- The algorithm can _guarantee_ a certain amount of heating hours between the two blocked price peaks. This minimum amount of hours between the two price peaks is called `MidHeatingHours`. We don't want to hard code this number to our script so let's also create an Item `MidHeatingHours` which can easily be updated with an user interface widget or automatically based on weather forecast.
- The type of this Item must be Number.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/c5b64786-284d-4f17-a741-4f141ff5b1e2)

## Create an item 'HeatPumpCompressorControl'
- The green bars in the example above are the _control points_ for when the heating should be on. These control points are calculated by the script below and stored to the Influx database as `HeatPumpCompressorControl`. So let's create an Item with this name.
- The type of this Item must be Number.
- [See an example of control point visualization chart that renders control points with spot prices](./Control-point-visualization.md)

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/e178a888-bd5c-42f2-845c-db5503ec87ee)

# Create a Rule 'HeatPumpCompressorOptimizer' to calculate the control points
- This rule will create the _control points_ for each hour of the day
- Control point value 1 means the heating will be ON during that hour and value 0 means that heating will be OFF during that hour.
- This Rule will be triggered whenever the Items `HeatingHours` or `MidHeatingHours` change.
- We will also modify the `FetchSpotPrices` rule so that this rule will be invoked right after the spot prices have been fetched, see below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/c5b7efba-9c78-4376-bd1e-2abda65173d1)

## Inline script action for the rule
- The following rule first reads the SpotPrice values from midnight to midnight
- It then reads how many hours the heating needs to be ON from the `HeatingHours` and how many hours must be guaranteed from `MidHeatingHours`.
- It then calculates the control points for each hour with the concept described above.
- Finally, the control points will be saved to InfluxDB as `HeatPumpCompressorControl`.

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
heatingItem = items.getItem("HeatingHours");
heatingHours = Math.round(heatingItem.state);

// Read the minimum amount of hours between the blocked periods from the MidHeatingHours item.
midItem = items.getItem("MidHeatingHours");
midHeatingHours = Math.round(midItem.state);

// Optimize the heating hours avoiding the peaks and write them to the database.
optimizer.blockPeaks(heatingHours, midHeatingHours);
optimizer.allowRemainingHours();
points = optimizer.getControlPoints();
influx.writePoints('nibe_control', points);
```

## Invoke this Rule also after the spot prices have been fetched
- The rule was defined to be run every time after the item `HeatingHours` changes. But what if this value is kept unchanged day after a day?
- The solution is to modify the previously created `FetchSpotPrices` Rule so that we execute the `HeatPumpCompressorOptimizer` Rule as an additional action immediately after the spot prices have been fetched.
- Go to edit the previously created `FetchSpotPrices` Rule and add the action as illustrated in the picture below.

- TODO

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
