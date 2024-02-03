/**
 * Spot price optimizer, class for cloning control points for tomorrow if spot prices are not available.
 */
class ControlPointCloner {

    /**
     * Constructor.
     */
    constructor() {
    }

    /**
     * Adjusts the datetimes of the given control points 1 day forward.
     *
     * @param array points
     *   Array of control points as datetime-value pairs.
     *
     * @return array
     *   Same control points with datetimes adjusted 1 day forward.
     */
    getClonedControlPoints(points) {
	console.log('control-point-cloner.js: Cloning control points for tomorrow');
	console.log('control-point-cloner.js: Source control points');
	console.log(JSON.stringify(points));
	for (let i=0; i < points.length; i++) {
	    let zdt = time.toZDT(points[i]['datetime']);
	    points[i]['datetime'] = zdt.plusDays(1).format(time.DateTimeFormatter.ISO_INSTANT);
	}
	console.log('control-point-cloner.js: Control points after adjustment');
	console.log(JSON.stringify(points));
	return points;
    }
}

/**
 * Exports.
 */
module.exports = {
    ControlPointCloner
};
