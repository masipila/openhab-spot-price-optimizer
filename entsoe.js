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

    let points = [];
    const response = this.makeApiCall(start, end);
    if (response == null) {
      console.error("entsoe.js: Unexepcted / no response fom Entso-E API!");
      return points;
    }
    points = this.parseResponse(response, tax);
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
    let response = http.sendHttpGetRequest(url, 45000);
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
      console.error("entsoe.js: Error while transforming XML to JSON! Is xml2json.xsl present?");
      console.error(response);
      return prices;
    }

    // API returns an Acknowledgement_MarketDocument when prices are not available.
    if ('Acknowledgement_MarketDocument' in json) {
      try {
        const error_text = json.Acknowledgement_MarketDocument.Reason.text;
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

        // Normalize TimeSeries to be an array if just one is present.
        let timeSeries = this.normalizeArray(json.Publication_MarketDocument.TimeSeries);
        for (let i = 0; i < timeSeries.length; i++) {

          // Normalize Period to be an array if just one is present.
          let periods = this.normalizeArray(timeSeries[i].Period);
          for (let j = 0; j < periods.length; j++) {
            prices = prices.concat(this.parsePeriod(periods[j], tax));
          }
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
   * Normalizes a JSON element to be an array
   *
   * @param element
   *   JSON element which is either an Object or an array.
   * @return array
   *   If the input was an array, return it as such.
   *   If it was an Object, wrap it to an array.
   */
  normalizeArray(element) {
    if (!Array.isArray(element)) {
      element = [element];
    }
    return element;
  }

  /**
   * Parses one TimeSeries.Period element of the response.
   *
   * @param object period
   *   Json object representing the period of one day.
   *
   * @return array
   *   Array of datetime-value pairs representing prices.
   */
  parsePeriod(period, tax) {
    let prices = [];
    let start = time.toZDT(period.timeInterval.start);
    let resolution = time.Duration.parse(period.resolution);
    console.log("entsoe.js: Period start: " + start + ", resolution: " + resolution);

    // Normalize A03 curve document.
    let normalizedPoints = this.normalizeA03Curve(period);

    // Loop through spot prices. Convert EUR / MWh to c / kWh and add tax.
    for (let i = 0; i < normalizedPoints.length; i++) {
      let current = start.plus(resolution.multipliedBy(i));
      let datetime = current.format(time.DateTimeFormatter.ISO_INSTANT);
      let price = normalizedPoints[i]['price.amount'] * tax / 10;
      price = price.toFixed(4);
      let resultPoint = {
        datetime: datetime,
        value: price
      };
      prices.push(resultPoint);
      console.debug('entsoe.js: ' + datetime + ' ' + price + ' c/kWh');

      // If Entso provided data with 60 minute resolution, generate the
      // entries for every 15 minutes.
      if (period.resolution == 'PT60M') {
        for (let j = 1; j < 4; j++) {
          current = current.plus(time.Duration.parse('PT15M'));
          datetime = current.format(time.DateTimeFormatter.ISO_INSTANT);
          resultPoint = {
            datetime: datetime,
            value: price
          };
          prices.push(resultPoint);
          console.debug('entsoe.js: ' + datetime + ' ' + price + ' c/kWh');
        }
      }
    }
    return prices;
  }

  /**
   * Normalizes EntsoeE A03 curve type to an array without gaps.
   *
   * EntsoE A03 curve type contains a Point only if it differs from the
   * previous value. This method prepares a normalized array where a new
   * element is added even if the value has not changed.
   *
   * @see https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/cim_based/Introduction_of_different_Timeseries_possibilities__curvetypes__with_ENTSO-E_electronic_document_v1.4.pdf
   *
   * @param object period
   *   JSON object
   *
   * @return array
   */
  normalizeA03Curve(period) {
    let normalized = [];
    let resolution = time.Duration.parse(period.resolution);

    // Normalize points to an array just in case prices would be same for the entire day.
    let points = this.normalizeArray(period.Point);
    let currentPosition = 0;

    for (let i = 0; i < points.length; i++) {
      let position = points[i].position;
      let delta = position - currentPosition;

      // If position increased by 1, add the element normally.
      if (delta == 1) {
        normalized.push(points[i]);
        currentPosition++;
      }

      // Position increased by more than 1
      else {
        // Repeat the previous element.
        for (let j = 1; j < delta; j++) {
          normalized.push(points[i-1]);
          currentPosition++;
        }
        // And then add the new element.
        normalized.push(points[i]);
        currentPosition++;
      }
    }

    // A03 curve can end "unexpectedly" if the the day ends with same prices.

    // Calculate expected number of position nodes.
    let start = time.toZDT(period.timeInterval.start);
    let end = time.toZDT(period.timeInterval.end);
    let duration = time.Duration.between(start, end);
    let durationSeconds = duration.get(time.ChronoUnit.SECONDS);
    let resolutionSeconds = resolution.get(time.ChronoUnit.SECONDS);
    let expected = durationSeconds/resolutionSeconds;

    // Check if there are "missing" points at the end.
    let missingPoints = expected - normalized.length;
    let lastPoint = points[points.length -1];
    for (let k = 0; k < missingPoints; k++) {
      normalized.push(points[points.length - 1]);
    }

    return normalized;
  }

}

/**
 * Exports.
 */
module.exports = {
  Entsoe
}
