/**
 * Spot price optimizer, class for cloning control points for tomorrow.
 */
class ControlPointCloner {

  /**
   * Constructor.
   */
  constructor() {
  }

  /**
   * Checks if control points are missing for the provided control item.
   *
   * @param Item controlItem
   * @param ZonedDateTime tomorrowStart
   */
  missingTomorrow(controlItem, tomorrowStart) {
    const tomorrowEnd = tomorrowStart.plusDays(1);
    const expected = time.Duration.between(tomorrowStart, tomorrowEnd).toHours()*4;
    const actual = controlItem.persistence.countBetween(tomorrowStart, tomorrowEnd);
    if (actual < expected) {
      console.log(`control-point-cloner.js: Tomorrow's control points missing for ${controlItem.name}!`);
      return true;
    }
    return false;
  }

  /**
   * Clones the control points 1 day forward.
   *
   * @param Item controlItem
   * @param ZonedDateTime tomorrowStart
   *
   * @return TimeSeries
   */
  getClonedControlPoints(controlItem, todayStart) {
    const tomorrowStart = todayStart.plusDays(1);

    console.log('control-point-cloner.js: Cloning control points for one day onwards.');
    console.log('control-point-cloner.js: Source control points:');
    const source = controlItem.persistence.getAllStatesBetween(todayStart, tomorrowStart);
    console.log(source);

    // Clone the control points.
    const ts = new items.TimeSeries('REPLACE');
    for (let i = 0; i < source.length; i++) {
      let zdt = source[i].timestamp.plusDays(1);
      let value = String(source[i].numericState);
      ts.add(zdt, value);
    }
    console.log('control-point-cloner.js: Cloned control points:');
    console.log(ts);
    return ts;
  }
}

/**
 * Exports.
 */
module.exports = {
  ControlPointCloner
};
