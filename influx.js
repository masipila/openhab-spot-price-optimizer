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
     * @param Date start
     *   Pass current full hour as a Date object.
     *
     * @return int
     *   Returns 1 or 0. If no control is found, defaults to 1.
     */
    getCurrentControl(measurement, start) {
	console.log('influx.js: Getting the current control value for ' + measurement + '...');

	let stop = new Date(start.getTime());
	stop.setHours(stop.getHours() + 1);
	let points = this.getPoints(measurement, start, stop);
	if (points && points.length) {
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
     * Returns points of given measurements from given range from the database.
     *
     * @param string measurement
     *   Name of the Influx measurement.
     * @param Date start
     *   Start of the range as a Date object.
     * @param Date stop
     *   Stop of the range as a Date object.
     *
     * @return array
     *   Array of datetime-value pairs for given measurement.
     */
    getPoints(measurement, start, stop) {
	// Early exit if connection parameters have not been configured in config.js
	if (this.config.influx.token == 'insert-your-token-here') {
	    console.error("influx.js: Influx API token not configured in config.js!");
	    return null;
	}

	const http = Java.type("org.openhab.core.model.script.actions.HTTP");
	const url = this.config.influx.baseUrl + 'query?' + 'org=' + this.config.influx.org + '&bucket=' + this.config.influx.bucket;
	console.debug('influx.js: URL:' + url);
	const headers = {
	    'Authorization': 'Token ' + this.config.influx.token,
	    'Content-Type': 'application/vnd.flux'
	};
	const fluxQuery = 'from(bucket: \"' + this.config.influx.bucket + '\") ' +
              '|> range(start: ' + start.toISOString() + ', stop: ' + stop.toISOString() + ') ' +
              '|> filter(fn: (r) => r[\"_measurement\"] == \"' + measurement + '\") ' +
              '|> filter(fn: (r) => not exists r["item"])';
	console.debug('influx.js: ' + fluxQuery);
	let response = '';
	try {
	    response = http.sendHttpPostRequest(url, 'application/json', fluxQuery, headers, 5000);
	    // console.debug('influx.js: Points read from the database.');
	}
	catch (exception) {
	    console.error('influx.js: Exception reading points from the database: ' + exception.message);
	}
	let points = this.parseCSV(response, 5, 6);
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
	    let point = {
		datetime: cols[colDatetime],
		value: parseFloat(cols[colValue])
	    }
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
     *
     * @return bool
     */
    writePoints(measurement, points) {
	// Early exit if connection parameters have not been configured in config.js
	if (this.config.influx.token == 'insert-your-token-here') {
	    console.error("influx.js: Influx API token not configured in config.js!");
	    return false;
	}

	// Early exit if points are null
	if (points == null) {
	    console.error("influx.js: Unable to write points for measurement " + measurement + ", empty points received as input!");
	    return false;
	}

	const n = Object.keys(points).length;
	console.log('influx.js: Preparing to write ' + n + ' points to the database for ' + measurement);
	const http = Java.type("org.openhab.core.model.script.actions.HTTP");
	const url = this.config.influx.baseUrl + 'write?' + 'org=' + this.config.influx.org + '&bucket=' + this.config.influx.bucket + '&precision=ms';
	const headers = {
	    Authorization: 'Token ' + this.config.influx.token
	};

	let response = false;
	try {
	    for (let i = 0; i < n; i++) {
		let value = points[i].value;
		let datetime = points[i].datetime;
		let timestamp = new Date(datetime).getTime();
		let data = measurement + ' value=' + value + ' ' + timestamp;
		//console.debug('influx.js: ' + data);
		try {
		    http.sendHttpPostRequest(url, 'application/json', data, headers, 5000);
		}
		catch (exception) {
		    console.error('influx.js: Post request to Influx DB HTTP API failed!');
		    console.error(exception.message);
		}
	    }
	    response = true;
	    console.log('influx.js: Points successfully saved for measurement ' + measurement);
	}
	catch (exception) {
	    console.error('influx.js: Exception saving points for measurement ' + measurement + ': ' + exception.message);
	}
	return response;
    }

    /**
     * Deletes previously saved points for given measurement and given range.
     *
     * @param string measurement
     *   Name of the Influx measurement.
     * @param string start
     *   Start datetime of the range in ISO8601 format, e.g. 2022-06-27T00:00:00.000Z
     * @param string stop
     *   Stop datetime of the range in ISO8601 format, e.g. 2022-06-28T00:00:00.000Z
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
	    start: start,
	    stop: stop,
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
