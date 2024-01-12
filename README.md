# openhab-spot-price-optimizer
Openhab Spot Price Optimizer modules help you to optimize energy consumption to the cheapest hours of the day.

# Disclaimer
This solution is provided as an inspiration for other openHAB community members. I disclaim all warranties and responsibilities if you use this solution. In no event shall I be liable for any direct or indirect damages resulting of use this solution. If your setup involves high voltage connections, they must always be designed and done by an authorized electrician.

# Conceptual description
Spot priced electricity contract means that the price of electricity is different for every hour of the day. The day-ahead prices are published at around 13.15 CET/CEST in the Entso-E Transparency Platform.

This solution helps to schedule the consumption of electricity to the cheapest hours of the day. The figure below shows the result of this kind of an optimization. The blue bars represent the consumption (in kWh), whereas the green line represent the spot price of that hour (c / kWh). As you can see, the consumption peaks systematically when the prices are at lowest.

The solution can be applied for a variety of devices that you can contorl via openHAB, including heating of your house, heating the domestic hot water, charging an electric vehicle or heating the water of a swimming pool. The key concept is to calculate _control points_ for the next day, which define when the device is expected to run. The two figures below illustrates two use cases: heating of the house and charging of an electric vehicle.

**Example 1: Control points for charging an electric vehicle**
The blue area represents the price of the electricity. The red bars are the _control points_ for charging the car for two hours between 01:00-03:00 when the electricity is cheap.   
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/36d0bb9c-7707-4177-89b9-86f616823e8e)

**Example 2: Control points for heating the house with a ground source heat pump**
The yellow bars are the _control points_ when the compressor of a ground source heat pump is allowed to run. On this example day, 12 hours of heating is distributed so that the morning and evening peak hours are avoided.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fced817e-83d7-464c-bef2-a9d9c20e639a)

**How to control your devices via openHAB**
openHAB has Bindings for many, many different devices. If your device cannot be connected online, it might be possible to control them using a relay. Examples are provided later in this README.

# Installation and pre-requisites

## System requirements
- openHAB 3.x or 4.x is up and running
  - `npm` package manager must be installed on your openHAB server. openHABian ships with npm pre-installed for you.
- influxDB 2.x database must be up and running.
  - openHABian ships with influxDB pre-installed for you.
  - It is recommended to run the InfluxDB on some other server than Raspberry Pi because the write operations might eventually wear the SD memory card until it corrupts.
  - Create an Organization, Bucket (database) and ensure you have the Token to connect to the InfluxDB.
- JSScripting addon must be installed. The rules are written as ECMAScript 262 Edition 11. Note the version 11. openHAB 4.x ships with JSScripting so you don't need to install this separately.
- InfluxDB Persistence addon must be installed and configured as the default persistence service.
- `xml2json.xsl` must be downloaded from https://www.bjelic.net/2012/08/01/coding/convert-xml-to-json-using-xslt/ and must be saved as `openhab/conf/transform/xml2json.xsl` . Ensure that the openhab user has read access to this file.   

## Entso-E API token and bidding zone
The spot prices are read from the Entso-E Transparency Platform API. You need to request a free personal API token from Entso-E service desk, see https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html#_authentication_and_authorisation

You also need to identify the bidding zone code of the area you live. For example Finland's bidding zone is `10YFI-1--------U`. The list of bidding zones is available at https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/Market_Areas_v2.1.pdf

## Basic understanding of openHAB key concepts
If you are new to openHAB, read the key concepts first at https://www.openhab.org/docs/concepts/#things-channels-bindings-items-and-links

## Create an Item that controls your device (Thing) and ensure persistence to InfluxDB is working
- Let's assume that the device we want to control is a heat pump.
- Create a Thing called HeatPump. When experimenting with the logic, you can skip the creation of the Thing and just creat the Item. 
- Create an Item called HeatPumpPower. This switch will be later on linked to your HeatPump Thing using an appropriate Binding so that when the switch is turned ON, openHAB will turn the device ON and when the switch is OFF, openHAB will turn the device OFF (or whatever command you want to send to the device). The name, label and type of the Item are important in the screenshot below, it is also recommended to define the other properties so that openHAB will create you nice user interfaces automatically. 

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/ab84cfd9-ada1-4ba7-ba04-fe33b77b6e56)


