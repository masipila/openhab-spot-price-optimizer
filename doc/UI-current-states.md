# UI example: Add current states to the Overview page

The examples included controlling two devices with openHAB:
- Boiler for heating domestic hot water
- Heat pump compressor for heating the house

If you ever need to toggle the devices ON or OFF manually, it's convenient to have an user interface for that. This page shows how to add the toggle switches to the Overview page.

# Edit the Overview page (or create a new page)
- The openHAB user interface for configuring the page content may feel a bit confusing at the beginning, but we want to create
-- A Block
-- Which will contain a Row
-- Which will contain a Column
-- And the Column will contain a Toggle Card which can be used to toggle the associated Item ON or OFF

KUVA

## Page configuration as code
If you wish, you can copy-paste the code of the whole page as a code instead of configuring it with the Design editor.

```yaml
config:
  label: Overview
blocks:
  - component: oh-block
    config:
      title: Current states
    slots:
      default:
        - component: oh-grid-row
          config: {}
          slots:
            default:
              - component: oh-grid-col
                config: {}
                slots:
                  default:
                    - component: oh-toggle-card
                      config:
                        item: BoilerPower
                        title: Boiler
        - component: oh-grid-row
          config: {}
          slots:
            default:
              - component: oh-grid-col
                config: {}
                slots:
                  default:
                    - component: oh-toggle-card
                      config:
                        title: Heat Pump Compressor
                        item: HeatPumpCompressor
masonry: null
grid: null
canvas: null
```


