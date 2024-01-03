/**
 * Spot price optimizer, class for reading weather data from FMI API - HARMONIE.
 */
class FMI {

    /**
     * Constructor.
     */
    constructor() {
    }
    
    /**
     * Makes an API call to the Finnish Meteorology Institute.
     *
     * @param string place
     *   Place recoginzed by FMI API.
     *
     * @return string
     *   XML response from FMI API.
     */
    makeApiCall(place) {
	const http = Java.type("org.openhab.core.model.script.actions.HTTP");
	console.log('fmi.js: Making an API call to FMI API...');
	const url = 'http://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::harmonie::surface::point::simple&place=' + place + '&parameters=Temperature,PrecipitationAmount,WindSpeedMS,TotalCloudCover';
	const xml = http.sendHttpGetRequest(url, 10000);
	console.debug('fmi.js: Response from FMI API');
	console.debug(xml);
	return xml;
    }

    /**
     * Parses the forecast from the XML response.
     *
     * @param string xml
     *   FMI response in XML format.
     * @param string parameterName
     *   Parameter name of interest: temperature, PrecipitationAmount, WindSpeedMS, TotalCloudCover
     *
     * @return array
     *   Array of point objects.
     */
    preparePoints(xml, parameterName) {
	console.log('fmi.js: transforming XML to JSON and parsing forecast for ' + parameterName + '...');
	const transformation = Java.type("org.openhab.core.transform.actions.Transformation");
	let points = [];

	// Early exit in case XML is null.
	if (xml == null) {
	    console.error('fmi.js: XML empty, parsing aborted.')
	    return points;
	}
	try {
	    const jsObject = JSON.parse(transformation.transform('XSLT', 'xml2json.xsl', xml));
	    const members = jsObject['wfs:FeatureCollection']['wfs:member'];
	    for (let i = 0; i < members.length; i++) {
		if (members[i]['BsWfs:BsWfsElement']['BsWfs:ParameterName'] == parameterName) {
		    let point = {
			datetime: members[i]['BsWfs:BsWfsElement']['BsWfs:Time'],
			value: members[i]['BsWfs:BsWfsElement']['BsWfs:ParameterValue']
		    };
		    points.push(point);
		}
	    }
	    console.log('fmi.js: ' + parameterName + ' parsed!');
	}
	catch (exception) {
	    console.error('fmi.js: Exception parsing ' + parameterName +': ' + exception.message);
	}

	return points;
    }

    /**
     * Calculates the wind chill factor for the temperature
     *
     * @param array temperaturePoints
     * @param array windspeedPoints
     *
     * @return array
     *   Array of point objects.
     */
    calculateWindChillTempPoints(temperaturePoints, windspeedPoints) {
	console.log('fmi.js: Calculating wind chill factors from the temperature and wind speed...');
	let points = [];
	if (temperaturePoints.length != windspeedPoints.length) {
	    console.log('Different number of temperature and wind speed points!');
	    return points;
	}

	for (let i = 0; i < temperaturePoints.length; i++) {
	    let datetime = temperaturePoints[i].datetime;
	    let temp = temperaturePoints[i].value;
	    let wind_ms = windspeedPoints[i].value;
	    let wind_kmh = 3.6 * wind_ms;

	    // https://en.wikipedia.org/wiki/Wind_chill#North_American_and_United_Kingdom_wind_chill_index
	    let windchill = temp;
	    if (temp < 10 && wind_kmh > 4.8) {
		windchill = 13.12 + 0.6215 * temp - 11.37 * (wind_kmh ** 0.16) + 0.3965 * temp * (wind_kmh ** 0.16);
	    }

	    let point = {
		datetime: datetime,
		value: windchill
	    }
	    points.push(point);
	}

	return points;
    }
}

/**
 * Exports.
 */
module.exports = {
    FMI
}
