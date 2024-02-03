/**
 * Class for calculating distribution prices with Caruna pricing logic.
 */
class TariffCalculator {

    /**
     * Constructor.
     */
    constructor() {
    }

    /**
     * Returns prices for hours between 'start' and 'stop'.
     *
     * @param ZonedDateTime start
     *   Start time (ensure full hour).
     * @param ZonedDateTime stop
     *   Stop time (ensure full hour).
     * @param string product
     *   Distribution product to use: 'night' or 'seasonal'
     * @param object priceParams
     *   Price parameters for given distribution product
     *
     * @return list
     *   List of datetime-value pairs.
     */
    getPrices(start, stop, product, priceParams) {
	console.log("tariff-calculator.js: Calculating distribution prices...");
	let points = [];

	// Early exit for invalid product argument
	const whitelist = ['night', 'seasonal'];
	if (!whitelist.includes(product)) {
	    console.error("tariff-calculator.js: Invalid distribution product " + product);
	    return points;
	}

	let current = start;
	while (current < stop) {
	    let price = null;
	    // Calculate the price using the given distribution product
	    if (product == 'night') {
		price = this.calculatePriceNightDistribution(current, priceParams);
	    }
	    else {
		price = this.calculatePriceSeasonalDistribution(current, priceParams);
	    }
	    
	    let point = {
                datetime: current.format(time.DateTimeFormatter.ISO_INSTANT),
                value: price
	    }
	    points.push(point);
	    current = current.plusHours(1);
	}

	console.debug(JSON.stringify(points));
	return points;
    }

    /**
     * Returns price for given hour using Night Distribution.
     *
     * @param ZonedDateTime zdt
     *   Hour to calculate the tariff for (ensure input is a full hour).
     * @param object priceParams
     *   Object with the following keys: price1, price2, tax
     *
     * @return float
     *   Tariff c/kWh at the given time.
     */
    calculatePriceNightDistribution(zdt, priceParams) {
	console.debug("tariff-calculator.js: Calculating fee for hour: " + zdt.toString());

	// Day
	if (zdt.isBetweenTimes('06:59', '22:00')) {
	    console.debug("tariff-calculator.js: Day");
	    return (priceParams.price1+priceParams.tax).toFixed(2);
	}

	// If we're still here it's night
	console.debug("tariff-calculator.js: Night");
	return (priceParams.price2+priceParams.tax).toFixed(2);
    }

    /**
     * Returns price for given hour using Seasonal Distribution.
     *
     * @param ZonedDateTime zdt
     *   Hour to calculate the tariff for (ensure input is a full hour).
     * @param object priceParams
     *   Object with the following keys: price1, price2, tax
     *
     * @return float
     *   Tariff c/kWh at the given time.
     */
    calculatePriceSeasonalDistribution(zdt, price1, price2, tax) {
	console.debug("tariff-calculator.js: Calculating fee for hour: " + zdt.toString());

	// Summer price
	if (zdt.monthValue() >= 4 && zdt.monthValue <= 10) {
	    console.debug("tariff-calculator.js: Summer");
	    return (priceParams.price2+priceParams.tax).toFixed(2);
	}

	// Winter Sundays
	if (zdt.dayOfWeek() == time.DayOfWeek.SUNDAY) {
	    console.debug("tariff-calculator.js: Sunday");
	    return (priceParams.price2+priceParams.tax).toFixed(2);
	}

	// Winter daytime (except Sundays)
	if (zdt.isBetweenTimes('06:59', '22:00')) {
	    console.debug("tariff-calculator.js: Winter day");
	    return (priceParams.price1+priceParams.tax).toFixed(2);
	}

	// If we're still here it's winter night time
	console.debug("tariff-calculator.js: Winter night");
	return (priceParams.price2+priceParams.tax).toFixed(2);
    }

    /**
     * Returns total elecricity prices by summing spot prices and distribution prices.
     *
     * @param list spotPrices
     *   List of datetime-value pairs
     * @param list distributionPrices
     *   List of datetime-value pairs
     *
     * @return list
     *   List of datetime-value pairs representing total electricity prices.
     */
    getTotalPrices(spotPrices, distributionPrices) {
	console.debug("tariff-calculator.js: Calculating total price...");
	// Early exit if prices are not available.
	if (!spotPrices || !distributionPrices || spotPrices.length < 1 || distributionPrices.length < 1) {
	    console.error("tariff-calculator.js: No spot / distribution prices available, aborting total price calculation!");
	    return null;
	}
		    
	let points = [];
	for (let i = 0; i < spotPrices.length; i++) {
	    let datetime = spotPrices[i].datetime;
	    let spotPrice = spotPrices[i].value;
	    let distributionPrice = distributionPrices.find(x => x.datetime === datetime).value;
	    if (spotPrice && distributionPrice) {
		let point = {
		    datetime: datetime,
		    value: parseFloat(spotPrice) + parseFloat(distributionPrice)
		}
		points.push(point);
	    }
	}
	console.debug(JSON.stringify(points));
	return points;
    }
}

/**
 * Exports.
 */
module.exports = {
    TariffCalculator
}
