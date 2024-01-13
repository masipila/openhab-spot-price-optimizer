# openhab-spot-price-optimizer
openHAB Spot Price Optimizer help you to optimize energy consumption to the cheapest hours of the day using openHAB home automation system.

# Disclaimer
This solution is provided as an inspiration for other openHAB community members. I disclaim all warranties and responsibilities if you use this solution. In no event shall I be liable for any direct or indirect damages resulting of use this solution. If your setup involves high voltage connections, they must always be designed and done by an authorized electrician.

# Conceptual description
Spot priced electricity contract means that the price of electricity is different for every hour of the day. The day-ahead prices are published at around 13.15 CET/CEST in the Entso-E Transparency Platform.

This solution helps to schedule the consumption of electricity to the cheapest hours of the day. The figure below shows the result of this kind of an optimization. The blue bars represent the consumption (in kWh), whereas the green line represent the spot price of that hour (c / kWh). As you can see, the consumption peaks systematically when the prices are at lowest.

The solution can be applied for a variety of devices that you can contorl via openHAB, including heating of your house, heating the domestic hot water, charging an electric vehicle or heating the water of a swimming pool. The key concept is to calculate _control points_ for the next day, which define when the device is expected to run. The two figures below illustrates two use cases: heating of the house and charging of an electric vehicle.

**Example 1: Control points for charging an electric vehicle**
The blue area represents the hourly spot prices. The red bars are the _control points_ for charging the car for two hours between 03:00-05:00 when the prices are cheap.   
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/36d0bb9c-7707-4177-89b9-86f616823e8e)

**Example 2: Control points for heating the house with a ground source heat pump**
The yellow bars are the _control points_ when the compressor of a ground source heat pump is allowed to run. On this example day, 12 hours of heating is distributed so that the morning and evening peak hours are avoided.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fced817e-83d7-464c-bef2-a9d9c20e639a)

**How to control your devices via openHAB**
openHAB has Bindings for many different devices. If you are new to openHAB, [learn the key concepts of Things, Items and Channels first](https://www.openhab.org/docs/concepts/#things-channels-bindings-items-and-links). If your device in not connected online, it is usually possible to control them using a relay. 

Step by step tutorials:
- [Control the compressor of a Nibe F-1226 ground source heat pump using a relay](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Nibe-example.md))

# Pre-requisites

## System requirements
- openHAB 3.x or 4.x must be up and running
  - `npm` package manager must be installed on your openHAB server. openHABian operating system image ships with npm pre-installed.
- influxDB 2.x database must be up and running.
  - openHABian operating system image ships with influxDB pre-installed.
  - It is recommended to run the InfluxDB on some other server than a Raspberry Pi because the write operations might eventually wear the SD card until it corrupts.
  - Create an influxDB user, organization and a bucket (database is called a bucket in InfluxDB 2.x) and ensure you have the token with read and write permissions to your bucket.
- JSScripting addon must be installed in openHAB settings. The rules are written as ECMAScript 262 Edition 11. Note the version 11. openHAB 4.x ships with JSScripting so you don't need to install this separately.
- InfluxDB Persistence addon must be installed in openHAB settings and configured as the default persistence service.
- Download `xml2json.xsl` from https://www.bjelic.net/2012/08/01/coding/convert-xml-to-json-using-xslt/ and save it as `openhab/conf/transform/xml2json.xsl` . Ensure that the openhab user has read access to this file. 

## Entso-E API token and bidding zone
The spot prices are read from the Entso-E Transparency Platform API. You need to [request a free personal API token from Entso-E service desk](https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html#_authentication_and_authorisation).

You also need to [identify the _bidding zone_ code for the area you live in](https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/Market_Areas_v2.1.pdf). For example Finland's bidding zone is `10YFI-1--------U`.

Hint: If you installed openHabian SD image, you can use Frontail log viewer at port 9001 of your Raspberry using your web browser. You can see log entries when the state of your Item and Thing change. If you don't have Frontail to view the logs using a browser, you can always view the openHAB log files from the command line.

## Testing the relay state changes and introduction to openHab Persistence
This solution uses InfluxDB 2.x database to store the data. [openHabian OS comes with influx database server pre-installed](https://www.openhab.org/docs/installation/openhabian.html#features) but you can run it on any server. I run InfluxDB on my NAS server so that the data is physically stored in a more reliable place than the SD card of the Raspberry.

Make sure that your influx 2.x database server is up and running and that you can access the Influx Data Explorer (the web user interface uses port is 8086 by default). If you haven't already done so, 
- install the openHab InfluxDB Persistence addon from Settings - Other add-ons.
- set it as default persistence service from Settings - Persistence.

State change of the Item `HeatPumpCompressor` should now be visible in your Influx Data Explorer, like in the picture below.
