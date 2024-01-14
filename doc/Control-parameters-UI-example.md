# Usage example: Optimizing a boiler to heat domestic hot water on the cheapest hours
This documenation page shows an example how to use the `openhab-spot-price-optimizer` to find cheapest hours of the day to heat the domestic hot water with a boiler.

# Pre-requisites
- The boiler can be controlled via openHAB, in other words there is an Item that can toggle the power supply of the boiler.
  - [See example how to control boiler via openHAB](./Boiler-example.md)
- Fetching of spot prices is working
  - [See example of how to fetch spot prices from Entso-E API](./Entso-E-example.md)
 
# Create an Number Item BoilerHours that defines how many hours the boiler needs per day
- In order to optimize the heating, our optimizing script needs to know how many hours of heating will be needed.
- We don't want to hard code this number to our script, so let's create an Item `BoilerHours` which we can easily update with an user interface widget.
  
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/fc0e1cdc-dc44-4dc5-a0b4-55c07342fd65)

## Create a new page to the sidebar for all control parameters
Let's create a new page to the main sidebar which will contain all control parameters so that they can easily be updated.

- Go to Settings / Pages and create a new Layout page
- Let's call this page `ControlParameters` and make it visible in the sidebar
- Add a new Row, Add a new Column to this row and finally, add a new _Stepper Card_ so that the result looks like this
- Click the _configure widget_ icon next (highlighted in red in the picture above) and link your newly created Item `BoilerHours` to the Stepper Card as illustrated in the second screenshot below.
- You can now easily click the + and - buttons to increase or decrease the number of hours you want your boiler to run each day.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/badcdebb-42ce-4fe7-a4d8-111f354bf1a3)
![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/900db75a-3a3b-45e6-961a-a4e3d8567556)

