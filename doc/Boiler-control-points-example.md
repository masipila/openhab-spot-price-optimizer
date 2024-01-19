# GenericOptimizer usage example: Optimizing a boiler to heat domestic hot water on the cheapest hours
This documenation page gives an example how to use the `GenericOptimizer` class of the `openhab-spot-price-optimizer` module to find cheapest hours of the day to heat the domestic hot water. As the name suggests, the optimization algorithms are generic and can be used for many different use cases. 

**WARNING:** Do not try to optimize the heating of domestic hot water too agressively.
- The boiler should always have enough hours to reach the thermostate max temperature.
- Legionella bacteria reproduces in temperatures between 20 - 45 ° celcius.
- In Finland, there is a law that the water temperature in the boiler must always be at least 55 ° celcius to ensure that legionella bacteria will die.

# Pre-requisites
- The boiler can be controlled with an openHAB Item.
  - [See example how to control boiler via openHAB](./Boiler-example.md)
- Fetching of spot prices is working
  - [See example of how to fetch spot prices from Entso-E API](./Entso-E-example.md)
 
# Create two new Items

## Create an Item 'BoilerHours'
- In order to optimize the heating of domestic hot water, our optimizing script needs to know how many hours the boiler needs to be ON to reach its thermostate max temperature.
- We don't want to hard code this number to our script, so let's create an Item `BoilerHours` which we can easily update with an user interface widget.
- The type of this Item must be Number
- [See an example of a Control parameters page which shows how this value can be easily changed](./Control-parameters-UI-example.md)
  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fc0e1cdc-dc44-4dc5-a0b4-55c07342fd65)

## Create an item 'BoilerControl'
- The rule below optimizes when the boiler should heat water and writes `BoilerControl` _control points_ to the Influx database.
- The type of this Item must be Number
- [See an example of control point visualization chart](./Control-point-visualization.md)

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/7cecdf15-0978-456e-bf7d-d274fc271f30)

# Create a Rule 'BoilerOptimizer' to calculate the control points
- This rule will create the _control points_ for each hour of the day
- Control point value 1 means the power supply will be ON during that hour and value 0 means that power supply will be OFF during that hour.
- This Rule will be triggered whenever the Item `BoilerHours` changes.
- We will also modify the `FetchSpotPrices` rule so that this Rule will be invoked right after the spot prices have been fetched, see below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/54faa316-2981-4112-b7bf-9f1a3a91e4d5)

## Inline script action for the rule
- The following rule first reads the SpotPrice values from midnight to midnight
- It then reads how many hours the boiler needs to be ON from the `BoilerHours` item
- It then finds the cheapest consecutive period for this many hours.
- All remaining hours will be blocked.
- Finally, the control points will be saved to InfluxDB as `BoilerControl`.

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Influx = require('openhab-spot-price-optimizer/influx.js');
GenericOptimizer = require('openhab-spot-price-optimizer/generic-optimizer.js');

// Create objects.
dh = new DateHelper.DateHelper();
influx = new Influx.Influx();
optimizer = new GenericOptimizer.GenericOptimizer();

// Read spot prices from InfluxDB and pass them for the optimizer.
start = dh.getMidnight('start');
stop = dh.getMidnight('stop');
prices = influx.getPoints('SpotPrice', start, stop);
optimizer.setPrices(prices);

// Read how many hours are needed from the BoilerHours item.
item = items.getItem("BoilerHours");
hours = Math.round(item.state);

// Optimize the control points and save them to the database.
optimizer.allowPeriod(hours);
optimizer.blockRemainingHours();
points = optimizer.getControlPoints();
influx.writePoints('BoilerControl', points);
```

The `GenericOptimizer` optimizing class provides has the following functions:
- `allowHours(N)`: Finds N cheapest hours from the given spot prices and allows them.
- `allowPeriod(N)`: Finds the cheapest consequtive N hour period from the given spot prices and allows them.
- `blocHours(N)`: Finds N most expensive hours from the given spot prices and blocks them.
- `blockPeriod(N)`: Finds the most expensive consequtive N hour period from the given spot prices and blocks them.
- `allowRemainingHours()`: Allows all remaining hours from the spot prices which have not been allowed or blocked yet.
- `blockRemainingHours()`: Blocks all remaining hours from the spot prices which have not been allowed or blocked yet.
- Note how the script above combines `allowPeriod` and `blockRemainingHours`. All hours must have a control value.

## Invoke this Rule also after the spot prices have been fetched
- The rule was defined to be run every time after the item `BoilerHours` changes. But what if this value is kept unchanged day after a day?
- The solution is to modify the previously created `FetchSpotPrices` Rule so that we execute the `BoilerOptimizer` rule as an additional action immeidately after the spot prices have been fetched.
- Go to edit the previously created `FetchSpotPrices` Rule and add the additional action as illustrated in the picture below.

![fetch-spot-price-execute-boiler-optimization](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/3a296b16-2b64-40f6-9d49-edc1db59be41)

# Create a Rule 'BoilerHourly' to toggle the boiler ON and OFF
- This rule will run every full hour and turn the boiler ON or OFF based on the control point of that hour
- If the boiler is currently OFF and the control point for the new hour is 1, the boiler will be turned ON and vice versa.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/bfbe2dc8-4d6f-4d34-b4de-a4866453c645)

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
control = influx.getCurrentControl('BoilerControl', start);

// BoilerPower: Send the commands if state change is needed.
item = items.getItem("BoilerPower");
if (item.state == "ON" && control == 0) {
  console.log("Boiler: Send OFF")
  item.sendCommand('OFF');
}
else if (item.state == "OFF" && control == 1) {
  console.log("Boiler: Send OFF")
  item.sendCommand('ON');
}
else {
  console.log("Boiler: No state change needed")  
}
```
