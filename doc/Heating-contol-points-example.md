# PeakPeriodOptimizer usage example: Optimizing heating of the house
This documenation page gives an example how to use the `PeakPeriodOptimizer` class of the `openhab-spot-price-optimizer` to optimize the heating of a house.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/4459aa1e-9524-4b95-83c5-a11007781d64)

The picture above illustrates how the heating of a house is optimized so that the morning and evening spot price peaks are avoided. In order to optimize the heating of a house, we first tell the optimizing algorithm how many heating hours are needed. The yellow bars in the picture above represent the 14 hours when heating is allowed to be ON.

Optimizing the heating has also other objectives than just finding the cheapest hours of the day because the house may cool down too much if there are too many hours without heating. The idea of the `PeakPeriodOptimizer` algorithm is to block the most expensive price peaks and allow the rest. In the example above:
- 14 hours of heating is needed
- That means that 24 - 14 = 10 hours can be blocked
- The 10 hours are divided into two periods, 5 hours each.
- The algorithm searches two most expensive 5 hours price peaks and blocks them.

The minimum number of hours between the block periods is configurable with an Item `MidHeatingHours`. The number of periods to block is configurable with an Item `HeatingPeaks`.

# Pre-requisites
- The heating system can be controlled with an openHAB Item.
  - [See an example how to control a ground source heat pump via openHAB](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Nibe-example.md)
- Fetching of spot prices is working
  - [See an example of how to fetch spot prices from Entso-E API](./Entso-E-example.md)
 
# Create four new Items

## Create an Item 'HeatingHours'
- In order to optimize the heating, our optimizing script needs to know how many hours the house needs to be heated. In the example above, there are 14 heating hours.
- We don't want to hard code this number to our script, so let's create an Item `HeatingHours` which can easily be updated with an user interface widget or automatically with a separate Rule.
- [See a separate documentation page which shows how this Item can be updated based on the forecasted temperature.](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Calculate-heating-need.md) 
- The type of this Item must be Number.
- [See an example of a Control parameters page which shows how this value can be easily changed](./UI-control-parameters.md)
  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/84e5801f-b7df-492b-855e-37d18ef2e41b)

## Create an Item 'MidHeatingHours'
- In the example above, there are three heating hours between the two 5 hour blocks
- The algorithm can _guarantee_ a certain amount of heating hours between the two blocked price peaks. This minimum amount of hours between the two price peaks is called `MidHeatingHours`. We don't want to hard code this number to our script so let's also create an Item `MidHeatingHours` which can easily be updated with an user interface widget or automatically with a separate Rule.
- The type of this Item must be Number.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/c5b64786-284d-4f17-a741-4f141ff5b1e2)

## Create an Item 'HeatingPeaks'
- In the example above, two most expensive peaks are blocked.
- The number of expensive peaks the optimizing algorithm will search and block is configurable.
- Create a new Item `HeatingPeaks` which can easily be updated with an user interface widget or automatically with a separate Rule.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/084b822b-747e-4f4d-9905-8f77a6b8f666)

## Create an item 'HeatPumpCompressorControl'
- The green bars in the example above are the _control points_ for when the heating should be on. These control points are calculated by the script below and stored to the Influx database as `HeatPumpCompressorControl`. So let's create an Item with this name so that we can display this in the Chart.
- The type of this Item must be Number.
- [See an example of control point visualization chart that renders control points with spot prices](./UI-chart-example.md)

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/e178a888-bd5c-42f2-845c-db5503ec87ee)

# Create a Rule 'HeatPumpCompressorOptimizer' to calculate the control points
- This rule will create the _control points_ for each hour of the day
- Control point value 1 means the heating will be ON during that hour and value 0 means that heating will be OFF during that hour.
- This Rule will be triggered whenever the Items `HeatingHours`, `MidHeatingHours` or `HeatingPeaks` change.
- We will also modify the `FetchSpotPrices` rule so that this rule will be invoked right after the spot prices have been fetched, see below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/0827d45d-cbfc-4045-8eac-6c0e61c612e6)

## Inline script action for the rule
- The following rule first reads the SpotPrice values from midnight to midnight
- It then reads how many hours the heating needs to be ON from the `HeatingHours` and how many hours must be guaranteed from `MidHeatingHours`.
- It then calculates the control points for each hour with the concept described above.
- Finally, the control points will be saved to InfluxDB as `HeatPumpCompressorControl`.

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');
PeakPeriodOptimizer = require('openhab-spot-price-optimizer/peak-period-optimizer.js');

// Create objects.
influx = new Influx.Influx();
optimizer = new PeakPeriodOptimizer.PeakPeriodOptimizer('PT15M');

