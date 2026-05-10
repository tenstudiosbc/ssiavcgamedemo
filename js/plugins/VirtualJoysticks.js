/*:
 * @plugindesc v1.4.1 - Adaptive virtual joystick with Side Selection and Tap-to-Move blocking.
 * @author Claude & Gemini
 *
 * @param Position Settings
 * @text --- Position ---
 *
 * @param joystickSide
 * @parent Position Settings
 * @text Joystick Side
 * @desc Which side of the screen should the joystick appear on?
 * @type select
 * @option Left
 * @value left
 * @option Right
 * @value right
 * @default left
 *
 * @param anchorX
 * @parent Position Settings
 * @text Horizontal Offset
 * @desc Padding from the chosen side (px).
 * @type number
 * @default 120
 *
 * @param anchorY
 * @parent Position Settings
 * @text Vertical Offset
 * @desc Distance from the bottom of the screen (px).
 * @type number
 * @default 120
 *
 * @param Appearance
 * @text --- Appearance ---
 *
 * @param baseRadius
 * @parent Appearance
 * @text Base Radius (px)
 * @type number
 * @default 80
 *
 * @param knobRadius
 * @parent Appearance
 * @text Knob Radius (px)
 * @type number
 * @default 36
 *
 * @param baseColor
 * @parent Appearance
 * @text Base Color (hex)
 * @default 0x000000
 *
 * @param baseAlpha
 * @parent Appearance
 * @text Base Opacity (0–1)
 * @type number
 * @decimals 2
 * @default 0.30
 *
 * @param knobColor
 * @parent Appearance
 * @text Knob Color (hex)
 * @default 0xffffff
 *
 * @param knobAlpha
 * @parent Appearance
 * @text Knob Opacity (0–1)
 * @type number
 * @decimals 2
 * @default 0.75
 *
 * @param diagonalThreshold
 * @parent Appearance
 * @text Diagonal Threshold
 * @desc 0.35 is recommended.
 * @type number
 * @decimals 2
 * @default 0.35
 *
 * @help
 * ============================================================
 * VirtualJoysticks.js
 * ============================================================
 * Adaptive joystick for RPG Maker MV.
 * * FEATURES:
 * - Choose Left or Right side via parameters.
 * - Disables "Tap to Move" automatically when active.
 * - Works alongside ImprovedTouchInput.js.
 */

var Imported = Imported || {};
Imported.VirtualJoysticks = true;

// Create a global state object so other plugins (ImprovedTouchInput) can see it
var _joystick = {
    active: false,
    touchId: -1,
    dx: 0,
    dy: 0,
    ox: 0,
    oy: 0,
    left: false,
    right: false,
    up: false,
    down: false
};

