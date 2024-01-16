# Controlling a Nibe F1226 ground source heat pump using a relay via openHAB GPIO Binding
This page contains a step-by-step guide how a Nibe F1226 ground source heat pump can be controlled with openHAB using a relay. 

The openhab-spot-price-optimizer scripts can be used with all kinds of devices, as long as you can control them using an openHAB Item. In other words, the usage of Raspberry Pi relay board and openHAB GPIO Binding is completely optional. You could also use for example smart relays like Shelly Pro series using the [Shelly Binding](https://www.openhab.org/addons/bindings/shelly/) or control your devices via a Binding to a cloud services like Mitsubishi MELCloud using the [MELCloud binding](https://www.openhab.org/addons/bindings/melcloud/).

# Raspberry PI with a relay board
The picture below shows a Raspberry Pi which is connected to a relay board so that the relays can be controlled with Raspberry GPIO. The board in the picture is a [Waveshare relay board with 8 relays](https://www.waveshare.com/wiki/RPi_Relay_Board_(B)). This relay board can be mounted to a DIN-rail.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/d039d219-a7a2-4dee-b751-9fdf326e21f0)

# Nibe F1226 AUX inputs 
Nibe F1226 ground source heat pump has two external AUX inputs which are shown in the picture below.
- When pins 3-4 are connected, AUX1 is enabled.
- When pins 5-6 are connected, AUX2 is enabled.
- The meaning of AUX1 and AUX2 inputs can be configured in the menu of the Nibe heat pump. There is for example an option _block comperssor_ and _block hot water_. Note that these are only explained in the _Nibe installation manual_, not in the user guide document.
- The AUX pins use a low voltage (3.3V) so you can test the Nibe side of things simply by using a short copper wire and connect pins 3 and 4 for AUX1 and pins 5-6 for AUX2. The relay will simply connect pins 3-4 (for AUX1) when the relay pulls or pins 5-6 (for AUX2) when the relay pulls.
- 
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/8aef683f-4d5e-4aed-921b-1c6b05cf70ca)

# Controlling the relays via openHAB GPIO Binding
Warning: Do not have the physical cabling connected between the relays and your devices when you are experimenting and building the openHAB solution. The relays make a loud click when their state changes and there is also a green led indicating when the relay pulls so you can easily notice if your on/off state changes work.

First install openHab [GPIO binding](https://www.openhab.org/addons/bindings/gpio/) from Settings - Bindings. 
- You will also need to install pigpio-remote as instruceted on the GPIO binding instructions.

Create a new _Thing_ using the GPIO Binding

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/92eb28fc-9004-453e-9316-05c04cefda4a)

Give a unique ID for the Thing. We use the `HeatPump` in this example. Remember to set the Network Address as ::1 like mentioned in the GPIO binding documentation linked above.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/1bd37222-4cd7-468e-892e-f88b644e1153)

Create a Channel and give an identifier for it, we call it `Aux1` here because the relay will be connected to the Aux1 input of the heat pump. Configure it to use GPIO Digital Output and configure the GPIO Pin number that matches the relay that you will be using. The Waveshare relay board that is used in this example have its GPIO pin numbers documented at [RPi Relay Board (B) - Waveshare Wiki](https://www.waveshare.com/wiki/RPi_Relay_Board_(B)). The GPIO Pin 5 matches to the first relay of the board.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/146aef0c-d800-437a-9da1-7632a808aa79)

Finally, add a link to a new Item to this Channel. Note that the name of the Item we use here is `HeatPumpCompressor`, it will be used in the Rules later on. The type of this Item is Switch as illustrated in the picture below. You can also add other metadata to the Item so that you can benefit from other nice openHAB UI features.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/657ac4a9-d4c2-4eee-948c-83345fddfb34)

You should now be able to toggle the relay 1 of your relay board on and off using the switch Item `HeatPumpCompressor` you just created. You can find this newly created Item in the Items menu. You can also create an openHAB _Page_ that contains this switch, for example the home page of your openHAB. If you hear loud clicks from the relay board and see the green led turning on/off, everything works as expected.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/7c68da09-fa11-4e82-b29c-ad07568cef66)

Hint: If you installed openHabian SD image, you can use Frontail log viewer at port 9001 of your Raspberry using your web browser. You can see log entries when the state of your Item and Thing change. If you don't have Frontail to view the logs using a browser, you can always view the openHAB log files from the command line.
