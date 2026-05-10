//=============================================================================
// ImprovedTouchInput.js
//=============================================================================

/*:
 * @plugindesc v1.2 Overhauls touch input. Compatible with VirtualJoysticks.js side selection.
 * @author Gemini
 *
 * @param Tap Tolerance
 * @desc Maximum distance (px) the pointer moves to stay a "tap".
 * @default 15
 * @type number
 *
 * @param Swipe Threshold
 * @desc Minimum distance (px) required to trigger a swipe.
 * @default 40
 * @type number
 *
 * @param Swipe Time Limit
 * @desc Maximum frames to complete a swipe.
 * @default 25
 * @type number
 *
 * @param Menu Swipe Navigation
 * @desc Automatically map swipes to Arrow Keys in menus?
 * @default true
 * @type boolean
 *
 * @param Enable Two-Finger Cancel
 * @desc Two-finger tap = Cancel/Menu.
 * @default true
 * @type boolean
 * * @help
 * This plugin improves touch handling and works with VirtualJoysticks.js.
 * It prevents "ghost clicks" and ensures the joystick has priority.
 */

(function() {
    var parameters = PluginManager.parameters('ImprovedTouchInput');
    var TapTolerance = Number(parameters['Tap Tolerance'] || 15);
    var SwipeThreshold = Number(parameters['Swipe Threshold'] || 40);
    var SwipeTimeLimit = Number(parameters['Swipe Time Limit'] || 25);
    var MenuSwipe = String(parameters['Menu Swipe Navigation']) !== 'false';
    var EnableTwoFingerCancel = String(parameters['Enable Two-Finger Cancel']) !== 'false';

    //=============================================================================
    // Compatibility Logic with VirtualJoysticks.js
    //=============================================================================
    var isJoystickActive = function() {
        // Checks the global state object defined in VirtualJoysticks.js
        return (typeof _joystick !== 'undefined' && _joystick.active);
    };

    var _TouchInput_clear = TouchInput.clear;
    TouchInput.clear = function() {
        _TouchInput_clear.call(this);
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchTime = 0;
        this._isDragging = false;
        this._swipeUp = false;
        this._swipeDown = false;
        this._swipeLeft = false;
        this._swipeRight = false;
    };

    var _TouchInput_update = TouchInput.update;
    TouchInput.update = function() {
        _TouchInput_update.call(this);
        
        // Reset swipes every frame
        this._swipeUp = false;
        this._swipeDown = false;
        this._swipeLeft = false;
        this._swipeRight = false;

        if (this._mousePressed || this._screenPressed) {
            this._touchTime++;
        } else {
            this._touchTime = 0;
        }

        // Apply swipe navigation for Menus (Non-Map Scenes)
        if (MenuSwipe && SceneManager._scene && !(SceneManager._scene instanceof Scene_Map)) {
            if (this._swipeUp)    Input._currentState['up'] = true;
            if (this._swipeDown)  Input._currentState['down'] = true;
            if (this._swipeLeft)  Input._currentState['left'] = true;
            if (this._swipeRight) Input._currentState['right'] = true;
        }
    };

    // Ignore input if joystick is currently being held
    var _TouchInput_onTouchStart = TouchInput._onTouchStart;
    TouchInput._onTouchStart = function(event) {
        if (isJoystickActive()) return; 
        
        _TouchInput_onTouchStart.call(this, event);
        
        if (this._screenPressed) {
            var touch = event.touches[0];
            this._touchStartX = Graphics.pageToCanvasX(touch.pageX);
            this._touchStartY = Graphics.pageToCanvasY(touch.pageY);
            this._isDragging = false;
        }
        
        // Two-finger tap for Cancel/Menu
        if (EnableTwoFingerCancel && event.touches.length >= 2) {
            Input._currentState['escape'] = true;
            // Clear destination to prevent walking when opening menu
            if ($gameTemp) $gameTemp.clearDestination();
        }
    };

    var _TouchInput_onTouchMove = TouchInput._onTouchMove;
    TouchInput._onTouchMove = function(event) {
        if (isJoystickActive()) return;
        
        _TouchInput_onTouchMove.call(this, event);
        
        if (this._screenPressed) {
            var touch = event.touches[0];
            var dx = Math.abs(Graphics.pageToCanvasX(touch.pageX) - this._touchStartX);
            var dy = Math.abs(Graphics.pageToCanvasY(touch.pageY) - this._touchStartY);
            if (dx > TapTolerance || dy > TapTolerance) {
                this._isDragging = true;
            }
        }
    };

    var _TouchInput_onTouchEnd = TouchInput._onTouchEnd;
    TouchInput._onTouchEnd = function(event) {
        // If the joystick was active, we just clean up the state without triggering clicks
        if (isJoystickActive()) {
            this._screenPressed = false;
            return;
        }
        
        if (this._screenPressed && event.touches.length === 0) {
            var touch = event.changedTouches[0];
            var x = Graphics.pageToCanvasX(touch.pageX);
            var y = Graphics.pageToCanvasY(touch.pageY);
            this._checkSwipe(x, y);
        }
        _TouchInput_onTouchEnd.call(this, event);
        
        // Clean up escape state
        Input._currentState['escape'] = false;
    };

    TouchInput._checkSwipe = function(endX, endY) {
        if (this._touchTime > SwipeTimeLimit || !this._isDragging) return;

        var dx = endX - this._touchStartX;
        var dy = endY - this._touchStartY;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);

        if (absDx >= SwipeThreshold || absDy >= SwipeThreshold) {
            if (absDx > absDy) {
                if (dx > 0) this._swipeRight = true;
                else this._swipeLeft = true;
            } else {
                if (dy > 0) this._swipeDown = true;
                else this._swipeUp = true;
            }
            if ($gameTemp) $gameTemp.clearDestination();
        }
    };

    // Map swipes to actual window movement
    var _Window_Selectable_update = Window_Selectable.prototype.update;
    Window_Selectable.prototype.update = function() {
        _Window_Selectable_update.call(this);
        if (this.active && this.isOpen()) {
            if (TouchInput._swipeUp) this.cursorUp();
            if (TouchInput._swipeDown) this.cursorDown();
            if (TouchInput._swipeLeft) this.cursorLeft();
            if (TouchInput._swipeRight) this.cursorRight();
        }
    };

})();