/**
 * Spot price optimizer, class for reading, writing and deleting data via InfluxDB API.
 */
class Influx {

  /**
   * Constructor.
   */
  constructor() {
    this.config = require('openhab-spot-price-optimizer/config.js');
  }

  /**
   * Returns current control value for the given measurement and hour.
   *
   * @param string measurement
   *   Name of the Influx measurement.
   * @param string resolutionString
   *   Resolution of the time series data, e.g. 'PT15M'
   *
   * @return int
   *   If no control is found, defaults to 1 as a failsafe.
   */
  getCurrentControl(measurement, resolutionString='PT15M') {
    console.log('influx.js: Getting the current control value for ' + measurement + '...');
    const resolution = time.Duration.parse(resolutionString);
    const start = this.getCurrentTimeRoundedDown(resolution);
    const stop = start.plus(resolution);

    let points = this.getPoints(measurement, start, stop);
    if (points && points.length > 0) {
      const control = points[0].value;
      console.log('influx.js: Current control for ' + measurement + ': ' + control);
      return control;
    }
    else {
      console.error('influx.js: Current control not found for ' + measurement + ', defaulting to 1!');
      return 1;
    }
  }

  /**
   * Returns the current time, rounded down to the previous quarter / full hour.
   *
   * @param Duration resolution
   *   Resolution of the time series.
   *
   * @return ZonedDateTime
   */
  getCurrentTimeRoundedDown(resolution) {
    const now = time.toZDT().withSecond(0).withNano(0);
    const fullHour = time.toZDT().withMinute(0).withSecond(0).withNano(0);
    const diffSeconds = time.ChronoUnit.SECONDS.between(fullHour, now);
    const resolutionSeconds = resolution.get(time.ChronoUnit.SECONDS);
    const n = Math.floor(diffSeconds / resolutionSeconds);
    const result = fullHour.plus(resolution.multipliedBy(n));
    return result;
  }

  /**
   * Returns points of given measurements from given range from the database.
   *
   * @param string measurement
   *   Name of the Influx measurement.
   * @param ZonedDateTime start
   *   Start of the range.
   * @param ZonedDateTime stop
   *   Stop of the range.
   *
   * @return array
   *   Array of datetime-value pairs for given measurement.
   */
  getPoints(measurement, start, stop, moving_average = 0) {
    // Early exit if connection parameters have not been configured in config.js
    if (this.config.influx.token == 'insert-your-token-here') {
      console.error("influx.js: Influx API token not configured in config.js!");
      return null;
    }

    const http = Java.type("org.openhab.core.model.script.actions.HTTP");
    const startStr = start.format(time.DateTimeFormatter.ISO_INSTANT);
    const stopStr = stop.format(time.DateTimeFormatter.ISO_INSTANT);

    const headers = {
      'Authorization': 'Token ' + this.config.influx.token,
      'Content-Type': 'application/vnd.flux'
    };

    const url = this.config.influx.baseUrl + 'query?' + 'org=' + this.config.influx.org + '&bucket=' + this.config.influx.bucket;
    const fluxQuery = 'from(bucket: \"' + this.config.influx.bucket + '\") ' +
      '|> range(start: ' + startStr + ', stop: ' + stopStr + ') ' +
      '|> filter(fn: (r) => r[\"_measurement\"] == \"' + measurement + '\") ' +
      '|> filter(fn: (r) => not exists r["item"])';
    console.debug('influx.js: URL: ' + url);
    console.debug('influx.js: Flux query: ' + fluxQuery);

    let response = '';
    let points = [];

    response = http.sendHttpPostRequest(url, 'application/json', fluxQuery, headers, 5000);
    if (response != null) {
      points = this.parseCSV(response, 5, 6);
    }
    else {
      console.error('influx.js: Exception reading points for ' + measurement + ' from the database!');
    }

    return points;
  }

