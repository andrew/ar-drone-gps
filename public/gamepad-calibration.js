/*
 * gamepad-calibration for the nodecopter-gamepad module.
 *
 * calibration is initialized with:
 *
 *     nodecopter.initCalibrators([
 *         { min: -1, max: 1, center: 0 }, // left-x
 *         { min: -1, max: 1, center: 0 }, // left-y
 *         { min: -1, max: 1, center: 0 }, // right-x
 *         { min: -1, max: 1, center: 0 }  // right-y
 *     ]);
 *
 * where min/max/center values are observed values from the gamepad for the maximum values.
 * After initialization, calibrated values can be retrieved with:
 *
 *     var leftX = nodecopter.getCalibratedValue(gamepad.axes, AXES.LEFT_ANALOGUE_HOR);
 *
 * @author Martin Schuhfuss <m.schuhfuss@gmail.com>
 */
(function(exports) {
    "use strict";

    var calibrators = [];

    // creates a calibration-function for each of the calibration-datasets
    exports.initCalibrators = function(calibrationData) {
        return calibrators = calibrationData.map(function(cd) {
            // intercept invalid calibration-data, ensure that `min < center < max`
            if(cd.min >= cd.center) { throw new Error('invalid calibration-data (min >= center)'); }
            if(cd.max <= cd.center) { throw new Error('invalid calibration-data (max <= center)'); }

            var negDelta = Math.abs(cd.center - cd.min),
                posDelta = Math.abs(cd.center - cd.max),
                negScaling = 1/negDelta,
                posScaling = 1/posDelta;

            // the calibration-function calculates calibrated output-values from raw-inputs, clipped to range [-1, 1]
            return function(rawValue) {
                var centerOffset = rawValue - cd.center;

                if(centerOffset < 0) {
                    return Math.max(-1, centerOffset * negScaling);
                } else if(centerOffset > 0) {
                    return Math.min(1, centerOffset * posScaling);
                } else { return 0.0; }
            };
        });
    };

    exports.getCalibratedValue = function(axesData, axisId) {
        var rawValue = axesData[axisId];

        if(!calibrators[axisId]) { return rawValue; }

        return calibrators[axisId](rawValue);
    };
}((typeof exports === 'undefined')? (this.nodecopterGamepad = this.nodecopterGamepad||{}) : exports));