//If the script is called after 14.00, optimize tomorrow. Otherwise optimize today.
start = time.toZDT('00:00');
if (time.toZDT().isBetweenTimes('14:00', '23:59')) {
  start = start.plusDays(1);    
}
stop = start.plusDays(1);

// Read spot prices from InfluxDB and pass them for the optimizer.
prices = influx.getPoints('SpotPrice', start, stop);
optimizer.setPrices(prices);

// Read the control points of the previous day and pass them for the optimizer.
previousDayStart = start.minusDays(1);
previousDayStop = start;
previousControlPoints = influx.getPoints('HeatPumpCompressorControl', previousDayStart, previousDayStop);
optimizer.setPreviousControlPoints(previousControlPoints);

// Read desired amount of heating hours from the HeatingHours item.
heatingItem = items.getItem("HeatingHours");
heatingHours = heatingItem.state;

// Read the minimum amount of hours between the blocked periods from the MidHeatingHours item.
midItem = items.getItem("MidHeatingHours");
midHeatingHours = midItem.state;

// Define how many peaks you want to block. If you need to frequently change this, create an Item for this.
peaksItem = items.getItem("HeatingPeaks");
peaks = Math.round(peaksItem.state);

// Pass the optimization parameters to the optimizer.
optimizer.setOptimizationParameters(heatingHours, midHeatingHours, peaks);

// Optimize the heating hours: Block the peaks and allow remaining. Save results to the database.
optimizer.blockPeaks();
optimizer.allowAllRemaining();
points = optimizer.getControlPoints();
influx.writePoints('HeatPumpCompressorControl', points);
```

## Invoke this Rule also after the spot prices have been fetched
- The rule was defined to be run every time after the item `HeatingHours`, `MidHeatingHours` or `HeatingPeaks` changes. But what if these values remaing unchanged day after a day?
- The solution is to modify the previously created `FetchSpotPrices` Rule so that we execute the `HeatPumpCompressorOptimizer` Rule as an additional action immediately after the spot prices have been fetched.
- Go to edit the previously created `FetchSpotPrices` Rule and add the action as illustrated in the picture below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/0673a039-5f15-4eac-9864-fa7904ea5b40)

# Create a Rule 'HeatPumpCompressorController' to toggle the compressor ON and OFF
- This rule will run every 15 minutes and turn the compressor ON or OFF based on the current control point
- If the compressor is currently OFF and the current control point is 1, the compressor will be turned ON and vice versa.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/10146a9b-20ae-497d-a623-19f42064b170)

## Inline script action for the rule
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
influx = new Influx.Influx();

// Read the control value for the current hour from the database.
control = influx.getCurrentControl('HeatPumpCompressorControl');

// HeatPumpCompressor: Send the commands if state change is needed.
HeatPumpCompressor = items.getItem("HeatPumpCompressor");
if (HeatPumpCompressor.state == "ON" && control == 0) {
  console.log("HeatPumpCompressor: Send OFF")
  HeatPumpCompressor.sendCommand('OFF'); 
}
else if (HeatPumpCompressor.state == "OFF" && control == 1) {
  console.log("HeatPumpCompressor: Send ON")
  HeatPumpCompressor.sendCommand('ON');
}
else {
  console.log("HeatPumpCompressor: No state change needed")
}
```

# Additional considerations about the Peak Period Optimizer
The first thing the optimization algorighm will do is to check if the previous day ended with sufficient amount of heating hours. This is to handle situations where the previous day ends with a long period of blocked hours, the new day would be starting with a long period of blocked hours and as a result, the house would be cooling too much. The algorithm ensures that there is at least `MidHeatingHours` hours allowed when the day changes.

After this, the algorithm checks if the optimization is mathematically possible with the given optimization parameters. If the `HeatingHours` would be 8, it would mean 16 hours would be blocked. If `MidHeatingHours` would be 4, the two block periods require 8 + 4 + 8 = 20 hours. There are still 4 ON hours required and this is just enough, but with slightly different otpimization parameters the ON and OFF hours might not fit to the available hours. If that would be the case, the optimization algorithm will abort the optimization (and write an error to logs).

It is worth noting that the Peak Period Optimizer performs well when the number of heating hours is relativerly big. If you only need to find, say 5 hours like in the picture below, you might get results where the cheapest hours are not allowed. Mathematically the results in the example below are correct, the algorhitm has blocked two most expensive periods (9 and 10 hours). Conclusion: If the number of required ON hours is relatively small and you don't need to force the `midHeatingHours` between the OFF periods, [you might be better of using the algorithms provided by the Generic Optimizer.](./Boiler-control-points-example.md)

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/ccd72053-eb6f-4182-90a9-b1e7f024cc1a)

