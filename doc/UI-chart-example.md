# UI example: Chart with spot prices, temperature and control points

The examples included two use cases for `openhab-spot-price-optimizer`:
- Optimizing the heating of domestic hot water to the cheapes hours
- Optimizing the heating of the house to avoid morning and evening price peaks

All use cases involve _control points_ for each hour. These control points will drive the state changes of the devices i.e. when they will be ON/OFF. This documentation page shows an example openHAB Chart configuration for rendering the spot prices, forecasted temperature and control points.

KUVA

[openHAB Charts](https://www.openhab.org/docs/ui/chart-pages.html) use [Apache ECharts](https://echarts.apache.org/en/cheat-sheet.html) under the hood. The simplest openHAB charts can be configured with the design editor, but advanced chart configurations can only be done by modifying the chart configuration as YAML code. 

# Create a new page
- Go to settings and create a new chart page
- Give a name to the page, for example _Prices & Controls_ and make it visible in the sidebar
- Go to the _Code_ tab, copy-paste the example configuration and modify it to your preferences

KUVA

## Page configuration as code

```yaml

```


