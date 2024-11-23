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
      console.warn(`control-point-cloner.js: Tomorrow's control points missing for ${controlItem.name}!`);
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
    console.log('control-point-cloner.js: Cloning control points for one day onwards.');

    const ts = new items.TimeSeries('REPLACE');
    const tomorrowStart = todayStart.plusDays(1);
    const source = controlItem.persistence.getAllStatesBetween(todayStart, tomorrowStart);

    // Early exit if source controls are missing.
    if (source.length < 1) {
      console.warn('control-point-cloner.js: Source controls are missing as well, nothing to clone!');
      return ts;
    }

    // Clone the control points.
    console.log('control-point-cloner.js: Source control points:');
    console.log(source);

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
