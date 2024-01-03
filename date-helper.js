/**
 * Spot price optimizer, helper class with various date helper methods.
 */
class DateHelper {

    /**
     * Constructor.
     */
     constructor() {
     }

    /**
     * Returns the periodStart datetime for Entso API request.
     *
     * Entso-E API takes the input arguments in CET/CEST. We use yesterday 00:00
     * as the periodStart to ensure that we always get prices, even if the script is
     * executed before the new day-ahead prices have been published.
     *
     * @return string
     *   Start datetime for the API call in format YYYYMMDD0000.
     */
    getEntsoStart() {
	let date = new Date();
	date.setDate(date.getDate() - 1);
	return date.toLocaleDateString('en-GB').replaceAll('-','') + '0000';
    }

    /**
     * Returns the periodEnd for Entso API request.
     *
     * Entso-E API takes the input arguments in CET/CEST. We use tomorrow 23:00
     * as the period end.
     *
     * @return string
     *   End datetime for the API call in in format YYYYMMDD2300.
     */
    getEntsoEnd() {
	let date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toLocaleDateString('en-GB').replaceAll('-','') + '2300';
    }

    /**
     * Returns current hour.
     *
     * @return Date
     *   Current date with minutes, seconds and milliseconds set to 0.
     */
    getCurrentHour() {
	let date = new Date();
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date;
    }

    /**
     * Returns the start/stop midnight.
     *
     * Nordpool publishes the day ahead prices at 12:45 CET/CEST = 13:45 EET/EEST. If the script is
     * executed at 14:00 or later (local time), 'start' midnight will be tomorrow 00:00 local time.
     * Otherwise 'start' midnight will be today 00:00 local time.
     *
     * Stop midnight: 24 hours afer the start midnight.
     *
     * @param string type
     *   'start' or 'stop.
     *
     * @return Date
     */
    getMidnight(type) {
	let date = new Date();
	if (date.getHours() >= 14) {
	    date.setDate(date.getDate() + 1);
	}
	// Set time to 00:00:00.000
	date.setHours(0);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);

	if (type == 'stop') {
	    date.setDate(date.getDate() + 1);
	}

	return date;
    }

    /**
     * Returns the start time of the analyzing period.
     *
     * Nordpool publishes the day ahead prices at 12:45 CET/CEST = 13:45 EET/EEST. If the script is
     * executed at 14:00 or later (local time), 'start' will be today at given hour local time.
     * Otherwise 'start' will be yesterday at given hour local time.
     *
     * @param int hour
     *
     * @return Date
     */
    getStart(hour) {
	let date = new Date();
	if (date.getHours() < 14) {
	    date.setDate(date.getDate() - 1);
	}
	// Set minutes, seconds and milliseconds to zero.
	date.setHours(hour);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date;
    }

    /**
     * Returns the stop time of the analyzing period.
     *
     * Nordpool publishes the day ahead prices at 12:45 CET/CEST = 13:45 EET/EEST. If the script is
     * executed at 14:00 or later (local time), 'stop' will be tomorrow at given hour local time.
     * Otherwise 'stop' will be today at given hour local time.
     *
     * @param int hour
     *
     * @return Date
     */
    getStop(hour) {
	let date = new Date();
	if (date.getHours() >= 14) {
	    date.setDate(date.getDate() + 1);
	}
	// Set minutes, seconds and milliseconds to zero.
	date.setHours(hour);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date;
    }

    /**
     * Returns a Date object which is n hours after given start date.
     *
     * @param Date start
     * @param int hours
     *
     * @return Date
     */
    plusHours(start, hours) {
	let date = new Date(start);
	date.setHours(date.getHours() + hours);
	return date;
    }

    /**
     * Returns a Date object which is n hours before given start date.
     *
     * @param Date start
     * @param int hours
     *
     * @return Date
     */
    minusHours(start, hours) {
	let date = new Date(start);
	date.setHours(date.getHours() - hours);
	return date;
    }
}

/**
 * Exports.
 */
module.exports = {
    DateHelper
}
