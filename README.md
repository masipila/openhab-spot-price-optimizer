# openHAB Spot Price Optimizer
- [Introduction](#introduction)
- [How to control your devices via openHAB](#how-to-control-your-devices-via-openhab)
- [System requirements and other pre-requisites](#system-requirements-and-other-pre-requisites)
  - [Entso-E API token and bidding zone](#entso-e-api-token-and-bidding-zone)
  - [Test InfluxDB persistence with your Items](#test-influxdb-persistence-with-your-items)
  - [Verify that you are able to view openHAB log entries](#verify-that-you-are-able-to-view-openhab-log-entries)
- [Installation instructions and usage](#installation-instructions-and-usage)
  - [Install openhab-spot-price-optimizer scripts](#install-openhab-spot-price-optimizer-scripts)
  - [Usage examples](#usage-examples)
  - [User interface examples](#user-interface-examples)
- [Remote access](#remote-access)
- [About the author](#about-the-author)
- [Community and support](#community-and-support)

# Introduction
openHAB Spot Price Optimizer helps you to optimize energy consumption to the cheapest hours of the day using openHAB home automation system.

**Disclaimer**: This solution is provided as an inspiration for other openHAB community members. I disclaim all warranties and responsibilities if you use this solution. In no event shall I be liable for any direct or indirect damages resulting of use this solution. If your setup involves high voltage connections, they must always be designed and done by an authorized electrician.

Spot priced electricity contract means that the price of electricity is different for every hour of the day. The day-ahead prices are published at around 13.15 CET/CEST on the [Entso-E Transparency Platform](https://transparency.entsoe.eu).

This solution helps to automatically schedule the consumption of electricity to the cheapest hours of the next day. The solution can be applied for a variety of devices that you can contorl via openHAB, including heating of your house, heating the domestic hot water with a water boiler, charging an electric vehicle or heating the water of a swimming pool. The key concept is to calculate _control points_ for the next day, which define when the device is expected to be ON or OFF (or have its other kind of state changed). The picutre below illustrate two use cases: heating the domestic hot water (red bars) in the night and heating of a house (yellow bars).

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/001cbab8-7391-46e7-ad70-42e4216264c6)

The blue area represents the hourly prices of electricity. The yellow bars are the _control points_ for heating the domestic hot water in a boiler during the two cheapest hours of the night. The green bars are the _control points_ when the compressor of a ground source heat pump is allowed to run and heat the house. On this example day, 14 hours of heating is distributed so that the morning and evening price peaks are avoided.

# How to control your devices via openHAB
The openhab-spot-price-optimizer scripts can be used with all kinds of devices, as long as you can control them using openHAB.
- [openHAB has Bindings available for many different devices](https://www.openhab.org/addons/#binding).
- If you are new to openHAB, it is recommended to [learn the key concepts of Things, Items and Channels first](https://www.openhab.org/docs/concepts/#things-channels-bindings-items-and-links).

If your device in not connected online or there is no binding available to control it, it is usually possible to control them using a relay.
- Below are two step-by-step tutorials where openHAB runs on a Raspberry Pi which is connected to a relay board.
- However, the openhab-spot-price-optimizer does not require the usage of a Raspberry relay board. You could also use for example [Shelly Pro smart relays](https://www.shelly.com) using the [Shelly Binding](https://www.openhab.org/addons/bindings/shelly/).
- And of course, if your device can already by controlled via a binding like [Mitsubishi MELCloud binding](https://www.openhab.org/addons/bindings/melcloud/), you can use that instead using relays.

 Two step by step tutorials are available below:
- [Control the compressor of a Nibe F-1226 ground source heat pump using a relay](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Nibe-example.md)
- [Control a water boiler using a relay and a contactor](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Boiler-example.md) 

# System requirements and other pre-requisites
- openHAB 3.x or 4.x must be up and running
  - `npm` package manager must be installed on your openHAB server. openHABian operating system image ships with npm pre-installed.
- influxDB 2.x database must be up and running.
  - openHABian operating system image ships with influxDB pre-installed.
  - Create an influxDB user, organization and a bucket (database is called a bucket in InfluxDB 2.x) and ensure you have a token with read and write permissions to your bucket.
  - It is recommended to run the InfluxDB on some other server than a Raspberry Pi because the write operations might eventually wear the SD card until it corrupts.
- JSScripting addon must be installed in openHAB settings. The rules are written as ECMAScript 262 Edition 11. Note the version 11. openHAB 4.x ships with JSScripting so you don't need to install this separately.
- XSLT Transformation addon must be installed in openHAB settings
- JSONPath Transformation addon must be installed in openHAB settings.
- InfluxDB Persistence addon must be installed in openHAB settings
- InfluxDB is configured as the default persistence service in openHAB settings.
- [Download xml2json.xsl](https://www.bjelic.net/2012/08/01/coding/convert-xml-to-json-using-xslt/) and save it as `openhab/conf/transform/xml2json.xsl` . Ensure that the openhab user has read access to this file. 

## Entso-E API token and bidding zone
The spot prices are read from the Entso-E Transparency Platform API.
- [Request a free personal API token from Entso-E service desk](https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html#_authentication_and_authorisation).
- [identify the _bidding zone_ code for the area you live in](https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/Market_Areas_v2.1.pdf). For example Finland's bidding zone is `10YFI-1--------U`.

## Test InfluxDB persistence with your Items
- The step-by-step examples above created two Items, `HeatPumpCompressor` and `BoilerPower`. Toggle your switch Item on/off for a couple of times. 
- Log in to your Influx DB Data Explorer and verify that you are able to see the Item state changes that openHAB persistence layer has written there.
- Influx Data Explorer can be access with a web browser from the port 8086 of your InfuxDB server, see a screenshot below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/911c5c68-0d8f-4a7c-adc7-9f537f386ac8)

## Verify that you are able to view openHAB log entries
- If you are yousing openHabian SD image, you can use Frontail log viewer with a web browser from port 9001 of your openHAB server
- If you don't have Frontail to view the logs using a browser, you can always view the openHAB log files from the command line.
- Verify that you are able to see the log entries when you toggle your switch Item on/off.

# Installation instructions and usage
## Install openhab-spot-price-optimizer scripts
- The openhab-spot-price-optimizer is written in Javascript and published as a npm package.
- Take a shell connection to your openHAB server and navigate to `openhab/conf/automation/js` directory.
- Install the package with a command `npm install openhab-spot-price-optimizer`.
   - This will create a directory `openhab/conf/automation/js/node_modules` (if it does not exist already) and download openhab-spot-price-optimizer there.
   - WARNING: If you have previously added scripts to the `node_modules` directory manually, make a backup of them. `npm install` will erase all files and directories under `node_modules` which are not installed with the `npm install` command. [See openHAB documentation on Javascript libraries](https://www.openhab.org/addons/automation/jsscripting/#libraries).
- Edit the `config.js` file of in the `openhab-spot-price-optimizer` directory:
  - Add your influxDB connection parameters and authentication token
  - Add your Entso-E API token and bidding zone 
- You can now write openHAB Rules which can fetch the spot prices from Entso-E API and use the openhab-spot-price-optimizer algorithms. See examples below.

## Usage examples
- [Fetch spot prices from Entso-E API and save them to InfluxDB](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Entso-E-example.md)
- [GenericOptimizer usage example: Calculate control points for a boiler to heat domestic hot water](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Boiler-control-points-example.md)
- [PeakPeriodOptimizer usage example: Calculate control points for a heating a house](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Heating-contol-points-example.md)
- [Fetch weather forecast from FMI API and save it to InfluxDB](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/FMI-example.md)
- [Calculate the amount of heating need based on weather forecast](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Calculate-heating-need.md)

## User interface examples
- [Home page displaying current states of the devices](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/UI-current-states.md)
- [Chart visualizing spot prices and control points](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/UI-chart-example.md)
- [Page containing widgets to update control parameters](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/UI-control-parameters.md)

# Remote access
If you run openHAB at your home network, it's quite nice to to be able to access it remotely with mobile phone. Exposing your openHAB directly to public internet is a Bad Idea (TM) as it will be under continuous attacks in no time (it's probably a question of minutes, max hours, not days after you expose it to public internet). To securely use your openHAB remotely, I can warmly recommend using [Tailscale VPN](https://tailscale.com/), which is free for personal use and super simple to install.  

# About the author
openhab-spot-price-optimizer is developed by [Markus Sipilä](https://fi.linkedin.com/in/markussipila). Publishing this solution as open source is my small contribution to fight the climate crisis. As the share of wind and solar power increase, the importance of demand response becomes increasingly important. Demand response means shifting demand of electricity to times when there is plenty of electricity available or when the other demand is lower. openhab-spot-price-optimizer helps normal households to do exactly this and save money while saving the planet.

# Community and support
You are more than welcome to join the discussion around this solution on the [openHAB community forum](https://community.openhab.org/t/control-a-water-heater-and-ground-source-heat-pump-based-on-cheap-hours-of-spot-priced-electricity/136566).

Support requests to the community forum, please, not to the issues of this github repo. I have spent a beer (or three) writing these instructions so that they would be as complete as possible. Please respect this effort and re-read this documentation once more before asking for support on the community forum.
