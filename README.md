# openhab-spot-price-optimizer
openHAB Spot Price Optimizer help you to optimize energy consumption to the cheapest hours of the day using openHAB home automation system.

# Disclaimer
This solution is provided as an inspiration for other openHAB community members. I disclaim all warranties and responsibilities if you use this solution. In no event shall I be liable for any direct or indirect damages resulting of use this solution. If your setup involves high voltage connections, they must always be designed and done by an authorized electrician.

# Conceptual description
Spot priced electricity contract means that the price of electricity is different for every hour of the day. The day-ahead prices are published at around 13.15 CET/CEST in the Entso-E Transparency Platform.

This solution helps to schedule the consumption of electricity to the cheapest hours of the day. The figure below shows the result of this kind of an optimization. The blue bars represent the consumption (in kWh), whereas the green line represent the spot price of that hour (c / kWh). As you can see, the consumption peaks systematically when the prices are at lowest.

The solution can be applied for a variety of devices that you can contorl via openHAB, including heating of your house, heating the domestic hot water, charging an electric vehicle or heating the water of a swimming pool. The key concept is to calculate _control points_ for the next day, which define when the device is expected to run. The two figures below illustrates two use cases: heating of the house and charging of an electric vehicle.

**Example 1: Control points for charging an electric vehicle**
The blue area represents the hourly spot prices. The red bars are the _control points_ for charging the car for two hours between 01:00-03:00 when the prices are cheap.   
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/36d0bb9c-7707-4177-89b9-86f616823e8e)

**Example 2: Control points for heating the house with a ground source heat pump**
The yellow bars are the _control points_ when the compressor of a ground source heat pump is allowed to run. On this example day, 12 hours of heating is distributed so that the morning and evening peak hours are avoided.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fced817e-83d7-464c-bef2-a9d9c20e639a)

**How to control your devices via openHAB**
openHAB has Bindings for many different devices. If your device in not connected online, it is usually possible to control them using a relay. An example how to control a Nibe F-1226 ground source heat pump using a relay is provided in this README.

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

## Basic understanding of openHAB key concepts
If you are new to openHAB, familiarize yourself with [key concepts of Things, Items and Channels](https://www.openhab.org/docs/concepts/#things-channels-bindings-items-and-links).

# Example: controlling a Nibe F1226 ground source heat pump using a relay via openHAB GPIO Binding
This chapter example explains step by step how a Nibe F1226 ground source heat pump can be controlled with a relay. 

The openhab-spot-price-optimizer scripts can be used with all kinds of devices, as long as you can control them using an openHAB Item. In other words, the usage of Raspberry Pi relay board and openHAB GPIO Binding is completely optional. You could also use for example smart relays like Shelly Pro series using the [Shelly Binding](https://www.openhab.org/addons/bindings/shelly/) or control your devices via a Binding to a cloud services like Mitsubishi MELCloud using the [MELCloud binding](https://www.openhab.org/addons/bindings/melcloud/).

## Raspberry PI with a relay board
The picture below shows a Raspberry Pi which is connected to a relay board so that the relays can be controlled with Raspberry GPIO. The board in the picture is a [Waveshare relay board with 8 relays](https://www.waveshare.com/wiki/RPi_Relay_Board_(B)). This relay board can be mounted to a DIN-rail.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/d039d219-a7a2-4dee-b751-9fdf326e21f0)

## Nibe F1226 AUX inputs 
Nibe F1226 ground source heat pump has two external AUX inputs which are shown in the picture below.
- When pins 3-4 are connected, AUX1 is enabled.
- When pins 5-6 are connected, AUX2 is enabled.
- The meaning of AUX1 and AUX2 inputs can be configured in the menu of the Nibe heat pump. There is for example an option _block comperssor_ and _block hot water_. Note that these are only explained in the _Nibe installation manual_, not in the user guide document.
- The AUX pins use a low voltage (3.3V) so you can test the Nibe side of things simply by using a short copper wire and connect pins 3 and 4 for AUX1 and pins 5-6 for AUX2. The relay will simply connect pins 3-4 (for AUX1) when the relay pulls or pins 5-6 (for AUX2) when the relay pulls.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/8aef683f-4d5e-4aed-921b-1c6b05cf70ca)

## Controlling the relays via openHAB GPIO Binding
Warning: Do not have the physical cabling connected between the relays and your devices when you are experimenting and building the openHAB solution. The relays make a loud click when their state changes and there is also a green led indicating when the relay pulls so you can easily notice if your on/off state changes work.

First install openHab [GPIO binding](https://www.openhab.org/addons/bindings/gpio/) from Settings - Bindings. 
- You will also need to install pigpio-remote as instruceted on the GPIO binding instructions.

Create a new _Thing_ using the GPIO Binding
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/92eb28fc-9004-453e-9316-05c04cefda4a)

Give a unique ID for the Thing. We use the `HeatPump` in this example. Remember to set the Network Address as ::1 like mentioned in the GPIO binding documentation linked above.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/1bd37222-4cd7-468e-892e-f88b644e1153)

Create a Channel, configure it to use GPIO Digital Output and configure the GPIO Pin number that matches the relay that you will be using. The Waveshare relay board that I use have its GPIO pin numbers documented at [RPi Relay Board (B) - Waveshare Wiki](https://www.waveshare.com/wiki/RPi_Relay_Board_(B)). The GPIO Pin 5 matches to the first relay of the board.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/c539d388-365a-46a3-90eb-092e4d88490e)

Finally, add a link to a new Item to this Channel. Note that the name of the Item we use here is `HeatPumpCompressor`, it will be used in the Rules later on. The type of this Item is Switch as illustrated in the picture below. You can also add other metadata to the Item so that you can benefit from other nice openHAB UI features.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/657ac4a9-d4c2-4eee-948c-83345fddfb34)

You should now be able to toggle the relay 1 of your relay board on and off using the switch Item `HeatPumpCompressor` you just created. You can find this newly created Item in the Items menu. You can also create an openHAB _Page_ that contains this switch. If you hear loud clicks from the relay board and see the green led turning on/off, everything works as expected.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/7c68da09-fa11-4e82-b29c-ad07568cef66)

Hint: If you installed openHabian SD image, you can use Frontail log viewer at port 9001 of your Raspberry using your web browser. You can see log entries when the state of your Item and Thing change. If you don't have Frontail to view the logs using a browser, you can always view the openHAB log files from the command line.

## Testing the relay state changes and introduction to openHab Persistence
This solution uses InfluxDB 2.x database to store the data. [openHabian OS comes with influx database server pre-installed](https://www.openhab.org/docs/installation/openhabian.html#features) but you can run it on any server. I run InfluxDB on my NAS server so that the data is physically stored in a more reliable place than the SD card of the Raspberry.

Make sure that your influx 2.x database server is up and running and that you can access the Influx Data Explorer (the web user interface uses port is 8086 by default). If you haven't already done so, 
- install the openHab InfluxDB Persistence addon from Settings - Other add-ons.
- set it as default persistence service from Settings - Persistence.

State change of the Item `HeatPumpCompressor` should now be visible in your Influx Data Explorer, like in the picture below.