  /**
   * Parses the timestamps and values from the CSV response.
   *
   * @param string csv
   *   CSV response from Influx.
   * @param int colTimestamp
   *   Column index for the timestamp.
   * @param colValue
   *   Column index for the value.
   *
   * @return array
   *   Array of point objects.
   */
  parseCSV(csv, colDatetime, colValue) {
    let results = [];
    const rows = csv.split('\n');
    const n = rows.length;

    // Ignore the header row and last empty rows.
    for (let i = 1; i < n-2; i++) {
      // console.debug('influx.js: ' + rows[i]);
      let row = rows[i];
      let cols = row.split(',');
      // Ensure datetime string is formatted consistently.
      let zdt = time.toZDT(cols[colDatetime]);
      let point = {
        datetime: zdt.format(time.DateTimeFormatter.ISO_INSTANT),
        value: parseFloat(cols[colValue])
      };
      results.push(point);
    }
    if (results.length == 0) {
      console.warn('influx.js: query did not return any data!');
    }
    return results;
  }

  /**
   * Writes points to the database.
   *
   * @param string measurement
   *   Name of the Influx measurement.
   * @param array points
   *   Array of timestamp-value objects.
   */
  writePoints(measurement, points) {
    // Early exit if connection parameters have not been configured in config.js
    if (this.config.influx.token == 'insert-your-token-here') {
      console.error("influx.js: Influx API token not configured in config.js!");
      return null;
    }

    // Early exit if points are null
    if (points == null) {
      console.error("influx.js: Unable to write points for measurement " + measurement + ", empty points received as input!");
      return null;
    }

    const http = Java.type("org.openhab.core.model.script.actions.HTTP");
    const n = points.length;
    const url = this.config.influx.baseUrl + 'write?' + 'org=' + this.config.influx.org + '&bucket=' + this.config.influx.bucket + '&precision=s';
    const headers = {
      Authorization: 'Token ' + this.config.influx.token
    };
    console.log('influx.js: Preparing to write ' + n + ' points to the database for ' + measurement);

    try {
      for (let i = 0; i < n; i++) {
        // Bail out if we don't have expected data
        if (points[i].value === undefined || points[i].datetime === undefined) {
          console.error("influx.js: Unexpected input at position " + i);
          continue;
        }
        let value = points[i].value;
        let datetime = points[i].datetime;
        let timestamp = time.toZDT(datetime).toEpochSecond();
        let data = measurement + ' value=' + value + ' ' + timestamp;
        console.debug('influx.js: ' + data);
        http.sendHttpPostRequest(url, 'application/json', data, headers, 5000);
      }
    }
    catch (exception) {
      console.error('influx.js: Exception saving points for measurement ' + measurement);
      console.error(exception.message);
    }
  }

  /**
   * Deletes previously saved points for given measurement and given range.
   *
   * @param string measurement
   *   Name of the Influx measurement.
   * @param ZonedDateTime start
   *   Start datetime of the range as ZonedDateTime object
   * @param ZonedDateTime stop
   *   Stop datetime of the range as ZonedDateTime object
   */
  deletePoints(measurement, start, stop) {
    // Early exit if connection parameters have not been configured in config.js
    if (this.config.influx.token == 'insert-your-token-here') {
      console.error("influx.js: Influx API token not configured in config.js!");
      return null;
    }

    const http = Java.type("org.openhab.core.model.script.actions.HTTP");
    const url = this.config.influx.baseUrl + 'delete?' + 'org=' + this.config.influx.org + '&bucket=' + this.config.influx.bucket;
    const headers = {
      Authorization: 'Token ' + this.config.influx.token
    };

    const deleteFlux = {
      start: start.format(time.DateTimeFormatter.ISO_INSTANT),
      stop: stop.format(time.DateTimeFormatter.ISO_INSTANT),
      predicate: '_measurement="' + measurement + '"'
    };

    try {
      http.sendHttpPostRequest(url, 'application/json', JSON.stringify(deleteFlux), headers, 5000);
      console.log('influx.js: Points successfully deleted. Measurement: ' + measurement + '. Range: ' + start + ' - ' + stop);
    }
    catch (exception) {
      console.error('influx.js: Exception deleting points. Measurement: ' + measurement + '. Range: ' + start + ' - ' + stop + '. Exception: ' + exception.message);
    }
  }

}

/**
 * Exports.
 */
module.exports = {
  Influx
}
