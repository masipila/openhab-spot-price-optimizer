/**
 * Class for calculating tariffs for Caruna.
 */
class CarunaTariffCalculator {

    /**
     * Constructor.
     */
    constructor() {
    }

    /**
     * Returns the Caruna Espoo Season Distribution prices for hours between 'start' and 'stop'.
     *
     * @param Date start
     *   Start time (ensure Date object is a full hour).
     * @param Date stop
     *   Stop time (ensure Date object is a full hour).
     * @param float price1
     *   Price on winter season daytime, in c/kWh
     * @param float price2
     *   Price on all other times, in c/kWh
     * @param float tax
     *   Electricity tax, in c/kWh
     *
     * @return
     *   List of point objects.
     */
    getSeasonDistributionPrices(start, stop, price1, price2, tax) {
	let date = new Date(start);
	let points = [];
	while (date < stop) {
	    let point = {
		datetime: date.toISOString(),
		value: this.calculateDistributionPrice(date, price1, price2, tax)
	    }
	    points.push(point);
	    date.setUTCHours(date.getUTCHours() + 1);	
	}
	return points;
    }

    /**
     * Calculates the distribution price (incl. electricity tax) for given hour.
     *
     * @param Date hour
     *   Hour to calculate the distribution price for (ensure Date object is a full hour).
     * @param float price1
     *   Price on winter season daytime, in c/kWh
     * @param float price2
     *   Price on all other times, in c/kWh
     * @param float tax
     *   Electricity tax, in c/kWh
     *
     * @return float
     *   Distribution price c/kWh at the given time.
     */
    calculateDistributionPrice(hour, price1, price2, tax) {
	console.debug("caruna-tariff-calculator.js: Calculating tariff for hour: " + hour.toString());
	// Get month on local timezone. OFFSET BY ONE: January is 0!
	let month = hour.getMonth();

	// Get day on local timezone. 0 REPRESENTS SUNDAY!
	let day = hour.getDay();

	// Get hour on local timezone.
	let h = hour.getHours();

	// Determine the distribution price and electricity tax.
	let price = price2 + tax; 
	if ( (month > 9 || month < 3) && (day != 0) && (h >= 7 && h < 22) ){
	    price = price1 + tax;
	}
	price = price.toFixed(4);
	return price;
    }

    /**
     * Returns total elecricity prices (spot price + distribution price + electricity tax).
     *
     * @param array spotPrices
     *   Array of datetime-value pairs
     * @param float price1
     *   Price on winter season daytime, in c/kWh
     * @param float price2
     *   Price on all other times, in c/kWh
     * @param float tax
     *   Electricity tax, in c/kWh
     *
     * @return array
     *   Array of datetime-value pairs representing total electricity prices.
     */
    getTotalPrices(spotPrices, price1, price2, tax) {
	let points = [];
	const n = Object.keys(spotPrices).length;
	for (let i = 0; i < n; i++) {
	    let datetime = spotPrices[i].datetime;
	    let spotPrice = spotPrices[i].value;
	    let date = new Date(datetime);
	    let distributionPrice = this.calculateDistributionPrice(date, price1, price2, tax);
	    let totalPrice = parseFloat(spotPrice) + parseFloat(distributionPrice);
	    let point = {
		datetime: datetime,
		value: totalPrice	
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
    CarunaTariffCalculator
}
