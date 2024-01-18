# Usage example: Fetching weather forecast from Finnish Meteorology Insititute (FMI) API
Note: This solution was originally built in 2022 when openHAB did not have a capability where Bindings can persist forecast time series data. This capability has been added to openHAB 4.1. The actual optimizing scripts do NOT require using this FMI API script, you can also use any of the weather forecast bindings available for openHAB. 

## Pre-requisites
- See a list of pre-requisites from the main README.md file and make sure you have followed them precisely.
- Most specifically, the InfluxDB connection parameters must be configured to `config.js` as documented on the main README file.
- The Rule script actions are written as ECMAScript 262 Edition 11. Note the version 11. Install the JSScripting addon if you are still using openHAB 3.x. Version 4.x ships this enabled out of the box. 

# Create an Item FMIForecastTemperature
First create an Item called `FMIForecastTemperature` so that you will be able to render the time series on openHAB charts.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/b868d091-5451-41ae-ab3f-f936bb90e3b6)

Optionally, you can create Items for other attributes available in the FMI API like wind speed or total cloud cover, see the names of these attributes in the script below.

# Create a Rule FetchWeatherForecast
- Create a new Rule called `FetchWeatherForecast` which will fetch the weather forecast from FMI API and save it to your InfluxDB using the Influx HTTP API. In other words, the openHAB persistence layer is NOT used to access the database, the script will call Influx HTTP API directly.
- You can schedule the Rule to be run for example every full hour.
- Copy-paste the code below as the Script Action (ECMAScript 262 Edition 11).
- The script will write the forecasted temperature as `FMIForecastTemperature` time series to your InfluxDB
 
Note: If you make changes to the javascript files (inluding config.js), you must re-save the Script Action (the code snippet below) to make sure openHAB re-reads the javascript files.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/2925166f-4638-444a-99dc-6b08c6f5bbb5)

## Inline script action for fetching the spot prices

```Javascript
// Load modules. Database connection parameters must be defined in config.js.
FMI = require('openhab-spot-price-optimizer/fmi.js');
Influx = require('openhab-spot-price-optimizer/influx.js');

// Create objects.
fmi = new FMI.FMI();
influx = new Influx.Influx();

// Read weather forecast from the API. The place must be recognized by FMI API.
place = 'veini';
xml = fmi.makeApiCall(place);

// temperature is stored to influxdb with lowercase for backwards compatibility.
Temperature = fmi.preparePoints(xml, 'Temperature');
influx.writePoints('FMIForecastTemperature', Temperature);

// Uncomment the additional attributes you need but remember to create Items for them first!

// PrecipitationAmount = fmi.preparePoints(xml, 'PrecipitationAmount');
// influx.writePoints('FMIForecastPrecipitationAmount', PrecipitationAmount);

// WindSpeedMS = fmi.preparePoints(xml, 'WindSpeedMS');
// influx.writePoints('FMIForecastWindSpeedMS', WindSpeedMS);

// TotalCloudCover = fmi.preparePoints(xml, 'TotalCloudCover');
// influx.writePoints('FMIForecastTotalCloudCover', TotalCloudCover);

// WindChillTemp = fmi.calculateWindChillTempPoints(Temperature, WindSpeedMS);
// influx.writePoints('FMIForecastWindChillTemp', WindChillTemp);
```

## Validate the results by checking the data in Influx Data Explorer
Once you have run the Rule, check the results from Influx Data Explorer. You should now see a measurement `FMIForecastTemperature`. Remember to adjust the date range filter to a custom range so that you have data for that time range.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/1985d99d-f57f-41d9-8b9a-4d1092282210)

If you do not see the FMIForecastTemperature data in Influx Data Explorer:
- check the openHAB logs
- double check that you have configured `config.js` correctly
- double check that you have followed the pre-requisite instructions from the main README file 
