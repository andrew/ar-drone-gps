(function(exports) {
    "use strict";

    // lookup-tables
    var BTN = {
        // Face (main) buttons
        FACE_1: 0, FACE_2: 1, FACE_3: 2, FACE_4: 3,

        // Top/bottom shoulder buttons
        LEFT_SHOULDER: 4, RIGHT_SHOULDER: 5,
        LEFT_SHOULDER_BOTTOM: 6, RIGHT_SHOULDER_BOTTOM: 7,

        SELECT: 8, START: 9,

        // Analogue stick-buttons (if depressible)
        LEFT_ANALOGUE_STICK: 10,
        RIGHT_ANALOGUE_STICK: 11,

        // Directional (discrete) pad
        PAD_TOP: 12, PAD_BOTTOM: 13, PAD_LEFT: 14, PAD_RIGHT: 15
    };

    var AXES = {
        LEFT_ANALOGUE_HOR: 0, LEFT_ANALOGUE_VERT: 1,
        RIGHT_ANALOGUE_HOR: 2, RIGHT_ANALOGUE_VERT: 3
    };


    var socket = null;

    /**
     * initializes the gamepad-controls
     *
     * @param websocket the websocket control-events are sent to
     * @param options TODO...
     *     some ideas:
     *       - calibration-data
     *       - handler-callbacks for 'gamepadState'-events
     *       - button-configuration
     */
    exports.initGamepad = function(websocket, options) {
        socket = websocket;

        // kick-off control-loop
        (function __controlLoop() {
            requestAnimationFrame(__controlLoop);

            // TODO: only works in newer versions of chrome, adapt for mozilla-API…
            var gamepad = navigator.webkitGetGamepads()[0];

            // TODO: emit events gamepadConnect/gamepadDisconnect
            if(!gamepad) { return; }

            handleGamepadState(gamepad);
        } ());
    };

    // initialize
    var lastGamepadState = {
        leftX: 0.0, leftY: 0.0,
        btnStart: false, btnStop: false,
        btnTurnCW: false, btnTurnCCW: false,
        btnUp: false, btnDown: false
    };

    var getCalibratedValue = exports.getCalibratedValue || function(axes,idx) { return axes[idx]; };

    function handleGamepadState(gamepad) {
        var leftX, leftY;

        leftX = getCalibratedValue(gamepad.axes, AXES.LEFT_ANALOGUE_HOR);
        leftY = getCalibratedValue(gamepad.axes, AXES.LEFT_ANALOGUE_VERT);

        // this is for better readability only and might be inlined.
        // (I suspect the js-engine will likely inline it anyway).
        var gamepadState = {
            // toFixed(1) to prevent too many useless nav-packets
            leftX: leftX.toFixed(1),
            leftY: leftY.toFixed(1),

            // buttons are converted to boolean for easier handling
            btnStart: (1==gamepad.buttons[BTN.START]),
            btnStop: (1==gamepad.buttons[BTN.SELECT]),
            btnTurnCW: (1==gamepad.buttons[BTN.RIGHT_SHOULDER]),
            btnTurnCCW: (1==gamepad.buttons[BTN.LEFT_SHOULDER]),
            btnDown: (1==gamepad.buttons[BTN.FACE_1]),
            btnUp: (1==gamepad.buttons[BTN.FACE_4]),

            btnFlipFwd: (1==gamepad.buttons[BTN.PAD_TOP]),
            btnFlipBwd: (1==gamepad.buttons[BTN.PAD_BOTTOM]),
            btnFlipLeft: (1==gamepad.buttons[BTN.PAD_LEFT]),
            btnFlipRight: (1==gamepad.buttons[BTN.PAD_RIGHT])
        };

        // ---- logging
        // TODO: emit a gamepadState-event or something
        document.querySelector('.log').innerHTML = JSON.stringify(gamepadState, null, 2);

        // ---- analogue-stick left/right
        var horiz=gamepadState.leftX;
        if(horiz != lastGamepadState.leftX) {
            if(horiz<0) { // negative: left
                socket.emit('control', { action: 'left', speed: -horiz });
            } else if(horiz>0) {
                socket.emit('control', { action: 'right', speed: horiz });
            } else { // == 0
                socket.emit('control', { action: 'left', speed: 0 });
                socket.emit('control', { action: 'right', speed: 0 });
            }
        }

        // ---- analogue-stick up/down
        var leftY=gamepadState.leftY;
        if(leftY != lastGamepadState.leftY) {
            if(leftY<0) { // negative: up
                socket.emit('control', { action: 'front', speed: -leftY });
            } else if(leftY>0) {
                socket.emit('control', { action: 'back', speed: leftY });
            } else { // == 0
                socket.emit('control', { action: 'front', speed: 0 });
                socket.emit('control', { action: 'back', speed: 0 });
            }
        }

        // ---- takeoff/land
        if(gamepadState.btnStart && !lastGamepadState.btnStart) {
            socket.emit('control', { action: 'takeoffOrLand' });
        }

        // ---- stop-button
        if(gamepadState.btnStop && !lastGamepadState.btnStop) {
            socket.emit('control', { action: 'stop' });
        }

        // ---- up/down/cw/ccw buttons (TODO: add accelleration for more fine-grained control)
        var evMap = {
            btnUp: { action: 'up', mode: 'toggleSpeed' },
            btnDown: { action: 'down', mode: 'toggleSpeed' },
            btnTurnCW: { action: 'clockwise', mode: 'toggleSpeed' },
            btnTurnCCW: { action: 'counterClockwise', mode: 'toggleSpeed' },

            btnFlipFwd: { action: 'animate', animation: 'flipAhead', mode: 'trigger' },
            btnFlipBwd: { action: 'animate', animation: 'flipBehind', mode: 'trigger' },
            btnFlipLeft: { action: 'animate', animation: 'flipLeft', mode: 'trigger' },
            btnFlipRight: { action: 'animate', animation: 'flipRight', mode: 'trigger' }
        };

        Object.keys(evMap).forEach(function(btnId) {
            var evData = evMap[btnId],
                curr = gamepadState[btnId],
                last = lastGamepadState[btnId];

            if('toggleSpeed' == evData.mode) {
                if(curr && !last) { // btnPress
                    socket.emit('control', { action: evData.action, speed: 0.5 });
                } else if(!curr && last) { // btnRelease
                    socket.emit('control', { action: evData.action, speed: 0 });
                }
            } else if('trigger' == evData.mode) {
                if(curr && !last) {
                    socket.emit('control', { action: evData.action, animation: evData.animation, duration: 15 });
                }
            }
        });

        lastGamepadState = gamepadState;
    };
} ( (typeof exports === 'undefined')? (this.nodecopterGamepad = this.nodecopterGamepad||{}) : exports) );

// RAF-Polyfill
(function(window) {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}(window||{}));