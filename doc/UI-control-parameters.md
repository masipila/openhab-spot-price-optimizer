# UI example: Control parameters page

The examples included two use cases for `openhab-spot-price-optimizer`:
- [Optimizing the heating of domestic hot water to the cheapes hours](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Boiler-control-points-example.md)
- [Optimizing the heating of the house to avoid morning and evening price peaks](https://github.com/masipila/openhab-spot-price-optimizer/blob/main/doc/Heating-contol-points-example.md)

Both use cases involve _control parameters_ to define how many hours the optimization algorithm will search. This documentation page shows an example user interface which let you to adjust the values of these control parameter Items.

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/86b9c811-7344-4425-83c1-c5d5905d2b0d)

# Create a new page
To create a new page:
- Go to settings and create a new layout page
- Give a name to the page, for example _Control Parameters_ and make it visible in the sidebar
- The openHAB user interface for configuring the page content may feel a bit confusing in the beginning, but we want to create
-- A Block
-- Which will contain a Row
-- Which will contain a Column
-- And the Column will contain a Stepper Card which has the plus and minus buttons to adjust the value of the selected Item

![image](https://github.com/masipila/openhab-spot-price-optimizer/assets/20110757/11bca8c9-0447-4666-bbe5-ef5eaff44821)

## Page configuration as code
If you wish, you can copy-paste the code of the whole page as a code instead of configuring it with the Design editor.

```yaml
config:
  label: Control Parameters
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
                        step: 0.25
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
                        max: 3
                        min: 0
                        step: 0.25
                        title: Mid heating hours
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
                        item: HeatingPeaks
                        max: 5
                        min: 0
                        step: 1
                        title: Number of peaks to block
masonry: null
grid: []
canvas: []
```
