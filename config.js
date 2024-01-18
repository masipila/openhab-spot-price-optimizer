/**
 * Confirugration parameters for Spot price optimzer.
 */
var config = {
    // Insert your influx2 database connectoion parameters here.
    influx: {
	baseUrl: 'http://address-of-your-server:8086/api/v2/',
	org: 'openhab',
	bucket: 'autogen',
	token: 'insert-your-token-here'
    },
    // Insert your bidding zone and API token here.
    entsoe: {
	zone: '10YFI-1--------U',
	token: 'insert-your-token-here'
    }
}

/**
 * Exports
 */
module.exports = config;
