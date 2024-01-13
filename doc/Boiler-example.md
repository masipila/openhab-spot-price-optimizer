# Example: controlling a water boiler using a contactor and relay via openHAB GPIO Binding
This example explains step by step how a water boiler can be controlled with openHAB using a relay and a contactor. 

The openhab-spot-price-optimizer scripts can be used with all kinds of devices, as long as you can control them using an openHAB Item. In other words, the usage of Raspberry Pi relay board and openHAB GPIO Binding is completely optional. You could also use for example smart relays like Shelly Pro series using the [Shelly Binding](https://www.openhab.org/addons/bindings/shelly/) or control your devices via a Binding to a cloud services like Mitsubishi MELCloud using the [MELCloud binding](https://www.openhab.org/addons/bindings/melcloud/).

## Raspberry PI with a relay board
The picture below shows a Raspberry Pi which is connected to a relay board so that the relays can be controlled with Raspberry GPIO. The board in the picture is a [Waveshare relay board with 8 relays](https://www.waveshare.com/wiki/RPi_Relay_Board_(B)). This relay board can be mounted to a DIN-rail.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/d039d219-a7a2-4dee-b751-9fdf326e21f0)

## Allowing the power input using a contactor and relays
The boiler used in this example does not have any external inputs or even an on/off switch. By default, the power supply is always on and the boiler uses its internal thermostate to turn the heating on and off. When the temperature drops below a lower threshold, the thermostate turns the heating on and when the temperature reaches an upper threshold, the thermostate turns the heating off. The boiler has a 3 kW heating resistor which uses 3 x 230 V high voltage power input.

It is not needed (nor recommended) to tamper with the internal thermostate logic of the boiler. What can be done instead is to add an electrical component called _contactor_ to the electrical cabinet which either allows or cuts the power input to the device, which is conceptually equivalent to preventing the power input using the fuses in your electrical cabinet. The contactor can then be controlled with a relay, which your openHAB can control. The contactor is the black component in the picture below, which an electrician installed to the electrical cabinet.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/6800ec75-270a-4662-af0e-2bf7f02ec378)

*WARNING: The high voltage connections MUST always be designed and implemented by an authorized electrician. High voltage can kill you.*

There are at least a couple of options to do the physical connections between the openHAB controlled relay and the contactor. Two options are presented here, but as mentioned, leave the design to an authorized electrician.

### Hardware connections: option 1
In this option, the GPIO controlled relay controls a contactor directly, see figure below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/43aadb1c-9215-4999-87e8-b40c69ca8753)

The contactor is located in the electrical cabinet and it allows / cuts the power supply for the water heater. The downside of this connection option is that the connection between the Raspberry relay board and the contactor is 230 V. You absolutely must have a hard cover box and ensure that there is no voltage in these cables every time before you open the hard cover box of your Raspberry and relay board.

I originally had this connection option so I printed a warning sticker to the cover box with a reminder which fuse must be turned off before opening the cover, see picture below.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/98917fe5-9714-479a-b1b6-69910eac7b69)

### Hardware connections: option 2
A safer connection option is to have a second relay in your electrical cabinet so that the connection from the GPIO controlled relay board to this second relay is only 24V. This way you don’t need to bring 230V cables to the box of your Raspberry and relay board. My setup was updated to this connection option (again by an authorized electrician) for safety reasons.
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/08179216-9e9a-4c87-8a6b-98d76177c93b)
