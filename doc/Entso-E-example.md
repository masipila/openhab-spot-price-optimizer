# Usage example: Fetch spot prices from Entso-E API
Note: This solution was originally built in 2022 when openHAB did not have a capability where Bindings can persist forecast time series data. This capability has been added to openHAB 4.1 and it might be that there will be an Entso-E Binding developed at some point. 

## Pre-requisites
- See a list of pre-requisites from the main README.md file and make sure you have followed them precisely.
- Most specifically, the InfluxDB connection parameters and Entso-E API key and bidding zone must be configured to `config.js` as documented on the main README file.
- The Rule script actions are written as ECMAScript 262 Edition 11. Note the version 11. Install the JSScripting addon if you are still using openHAB 3.x. Version 4.x ships this enabled out of the box. 

# Create an Item SpotPrice
First create an Item called `SpotPrice` so that you will be able to use the SpotPrice values in the openHAB charts.  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/60c176cf-c585-4df7-a963-9ad41ec2952c)

Optionally, you can create Items `DistributionPrice` and `TotalPrice` if you want to include the tariffs in your optimizations.

# Create a Rule FetchSpotPrices
- Create a new Rule called `FetchSpotPrices´ which will fetch the spot prices from Entso-E API and save them to your InfluxDB using the Influx HTTP API. In other words, the openHAB persistence layer is NOT used to access the database, the script will call Influx HTTP API directly.
- You can schedule the Rule to be run for example at 13.15 CET/CEST and 14.15 CET/CEST
- Copy-paste the code below as the Script Action (ECMAScript 262 Edition 11).
- The script will write the spot prices as `SpotPrice` time series to your InfluxDB
 
Entso-E publishes the spot prices for next day in the afternoon. date-helper.js module has logic that if the script is executed at 14:00 or later, it will fetch tomorrow’s prices. If the rule is executed before that, it will fetch current day's prices. The script can be executed multiple times, possible previous database points are overwritten.

Note: If you make changes to the javascript files (inluding config.js), you must re-save the Script Action (the code snippet below) to make sure openHAB re-reads the javascript files.

Run the Rule manually and check from your influxDB data explorer that you can see the spot prices for today / tomorrow (depending on the time of the day when you executed the script). If you run the rule in the afternoon or evening, the script will fetch tomorrow's spot prices. Remember to choose a date range in Influx data explorer which includes the day you just fetched the prices for.
- If you’re not able to see the `SpotPrice` measurement data in your influxDB Data Explorer, increase the openHAB log level to see the debug level logs.

## Inline script action for fetching the spot prices

```Javascript
// Influx database connection parameters must be configured in config.js
// Entso-E bidding zone and authentication token must be configured in config.js

// Load modules. CarunaTariffCalculator is optional and needed only if you want to calculate Caruna tariff.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Entsoe = require('openhab-spot-price-optimizer/entsoe.js');
Influx = require('openhab-spot-price-optimizer/influx.js');
CarunaTariffCalculator = require('openhab-spot-price-optimizer/caruna-tariff-calculator.js'); 

// Create objects. tariffCalculator is optional and needed only if you want to calculate Caruna tariff.
dh = new DateHelper.DateHelper();
entsoe = new Entsoe.Entsoe();
influx = new Influx.Influx();
tariffCalculator = new CarunaTariffCalculator.CarunaTariffCalculator(); 

// Get date range in the correct format for Entso-E API, fetch spot prices and save them to influxDB as 'SpotPrice'
start = dh.getEntsoStart();
end = dh.getEntsoEnd();
vat = 1.24; // Multiplier for VAT. Adjust this to your country or leave as 1.0.
spotPrices = entsoe.getSpotPrices(start, end, vat);
influx.writePoints('SpotPrice', spotPrices);

// The following part of the code is optional. It calculates the tariff using Caruna Espoo Season Distribution prices.
// You can remove this or replace it with your own calculation logic. 

dayPrice = 4.18;
nightPrice = 1.71;
tax = 2.729372;

h1 = dh.getMidnight('start');
h2 = dh.getMidnight('stop');

distributionPrices = tariffCalculator.getSeasonDistributionPrices(h1, h2, dayPrice, nightPrice, tax);
influx.writePoints('DistributionPrice', distributionPrices);

totalPrices = tariffCalculator.getTotalPrices(spotPrices, dayPrice, nightPrice, tax);
influx.writePoints('TotalPrice', totalPrices);
```

## Validate the results by checking the data in Influx Data Explorer
Once you have run the Rule, check the results from Influx Data Explorer. You should now see a measurement `SpotPrice`. Remember to adjust the date range filter to a custom range so that you have data for that time range.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fd1e22cf-bb19-4316-a233-f8fd36a3610c)

If you do not see the SpotPrice data in Influx Data Explorer:
- check the openHAB logs
- double check that you have configured `config.js` correctly
- double check that you have followed the pre-requisite instructions from the main README file 

# Create a Rule UpdateSpotPriceItem
If you want to render the current spot price in the openHAB user interface, you need to create a Rule that runs every full hour. The Script Action reads the spot price for the current hour from the database and updates the value of the SpotPrice item so that openHAB knows about the changed price. This is needed because we saved the spot prices to the Influx DB bypassing the openHAB persitence layers.

## Inline script action to refresh the value of SpotPrice Item every full hour
```Javascript
// Load modules. Database connection parameters must be defined in config.js.
DateHelper = require('openhab-spot-price-optimizer/date-helper.js');
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
dh = new DateHelper.DateHelper();
influx = new Influx.Influx();

// Update the spot price Item with the price of the current hour
now = dh.getCurrentHour();
currentPrice = influx.getCurrentControl('SpotPrice', now);
item = items.getItem('SpotPrice');
item.postUpdate(currentPrice);
```
