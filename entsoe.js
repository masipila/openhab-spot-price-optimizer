/**
 * Spot price optimizer, class for reading day ahead spot prices from Ensto-E API.
 */
class Entsoe {

    /**
     * Constructor.
     */
    constructor() {
	this.config = require('openhab-spot-price-optimizer/config.js');
	console.debug("entsoe.js: Config parameters for Entso-E API:");
	console.debug(this.config.entsoe);
    }

    /**
     * Reads the spot prices from Entso-E API.
     *
     * @param ZonedDateTime start
     *   Start time for the Entso-E API call.
     * @param ZonedDateTime end
     *   End time for the Entso-E API call.
     * @param float tax
     *   VAT multiplier
     *
     * @return array
     *   Array of point objects.
     */
    getSpotPrices(start, end, tax) {
	// Early exit if API token has not been configured in config.js
	if (this.config.entsoe.token == 'insert-your-token-here') {
	    console.error("entsoe.js: Entso-E API token not configured in config.js!");
	    return null;
	}

	const response = this.makeApiCall(start, end);
	const points = this.parseResponse(response, tax);
	return points;
    }

    /**
     * Makes an API call to Entso-E API to fetch the spot prices.
     *
     * @param ZonedDateTime start
     *   Start time for the Entso-E API call.
     * @param ZonedDateTime end
     *   End time for the Entso-E API call.
     *
     * @return string
     *   XML response from Ensto-E API.
     */
    makeApiCall(start, end) {
	// Spot prices are published from 00:00 to 00:00 on CET/CEST.
	// Calculate the offset between local time zone and CET/CEST.
	const cet = start.withZoneSameLocal(time.ZoneId.of("Europe/Berlin"));
	const offset = time.ChronoUnit.HOURS.between(start, cet);
	const startStr = start.plusHours(offset).format(time.DateTimeFormatter.ISO_INSTANT);
	const endStr = end.plusHours(offset).format(time.DateTimeFormatter.ISO_INSTANT);
	console.log("entsoe.js: Making an API call to Entso-E API for time interval " + startStr + "/" + endStr);

	// Prepare the URL for the API call.
	const url =
	      'https://web-api.tp.entsoe.eu/api?' +
	      'securityToken=' + this.config.entsoe.token +
	      '&documentType=A44' +
	      '&in_Domain=' + this.config.entsoe.zone +
	      '&out_Domain=' + this.config.entsoe.zone +
	      '&TimeInterval=' + startStr + "/" + endStr;
	console.debug("entsoe.js: URL for the API call: " + url);

	const http = Java.type("org.openhab.core.model.script.actions.HTTP");
	let response = http.sendHttpGetRequest(url, 10000);
	console.debug("entsoe.js: Response XML from Entso-E API:");
	console.debug(response);
	return response;
    }

    /**
     * Parses the spot prices from the Entso-E XML response.
     *
     * @param string response
     *   XML response from Entso-E API.
     * @param float tax
     *   Multiplier for VAT.
     *
     * @return array
     *   Array of datetime-value pairs representing spot prices.
     */
    parseResponse(response, tax) {
	console.log('entose.js: transforming XML to JSON and parsing prices...');
	const transformation = Java.type("org.openhab.core.transform.actions.Transformation");
	let prices = [];
	let json = [];

	// Transform the XML response to JSON for easier parsing.
	try {
	    json = JSON.parse(transformation.transform('XSLT', 'xml2json.xsl', response));
	}
	catch (exception) {
	    console.error('entsoe.js: Error while transforming XML to JSON! Is xml2json.xsl present?');
	    console.error(exception);
	    return prices;
	}
    
	// API returns an Acknowledgement_MarketDocument when prices are not available.
	if ('Acknowledgement_MarketDocument' in json) {
	    try {
		const error_text = json['Acknowledgement_MarketDocument']['Reason']['text'];
		console.warn('entsoe.js: ' + error_text);
	    }
	    catch {
		console.error('entsoe.js: Unexpected Acknowledgement_MarketDocument response!');
		console.error(response);
		return prices;
	    }
	}

	// API returns Publication_MarketDocument when prices are available.
	else if ('Publication_MarketDocument' in json) {
	    try {
		// TimeSeries is either an array (multiple days) or an object (single day).
		if (Array.isArray(json['Publication_MarketDocument']['TimeSeries'])) {
		    let n = json['Publication_MarketDocument']['TimeSeries'].length;
		    console.log("entsoe.js: Received time series for " + n + " days.");
		    for (let i = 0; i < n; i++) {
			let timeSeries = json['Publication_MarketDocument']['TimeSeries'][i];
			prices = prices.concat(this.parseTimeSeries(timeSeries, tax));
		    }
		}
		else {
		    let timeSeries = json['Publication_MarketDocument']['TimeSeries'];
		    prices = prices.concat(this.parseTimeSeries(timeSeries, tax));
		}
	    }
	    catch (exception){
		console.error('entsoe.js: Unexpected Publication_MarketDocument response!');
		console.error(response);
		console.error(exception);
	    }
	}

	// API did not return Acknowledgement_MarketDocument or Publication_MarketDocument
	else {
	    console.error('entsoe.js: Unexpected response type!');
	    console.error(response);
	}

	// Rerutrn the spot prices (or empty array)
	return prices;
    }

    /**
     * Parses one TimeSeries element of the response.
     *
     * @param object timeSeries
     *   Json object representing the time series of one day.
     *
     * @return array
     *   Array of datetime-value pairs representing prices.
     */
    parseTimeSeries(timeSeries, tax) {
	let prices = [];
	let start = time.toZDT(timeSeries['Period']['timeInterval']['start']);
	let resolution = time.Duration.parse(timeSeries['Period']['resolution']);
	console.log("entsoe.js: Time series start: " + start + ", resolution: " + resolution);

	// Loop through spot prices. Convert EUR / MWh to c / kWh and add tax.
	let points = timeSeries['Period']['Point'];
	for (let i = 0; i < points.length; i++) {
	    let current = start.plus(resolution.multipliedBy(i));
	    let datetime = current.format(time.DateTimeFormatter.ISO_INSTANT);
	    let price = points[i]['price.amount'] * tax / 10;
	    price = price.toFixed(4);
	    let point = {
		datetime: datetime,
		value: price
	    };
	    prices.push(point);
	    console.debug('entsoe.js: ' + datetime + ' ' + price + ' c/kWh');
	}
	return prices;
    }
}

/**
 * Exports.
 */
module.exports = {
    Entsoe
}
