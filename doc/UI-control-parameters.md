# UI example: Control parameters page

The examples included two use cases for `openhab-spot-price-optimizer`:
- Optimizing the heating of domestic hot water to the cheapes hours
- Optimizing the heating of the house to avoid morning and evening price peaks

Both use cases involve control parameters to indicate how many hours the optimization algorithm will search. This documentation page shows an example user interface which let you to adjust the values of these control parameter Items.

KUVA

# Create a new page
- Go to settings and create a new layout page
- Give a name to the page, for example _Control Parameters_ and make it visible in the sidebar
- The openHAB user interface for configuring the page content may feel a bit confusing at the beginning, but we want to create
-- A Block
-- Which will contain a Row
-- Which will contain a Column
-- And the Column will contain a Stepper Card which has the plus and minus buttons to adjust the value of the selected Item

KUVA

## Page configuration as code
If you wish, you can copy-paste the code of the whole page as a code instead of configuring it with the Design editor.

```
config:
  label: Control parameters
  sidebar: true
blocks:
  - component: oh-block
    config:
      title: Boiler & Domestic Hot Water
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
                    - component: oh-stepper-card
                      config:
                        item: BoilerHours
                        max: 24
                        min: 0
                        title: Boiler hours
  - component: oh-block
    config:
      title: Heating
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
                    - component: oh-stepper-card
                      config:
                        item: HeatingHours
                        max: 24
                        min: 0
                        title: Heating hours
        - component: oh-grid-row
          config: {}
          slots:
            default:
              - component: oh-grid-col
                config: {}
                slots:
                  default:
                    - component: oh-stepper-card
                      config:
                        item: MidHeatingHours
                        max: 24
                        min: 0
                        title: Mid heating hours
masonry: null
grid: []
canvas: []
```


