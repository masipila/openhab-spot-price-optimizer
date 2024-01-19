# UI example: Chart with spot prices, temperature and control points

The examples included two use cases for `openhab-spot-price-optimizer`:
- [Optimizing the heating of domestic hot water to the cheapes hours](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Boiler-control-points-example.md)
- [Optimizing the heating of the house to avoid morning and evening price peaks](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Heating-contol-points-example.md)

All use cases involve _control points_ for each hour. These control points will drive the state changes of the devices i.e. when they will be ON/OFF. This documentation page shows an example openHAB Chart configuration for rendering the spot prices, forecasted temperature and control points.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/0069a39b-11b1-456d-9066-816ebb557f9d)

[openHAB Charts](https://www.openhab.org/docs/ui/chart-pages.html) use [Apache ECharts](https://echarts.apache.org/en/cheat-sheet.html) under the hood. The simplest openHAB charts can be configured with the design editor, but advanced chart configurations can only be done by modifying the chart configuration as YAML code. 

# Create a new page
- Go to settings and create a new chart page
- Give a name to the page, for example _Prices & Controls_ and make it visible in the sidebar
- Go to the _Code_ tab, copy-paste the example configuration and modify it to your preferences

## Page configuration as code

```yaml
config:
  chartType: day
  label: Prices & Controls
  order: "-15"
  sidebar: true
slots:
  grid:
    - component: oh-chart-grid
      config: {}
  legend:
    - component: oh-chart-legend
      config:
        orient: horizontal
        show: true
  series:
    - component: oh-time-series
      config:
        areaStyle:
          opacity: "0.4"
        gridIndex: 0
        item: SpotPrice
        markLine:
          data:
            - label:
                distance: -150
              name: Avg
              type: average
        name: Spot Price
        step: middle
        type: line
        xAxisIndex: 0
        yAxisIndex: 0
    - component: oh-time-series
      config:
        gridIndex: 0
        item: FMIForecastTemperature
        markLine:
          data:
            - label:
                distance: -75
              name: Avg
              type: average
        name: Temperature
        type: line
        xAxisIndex: 0
        yAxisIndex: 1
    - component: oh-time-series
      config:
        gridIndex: 0
        item: HeatPumpCompressorControl
        name: Heat Pump Compressor
        service: influxdb
        stack: control-points
        type: bar
        xAxisIndex: 0
        yAxisIndex: 2
    - component: oh-time-series
      config:
        gridIndex: 0
        item: BoilerControl
        name: Boiler
        service: influxdb
        stack: control-points
        type: bar
        xAxisIndex: 0
        yAxisIndex: 2
  tooltip:
    - component: oh-chart-tooltip
      config:
        orient: horizontal
        show: true
  xAxis:
    - component: oh-time-axis
      config:
        gridIndex: 0
  yAxis:
    - component: oh-value-axis
      config:
        gridIndex: 0
        name: c/kWh
    - component: oh-value-axis
      config:
        gridIndex: 0
        splitLine:
          show: false
        name: ° C
    - component: oh-value-axis
      config:
        gridIndex: 0
        max: "5"
        min: "0"
        show: false
        splitLine:
          show: false
```

Notes about the chart configuration:
- The chart has three Y-axis:
  - Y0 is the left Y-axis (c/kWh) with automatic scale. The SpotPrice time series uses this Y-axis.
  - Y1 is the right Y-axis (°C) with automatic scale. The FMIForecastTemperature time series uses this Y-axis.
  - Y2 is an invisible Y-axis. This has a fixed scale from 0-5. The control point time series use this Y-axis.
- SpotPrices time series
  - This time series uses a `middle step` line chart with a 40% transparent area.
  - The daily average price is shown as a `markLine`. The mark line label is adjusted -150 to the left so that it does not collide with the right Y-axis.
  - These Apache ECharts properties are not editable in the openHAB designer UI, but they can be applied by editing the time series YAML code.
- FMIForecastTemperature time series
  - This is a normal line chart
  - The daily average temperature is displayed as a `markLine`. The mark line label is adjusted -75 to the left so that it does not collide with the right Y-axis or the daily spot price average label.
- Control points are stacked bar charts
  - The stack identified is called `control-points`
  - The stacking property is not editable in openHAB designer UI, but it can be applied by editing the time series YAML code.
