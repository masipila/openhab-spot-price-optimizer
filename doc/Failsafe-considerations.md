# Failsafe considerations
When controlling real-world devices, it is more than healthy to consider what can go wrong and what happens when (not if) that happens.

The failsafe considerations depend obviously what you are using the openhab-spot-price-optimzer, but here are some considerations as food for thought.

I use the solution for three things:
- Optimizing the heating of our house
- Optimizing the heating of domestic hot water
- Optimizing the charging of an electric vehicle

Especially the heating of the house is a critical application. Winters in Southern Finland can be very cold and the temperature can drop below -20 °C. The last thing that we want is that the house freezes.

# Hardware considerations
All my three devices are controlled with relays with Raspberry Pi. The relays controlling the ground source heat pump and boiler are connected so that when Raspberry is powering the relays (relay pulls), the heating is blocked. In other words, if Raspberry would be shut down and the relay does NOT pull, then heating is allowed normally.

An electrician installed bypass switches to our electrical cabinet. These switches either allow Raspberry to control the device or make the devices to behave as if Raspberry would not exist.

Our Raspberry Pi is connected to an UPS battery power supply so that it does not shut down in an uncontrolled way. You can use for example linux NUT tool to enable communication between the UPS and your Raspberry.

SD Cards will eventually wear out and get corrupted. If the power supply of the Raspberry Pi shuts down in an uncontrolled way and there happens to be a write operation in progress, the whole sector of the SD card will get corrupted (the probability for this is 100%, so it's not a theoretical risk). openHABian operating system image comes with very nice utilities pre-installed and one of them is SD card mirroring. My Raspberry has an USB-adapter with a secondary SD card inside it. If the primary SD card gets corrupted, I can simply swap the SD cards and life will continue.

I have a NAS server with two hard drives so that the server will continue to operate even though one of the hard drives would fail. I installed the InfluxDB to this NAS server so that the database is located on a more reliable device than the SD card of the Raspberry Pi.

# Software considerations

Control points is a fundamental concept of the `openhab-spot-price-optimizer` solution. There is an hourly Rule that checks the control value for the new hour and changes the state of the device. If the control point does not exist or cannot be read for whaterver reason the solution falls back to value `1` which means that the device will be turned ON. This way the worst thing that can happen with heating is that the house heats a bit too much but it does not freeze.

It amount of heating hours is calculated from tomorrow's weather forecast. If the forecast does not exist for whatever reason, the number of required heating hours remains unchanged (instead of dropping to zero).

## Cloning the control points for tomorrow if spot prices are not available
The control point optimizers assume that the spot prices for tomorrow are available. If they are not, control points can't obviously be optimized. 

The spot price data is read from Entso-E Transparency platform which can have planned or unplanned outages or your own internet connection might be unavailable when you try to fetch the prices. For this purpose, there is a failsafe mechanism which can copy the control points from the previous day if the spot prices for the next day are not available for whatever reason. With this approach the devices will be turned ON and OFF at the same time as the day before.

### Create a new Rule `CloneControlPoints` and schedule it to run for example at 23:00
The following inline script action:
- First checks if there is a SpotPrice available for tomorrow at 12:00
- If not, it reads the control points for today for `BoilerControl` and `HeatPumpCompressorControl`
- And clones them for tomorrow and saves them to the database
- This the devices will behave tomorrow like they did today and if the price profile is somewhat similar than today, the run times should be quite OK. 

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
Influx = require('openhab-spot-price-optimizer/influx.js');
ControlPointCloner = require('openhab-spot-price-optimizer/control-point-cloner.js')

// Create objects.
influx = new Influx.Influx();
cloner = new ControlPointCloner.ControlPointCloner();

// Check if spot price is available for tomorrow 12:00
start = time.toZDT('12:00').plusDays(1);
stop = start.plusHours(1);
prices = influx.getPoints('SpotPrice', start, stop);

// Clone the control points if spot prices are missing
if (prices.length < 1) {
  console.log("Spot prices missing for tomorrow!");
  start = time.toZDT('00:00');
  stop = start.plusDays(1);
  
  // BoilerControl: Read control points for today and clone for tomorrow.
  pointsToday = influx.getPoints('BoilerControl', start, stop);
  pointsTomorrow = cloner.getClonedControlPoints(pointsToday);
  influx.writePoints('BoilerControl', pointsTomorrow);
  
  // HeatPumpCompressorControl: Read control points for today and clone for tomorrow.
  pointsToday = influx.getPoints('HeatPumpCompressorControl', start, stop);
  pointsTomorrow = cloner.getClonedControlPoints(pointsToday);
  influx.writePoints('HeatPumpCompressorControl', pointsTomorrow);
}
```
