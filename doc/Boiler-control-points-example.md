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
- [See an example of a Control parameters page which shows how this value can be easily changed](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/UI-control-parameters.md)

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
Influx = require('openhab-spot-price-optimizer/influx.js');
GenericOptimizer = require('openhab-spot-price-optimizer/generic-optimizer.js');

// Create objects.
influx = new Influx.Influx();
optimizer = new GenericOptimizer.GenericOptimizer('PT15M');

//If the script is called after 14.00, optimize tomorrow. Otherwise optimize today.
start = time.toZDT('00:00');
if (time.toZDT().isBetweenTimes('14:00', '23:59')) {
  start = start.plusDays(1);    
}
stop = start.plusDays(1);

// Read spot prices from InfluxDB and pass them for the optimizer.
prices = influx.getPoints('SpotPrice', start, stop);
optimizer.setPrices(prices);

// Read how many hours are needed from the BoilerHours item.
item = items.getItem("BoilerHours");
hours = Math.round(item.state);

// Optimize the control points and save them to the database.
optimizer.allowPeriod(hours);
optimizer.blockAllRemaining();
points = optimizer.getControlPoints();
influx.writePoints('BoilerControl', points);
```

The `GenericOptimizer` optimizing class provides has the following functions:
- `allowIndividualHours(N)`: Finds N cheapest hours and allows them.
- `allowPeriod(N)`: Finds the cheapest consequtive N hour period and allows it.
- `blockIndividualHours(N)`: Finds N most expensive hours and blocks them.
- `blockPeriod(N)`: Finds the most expensive consequtive N hour period and blocks it.
- `allowAllRemaining()`: Allows all remaining hours from the spot prices which have not been allowed or blocked yet.
- `blockAllRemaining()`: Blocks all remaining hours from the spot prices which have not been allowed or blocked yet.
- Note how the script above combines `allowIndividualHours` and `blockAllRemaining`. All hours must have a control value so the remaining hours need to be blocked after the cheapest ones have been allowed.

## Invoke this Rule also after the spot prices have been fetched
- The rule was defined to be run every time after the item `BoilerHours` changes. But what if this value is kept unchanged day after a day?
- The solution is to modify the previously created `FetchSpotPrices` Rule so that we execute the `BoilerOptimizer` rule as an additional action immeidately after the spot prices have been fetched.
- Go to edit the previously created `FetchSpotPrices` Rule and add the additional action as illustrated in the picture below.

![fetch-spot-price-execute-boiler-optimization](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/3a296b16-2b64-40f6-9d49-edc1db59be41)

# Create a Rule 'BoilerController' to toggle the boiler ON and OFF
- This rule will run every 15 minutes and turn the boiler ON or OFF based on the current control point
- If the boiler is currently OFF and the current control point is 1, the boiler will be turned ON and vice versa.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/662c6716-6189-451c-971e-2fa081a87136)

## Inline script action for the rule
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
influx = new Influx.Influx();

// Read the control value for the current hour from the database.
control = influx.getCurrentControl('BoilerControl');

// BoilerPower: Send the commands if state change is needed.
BoilerPower = items.getItem("BoilerPower");
if (BoilerPower.state == "ON" && control == 0) {
  console.log("BoilerPower: Send OFF")
  BoilerPower.sendCommand('OFF');
}
else if (BoilerPower.state == "OFF" && control == 1) {
  console.log("BoilerPower: Send OFF")
  BoilerPower.sendCommand('ON');
}
else {
  console.log("BoilerPower: No state change needed")  
}
```

# Script for deleting control points
When developing your solution and experimenting, you might want to delete points from your Influx database. The script below can be used for that.

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
influx = new Influx.Influx();

// Delete BoilerControl points for today.
start = time.toZDT('00:00');
stop = start.plusDays(1);
influx.deletePoints('BoilerControl', start, stop);
```
