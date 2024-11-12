openHAB Spot Price Optimizer helps you to optimize energy consumption to the cheapest times of the day using [openHAB home automation system](https://www.openhab.org/).

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/879e3ac7-a155-42c9-8402-175ad990087b)

The blue area represents the hourly spot prices of electricity. The red bars are the _control points_ for heating the domestic hot water in a boiler during the three cheapest hours of the day. The yellow bars are the _control points_ that control when the heating of a house is ON. On this example day, 14 hours of heating is distributed so that the morning and evening price peaks are avoided.

# Full documentation in Wiki
[Read documentation](https://github.com/masipila/openhab-spot-price-optimizer/wiki)

# Disclaimer
This solution is provided as an inspiration for other openHAB community members. I disclaim all warranties and responsibilities if you use this solution. In no event shall I be liable for any direct or indirect damages resulting of use this solution. [See the license for further terms](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/LICENSE). If your setup involves high voltage connections, they must always be designed and done by an authorized electrician.

# About the author
openhab-spot-price-optimizer is developed by [Markus Sipilä](https://fi.linkedin.com/in/markussipila). Publishing this solution as open source is my small contribution to fight the climate crisis. As the share of wind and solar power increase, the importance of _demand response_ becomes increasingly important. Demand response means shifting demand of electricity to times when there is plenty of electricity available or when the other demand is lower. `openhab-spot-price-optimizer` helps normal households to do exactly this and save money.

# Community and support
You are more than welcome to join the discussion around this solution on the [openHAB community forum](https://community.openhab.org/t/control-a-water-heater-and-ground-source-heat-pump-based-on-cheap-hours-of-spot-priced-electricity/136566).

Support requests to the community forum, please, not to the issues of this github repo. I have spent a beer (or three) writing these instructions so that they would be as complete as possible. I kindly ask you to respect this effort and read this documentation once more before asking for support on the community forum. This request does not mean that you would not be welcome to the community discussions, quite the contrary. It simply means that most problems can be fixed by double checking that your implementation follows the documentation and checking your logs.

# Support the development
In addition to being home automation enthusiast, I'm also semi-professional athlete targeting the 2026 Winter Olympics in mixed doubles curling. If you like the Spot Price Optimizer and want to support our journey towards Milano-Cortina, you can do that by donating a sum of your choice to our curling club's bank account. Fundraising in Finland requires a permit, our permit number is RA/2024/1837.
* Kisakallio Curling Club ry (VAT ID FI30644384)
* IBAN: FI94 5280 0020 0319 02
* BIC: OKOYFIHH
* Message: openhab optimizer

