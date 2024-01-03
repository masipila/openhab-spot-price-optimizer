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
     * @param string start
     *   Start time for the Entso-E API call in format YYYYMMDDHHMM.
     * @param string end
     *   End time for the Entso-E API call in format YYYYMMDDHHMM.
     * @param float tax
     *   VAT multiplier
     *
     * @return array
     *   Array of point objects.
     */
    getSpotPrices(start, end, tax) {
	const priceXml = this.makeApiCall(start, end);
	const points = this.preparePoints(priceXml, tax);
	return points;
    }

    /**
     * Makes an API call to Entso-E API to fetch the spot prices.
     *
     * @param string start
     *   Start time for the Entso-E API call.
     * @param string end
     *   End time for the Entso-E API call.
     *
     * @return string
     *   XML response from Ensto-E API.
     */
    makeApiCall(start, end) {
	const http = Java.type("org.openhab.core.model.script.actions.HTTP");
	console.log('entsoe.js: Making an API call to Entso-E API...');
	const url =
	      'https://web-api.tp.entsoe.eu/api?' +
	      'securityToken=' + this.config.entsoe.token +
	      '&documentType=A44' +
	      '&in_Domain=' + this.config.entsoe.zone +
	      '&out_Domain=' + this.config.entsoe.zone +
	      '&periodStart=' + start +
	      '&periodEnd=' + end;
	console.debug("entsoe.js: URL for the API call: " + url);

	let priceXml = '';
	priceXml = http.sendHttpGetRequest(url, 10000);
	console.debug("entsoe.js: Response XML from Entso-E API:");
	console.debug(priceXml);
	return priceXml;
    }

    /**
     * Parses the spot prices from the Entso-E XML response.
     *
     * @param string priceXml
     *   Entso-E response in XML format.
     * @param float tax
     *   Multiplier for VAT.
     *
     * @return array
     *   Array of point objects. Empty array if spot prices can't be parsed.
     */
    preparePoints(priceXml, tax) {
	console.log('entose.js: transforming XML to JSON and parsing prices...');
	const transformation = Java.type("org.openhab.core.transform.actions.Transformation");
	let parsedPrices = [];
	let prices = [];

	// Transform the XML response to JSON for easier parsing.
	try {
	    prices = JSON.parse(transformation.transform('XSLT', 'xml2json.xsl', priceXml));
	}
	catch (exception) {
	    console.error('entsoe.js: Error while transforming XML to JSON!');
	    console.error(priceXml);
	}
    
	// API returns an Acknowledgement_MarketDocument when prices are not available.
	if ('Acknowledgement_MarketDocument' in prices) {
	    try {
		const error_text = prices['Acknowledgement_MarketDocument']['Reason']['text'];
		console.error('entsoe.js: ' + error_text);
	    }
	    catch {
		console.error('entsoe.js: Unexpected Acknowledgement_MarketDocument response!');
		console.error(priceXml);
	    }
	}

	// API returns Publication_MarketDocument when prices are available.
	else if ('Publication_MarketDocument' in prices) {
	    try {
		// We assume here that multiple days have been requested.
		let days = prices['Publication_MarketDocument']['TimeSeries'].length;
		console.log("entsoe.js: Received time series for " + days + " days.");
		for (let i = 0; i < days; i++) {
		    let startUtc = prices['Publication_MarketDocument']['TimeSeries'][i]['Period']['timeInterval']['start'];
		    console.debug(startUtc);
		    let points = prices['Publication_MarketDocument']['TimeSeries'][i]['Period']['Point'];
		    let n = Object.keys(points).length

		    // Loop through spot prices. Convert EUR / MWh to c / kWh and add tax.
		    for (let j = 0; j < n; j++) {
			let date = new Date(startUtc);
			date.setUTCHours(date.getUTCHours() + j);
			let price = points[j]['price.amount'] * tax / 10;
			price = price.toFixed(4);
			let point = {
			    datetime: date.toISOString(),
			    value: price
			};
			parsedPrices.push(point);
			console.debug('entsoe.js: ' + date.toISOString() + ' ' + price + ' c/kWh');
		    }
		}
	    }
	    catch {
		console.error('entsoe.js: Unexpected Publication_MarketDocument response!');
		console.error(priceXml);
	    }
	}

	// API did not return Acknowledgement_MarketDocument or Publication_MarketDocument
	else {
	    console.error('entsoe.js: Unexpected response type!');
	    console.error(priceXml);
	}

	// Rerutrn the spot prices (or empty array)
	return parsedPrices;
    }
}

/**
 * Exports.
 */
module.exports = {
    Entsoe
}