(function () {
    'use strict';

    var params = PluginManager.parameters('VirtualJoysticks');
    var CFG = {
        side: String(params['joystickSide'] || 'left').toLowerCase(),
        anchorX: parseInt(params['anchorX']) || 120,
        anchorY: parseInt(params['anchorY']) || 120,
        baseRadius: parseInt(params['baseRadius']) || 80,
        knobRadius: parseInt(params['knobRadius']) || 36,
        baseColor: parseInt(params['baseColor']) || 0x000000,
        baseAlpha: parseFloat(params['baseAlpha']) || 0.30,
        knobColor: parseInt(params['knobColor']) || 0xffffff,
        knobAlpha: parseFloat(params['knobAlpha']) || 0.75,
        diagThresh: parseFloat(params['diagonalThreshold']) || 0.35
    };

    function isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    function applyState(dir, state) {
        if (_joystick[dir] !== state) {
            _joystick[dir] = state;
            // Safe Input state update with fallback
            if (Input._currentState && typeof Input._currentState === 'object') {
                Input._currentState[dir] = state;
            }
            // Also use Input.gamepadMapper as fallback
            if (Input.keyMapper) {
                // Ensure the key is mapped
                if (!Input.keyMapper[dir]) {
                    // Create a virtual key mapping
                    switch(dir) {
                        case 'left':  Input.keyMapper[37] = 'left'; break;
                        case 'right': Input.keyMapper[39] = 'right'; break;
                        case 'up':    Input.keyMapper[38] = 'up'; break;
                        case 'down':  Input.keyMapper[40] = 'down'; break;
                    }
                }
            }
        }
    }

    function updateDirections(dx, dy) {
        var t = CFG.diagThresh;
        applyState('left', dx < -t);
        applyState('right', dx > t);
        applyState('up', dy < -t);
        applyState('down', dy > t);
    }

    function clearDirections() {
        applyState('left', false);
        applyState('right', false);
        applyState('up', false);
        applyState('down', false);
        _joystick.dx = 0;
        _joystick.dy = 0;
    }

    // ─── Graphics Layer ───
    function VirtualJoystickLayer() {
        this.initialize.apply(this, arguments);
    }

    VirtualJoystickLayer.prototype = Object.create(PIXI.Container.prototype);
    VirtualJoystickLayer.prototype.constructor = VirtualJoystickLayer;

    VirtualJoystickLayer.prototype.initialize = function () {
        PIXI.Container.call(this);
        this._base = new PIXI.Graphics();
        this._knob = new PIXI.Graphics();
        this.addChild(this._base);
        this.addChild(this._knob);
        this._cx = 0;
        this._cy = 0;
        this.visible = true;
        this.alpha = 1.0;
        this._drawBase();
        this._reposition();
    };

    VirtualJoystickLayer.prototype._drawBase = function () {
        this._base.clear();
        this._base.beginFill(CFG.baseColor, CFG.baseAlpha);
        this._base.drawCircle(0, 0, CFG.baseRadius);
        this._base.endFill();
        this._base.lineStyle(2, 0xffffff, 0.3);
        this._base.drawCircle(0, 0, CFG.baseRadius);
    };

    VirtualJoystickLayer.prototype._drawKnob = function (kx, ky) {
        this._knob.clear();
        this._knob.beginFill(CFG.knobColor, CFG.knobAlpha);
        this._knob.drawCircle(kx, ky, CFG.knobRadius);
        this._knob.endFill();
    };

    VirtualJoystickLayer.prototype._reposition = function () {
        var sw = Graphics.boxWidth || Graphics.width || window.innerWidth;
        var sh = Graphics.boxHeight || Graphics.height || window.innerHeight;
        var cx = (CFG.side === 'right') ? (sw - CFG.anchorX) : CFG.anchorX;
        var cy = sh - CFG.anchorY;
        this._base.x = cx;
        this._base.y = cy;
        this._cx = cx;
        this._cy = cy;
    };

    VirtualJoystickLayer.prototype.update = function () {
        this._reposition();
        var maxR = CFG.baseRadius - (CFG.knobRadius / 2);
        var kx = this._cx + (_joystick.active ? _joystick.dx * maxR : 0);
        var ky = this._cy + (_joystick.active ? _joystick.dy * maxR : 0);
        this._drawKnob(kx, ky);
    };

    // ─── Input Handling ───
    function screenToCanvas(pageX, pageY) {
        var canvas = document.getElementById('GameCanvas');
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        return { x: (pageX - rect.left) * scaleX, y: (pageY - rect.top) * scaleY };
    }

    function onTouchStart(e) {
        if (!_joystickLayer || _joystick.active) return;
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            var pos = screenToCanvas(t.pageX, t.pageY);
            var dist = Math.sqrt(Math.pow(pos.x - _joystickLayer._cx, 2) + Math.pow(pos.y - _joystickLayer._cy, 2));
            if (dist < CFG.baseRadius * 1.5) {
                _joystick.active = true;
                _joystick.touchId = t.identifier;
                _joystick.ox = pos.x;
                _joystick.oy = pos.y;
                e.preventDefault();
                break;
            }
        }
    }

    function onTouchMove(e) {
        if (!_joystick.active) return;
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            if (t.identifier !== _joystick.touchId) continue;
            var pos = screenToCanvas(t.pageX, t.pageY);
            var dx = pos.x - _joystick.ox;
            var dy = pos.y - _joystick.oy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var maxR = CFG.baseRadius - (CFG.knobRadius / 2);
            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
                dist = maxR;
            }
            _joystick.dx = dx / maxR;
            _joystick.dy = dy / maxR;
            if (dist / maxR < 0.15) clearDirections();
            else updateDirections(_joystick.dx, _joystick.dy);
            e.preventDefault();
        }
    }

    function onTouchEnd(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === _joystick.touchId) {
                _joystick.active = false;
                _joystick.touchId = -1;
                clearDirections();
            }
        }
    }

    var _joystickLayer = null;
    
    var _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
        _Scene_Map_createDisplayObjects.call(this);
        try {
            _joystickLayer = new VirtualJoystickLayer();
            this.addChild(_joystickLayer);
            _joystickLayer.visible = true;
            var cvs = document.getElementById('GameCanvas');
            if (cvs) {
                cvs.addEventListener('touchstart', onTouchStart, { passive: false });
                cvs.addEventListener('touchmove', onTouchMove, { passive: false });
                cvs.addEventListener('touchend', onTouchEnd);
                cvs.addEventListener('touchcancel', onTouchEnd);
            }
        } catch (e) {
            console.error('VirtualJoysticks.js - Failed to create joystick layer:', e);
        }
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (_joystickLayer) {
            _joystickLayer.visible = true;
            _joystickLayer.update();
        }
    };

    // BLOCK NATIVE MAP TOUCH - Primary method
    var _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function () {
        if (_joystick.active) return; // If joystick is held, do not process pathfinding
        _Scene_Map_processMapTouch.call(this);
    };

    // BLOCK NATIVE TOUCH - Secondary method (catches more cases)
    var _Scene_Map_onMapTouch = Scene_Map.prototype.onMapTouch;
    if (_Scene_Map_onMapTouch) {
        Scene_Map.prototype.onMapTouch = function () {
            if (_joystick.active) return;
            _Scene_Map_onMapTouch.call(this);
        };
    }

    // Block touch input manager if it exists
    if (TouchInput && typeof TouchInput.isTriggered === 'function') {
        var _TouchInput_isTriggered = TouchInput.isTriggered;
        TouchInput.isTriggered = function () {
            if (_joystick.active) return false;
            return _TouchInput_isTriggered.call(this);
        };
    }

    // Clean up on leave
    var _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _Scene_Map_terminate.call(this);
        _joystick.active = false;
        _joystick.touchId = -1;
        clearDirections();
        if (_joystickLayer) {
            _joystickLayer.visible = false;
            _joystickLayer = null;
        }
    };

})();