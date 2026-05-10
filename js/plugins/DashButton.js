/*:
 * @plugindesc v1.0 - Circular Dash Button for Mobile. Toggle character dash with a tap!
 * @author Gemini & Claude
 *
 * @param Button Position
 * @text --- Button Position ---
 *
 * @param dashButtonSide
 * @parent Button Position
 * @text Button Side
 * @desc Which side of the screen should the dash button appear on?
 * @type select
 * @option Left
 * @value left
 * @option Right
 * @value right
 * @default right
 *
 * @param dashButtonX
 * @parent Button Position
 * @text Horizontal Offset
 * @desc Distance from the chosen side (px).
 * @type number
 * @default 70
 *
 * @param dashButtonY
 * @parent Button Position
 * @text Vertical Offset
 * @desc Distance from the bottom of the screen (px).
 * @type number
 * @default 140
 *
 * @param Button Appearance
 * @text --- Button Appearance ---
 *
 * @param dashButtonRadius
 * @parent Button Appearance
 * @text Button Radius (px)
 * @type number
 * @default 50
 *
 * @param dashButtonIcon
 * @parent Button Appearance
 * @text Icon Index
 * @type number
 * @default 51
 * @desc The icon from RPG Maker MV Iconset to display on the button.
 *
 * @param dashButtonColor
 * @parent Button Appearance
 * @text Button Color (hex)
 * @default 0x4CAF50
 *
 * @param dashButtonAlpha
 * @parent Button Appearance
 * @text Button Opacity (0–1)
 * @type number
 * @decimals 2
 * @default 0.75
 *
 * @param dashButtonActiveAlpha
 * @parent Button Appearance
 * @text Active Opacity (0–1)
 * @type number
 * @decimals 2
 * @default 1.0
 *
 * @help
 * ============================================================
 * DashButton.js v1.0
 * ============================================================
 * A mobile-focused circular dash button that toggles character dash.
 *
 * FEATURES:
 * - Circular touch button positioned on left or right
 * - Tap to toggle character dash state
 * - Uses RPG Maker MV Iconset for the icon
 * - Fully customizable via parameters
 * - Mobile and Android optimized
 * - Works on the Map scene only
 *
 * PARAMETERS:
 * - Button Side: Choose Left or Right
 * - Horizontal Offset: Distance from chosen side
 * - Vertical Offset: Distance from bottom
 * - Button Radius: Size of the circular button
 * - Icon Index: RPG Maker MV Iconset icon to display
 * - Colors and opacity settings
 *
 * COMPATIBILITY:
 * - Works with VirtualJoysticks.js
 * - Works with ImprovedTouchInput.js
 * - Standalone compatible with default touch input
 */

(function() {
    'use strict';

    // === PARAMETER HANDLING ===
    const parameters = PluginManager.parameters('DashButton');
    const DASH_BUTTON_SIDE = String(parameters['dashButtonSide'] || 'right');
    const DASH_BUTTON_X = Number(parameters['dashButtonX'] || 70);
    const DASH_BUTTON_Y = Number(parameters['dashButtonY'] || 140);
    const DASH_BUTTON_RADIUS = Number(parameters['dashButtonRadius'] || 50);
    const DASH_BUTTON_ICON = Number(parameters['dashButtonIcon'] || 51);
    const DASH_BUTTON_COLOR = String(parameters['dashButtonColor'] || '0x4CAF50');
    const DASH_BUTTON_ALPHA = Number(parameters['dashButtonAlpha'] || 0.75);
    const DASH_BUTTON_ACTIVE_ALPHA = Number(parameters['dashButtonActiveAlpha'] || 1.0);

    // === GLOBAL STATE ===
    var _dashButtonActive = false;
    var _dashButtonTouchId = -1;

    // === SPRITE CLASS ===
    function Sprite_DashButton() {
        this.initialize.apply(this, arguments);
    }

    Sprite_DashButton.prototype = Object.create(Sprite.prototype);
    Sprite_DashButton.prototype.constructor = Sprite_DashButton;

    Sprite_DashButton.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this._isActive = false;
        this._isDashing = false;
        this._touchOnButton = false;
        this._animationProgress = 0;
        this.createButton();
    };

    Sprite_DashButton.prototype.createButton = function() {
        const diameter = DASH_BUTTON_RADIUS * 2;
        this.bitmap = new Bitmap(diameter, diameter);
        this.setFrame(0, 0, diameter, diameter);
        
        // Calculate position based on side preference
        if (DASH_BUTTON_SIDE === 'left') {
            this.x = DASH_BUTTON_X;
        } else {
            this.x = Graphics.boxWidth - DASH_BUTTON_X - diameter;
        }
        this.y = Graphics.boxHeight - DASH_BUTTON_Y - diameter;
        
        this.anchor.x = 0;
        this.anchor.y = 0;
        this._baseX = this.x;
        this._baseY = this.y;
        
        this.redrawButton();
    };

    Sprite_DashButton.prototype.redrawButton = function() {
        const diameter = DASH_BUTTON_RADIUS * 2;
        this.bitmap.clear();
        
        // Determine current alpha based on dash state
        const currentAlpha = this._isDashing ? DASH_BUTTON_ACTIVE_ALPHA : DASH_BUTTON_ALPHA;
        
        // Draw circular background with gradient effect
        const colorHex = DASH_BUTTON_COLOR.toString().replace('0x', '');
        const r = parseInt(colorHex.substr(0, 2), 16);
        const g = parseInt(colorHex.substr(2, 2), 16);
        const b = parseInt(colorHex.substr(4, 2), 16);
        
        const bgColor = 'rgba(' + r + ',' + g + ',' + b + ',' + currentAlpha + ')';
        const borderColor = 'rgba(' + Math.min(r + 50, 255) + ',' + Math.min(g + 50, 255) + ',' + Math.min(b + 50, 255) + ',' + (currentAlpha * 0.8) + ')';
        
        // Draw outer circle (shadow effect)
        this.bitmap.fillRect(DASH_BUTTON_RADIUS - 2, DASH_BUTTON_RADIUS - 2, 4, 4, borderColor);
        
        // Draw main circle
        this.drawCircle(DASH_BUTTON_RADIUS, DASH_BUTTON_RADIUS, DASH_BUTTON_RADIUS, bgColor);
        
        // Draw border
        this.drawCircleOutline(DASH_BUTTON_RADIUS, DASH_BUTTON_RADIUS, DASH_BUTTON_RADIUS, borderColor);
        
        // Draw icon from iconset
        this.drawIconOnButton();
    };

    Sprite_DashButton.prototype.drawCircle = function(x, y, radius, color) {
        for (let i = 0; i < radius; i++) {
            const circumference = 2 * Math.PI * i;
            const steps = Math.max(1, Math.ceil(circumference / 2));
            for (let j = 0; j < steps; j++) {
                const angle = (j / steps) * Math.PI * 2;
                const px = Math.round(x + i * Math.cos(angle));
                const py = Math.round(y + i * Math.sin(angle));
                if (px >= 0 && py >= 0 && px < this.bitmap.width && py < this.bitmap.height) {
                    this.bitmap.fillRect(px, py, 1, 1, color);
                }
            }
        }
    };

    Sprite_DashButton.prototype.drawCircleOutline = function(x, y, radius, color) {
        const circumference = 2 * Math.PI * radius;
        const steps = Math.ceil(circumference);
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const px = Math.round(x + radius * Math.cos(angle));
            const py = Math.round(y + radius * Math.sin(angle));
            if (px >= 0 && py >= 0 && px < this.bitmap.width && py < this.bitmap.height) {
                this.bitmap.fillRect(px, py, 1, 1, color);
            }
        }
    };

    Sprite_DashButton.prototype.drawIconOnButton = function() {
        if (!ImageManager.isReady()) {
            return;
        }
        
        const bitmap = ImageManager.loadSystem('IconSet');
        if (!bitmap || !bitmap.isReady()) {
            return;
        }
        
        const iconIndex = DASH_BUTTON_ICON;
        const sx = (iconIndex % 16) * ImageManager.iconWidth;
        const sy = Math.floor(iconIndex / 16) * ImageManager.iconHeight;
        
        const iconX = DASH_BUTTON_RADIUS - ImageManager.iconWidth / 2;
        const iconY = DASH_BUTTON_RADIUS - ImageManager.iconHeight / 2;
        
        this.bitmap.blt(bitmap, sx, sy, ImageManager.iconWidth, ImageManager.iconHeight, iconX, iconY);
    };

    Sprite_DashButton.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this.updateTouchInput();
        this.updateAnimation();
    };

    Sprite_DashButton.prototype.updateTouchInput = function() {
        if (TouchInput.isTriggered()) {
            if (this.isPointInCircle(TouchInput.x, TouchInput.y)) {
                this._touchOnButton = true;
                _dashButtonTouchId = TouchInput._touchId || 0;
                this.toggleDash();
            }
        }
        
        if (TouchInput.isReleased()) {
            this._touchOnButton = false;
            _dashButtonTouchId = -1;
        }
    };

    Sprite_DashButton.prototype.isPointInCircle = function(px, py) {
        const diameter = DASH_BUTTON_RADIUS * 2;
        const centerX = this.x + DASH_BUTTON_RADIUS;
        const centerY = this.y + DASH_BUTTON_RADIUS;
        const distance = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2));
        return distance <= DASH_BUTTON_RADIUS;
    };

    Sprite_DashButton.prototype.toggleDash = function() {
        this._isDashing = !this._isDashing;
        _dashButtonActive = this._isDashing;
        this.redrawButton();
        
        // Apply dash to player character
        if ($gamePlayer) {
            if (this._isDashing) {
                $gamePlayer.setDashing(true);
            } else {
                $gamePlayer.setDashing(false);
            }
        }
    };

    Sprite_DashButton.prototype.updateAnimation = function() {
        if (this._touchOnButton) {
            this._animationProgress = Math.min(this._animationProgress + 0.15, 1.0);
        } else {
            this._animationProgress = Math.max(this._animationProgress - 0.15, 0);
        }
        
        const scale = 1.0 + (this._animationProgress * 0.1);
        this.scale.x = scale;
        this.scale.y = scale;
    };

    // === SCENE_MAP INTEGRATION ===
    const _Scene_Map_createSpriteset = Scene_Map.prototype.createSpriteset;
    Scene_Map.prototype.createSpriteset = function() {
        _Scene_Map_createSpriteset.call(this);
        this.createDashButton();
    };

    Scene_Map.prototype.createDashButton = function() {
        this._dashButton = new Sprite_DashButton();
        this._spriteset.addChild(this._dashButton);
    };

    // === CLEANUP ===
    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (this._dashButton) {
            this._spriteset.removeChild(this._dashButton);
            this._dashButton = null;
        }
        _Scene_Map_terminate.call(this);
    };

    // === ENSURE DASH STATE PERSISTS ===
    const _Game_Player_setDashing = Game_Player.prototype.setDashing;
    Game_Player.prototype.setDashing = function(isDashing) {
        if (typeof _Game_Player_setDashing === 'function') {
            _Game_Player_setDashing.call(this, isDashing);
        } else {
            this._dashing = isDashing;
        }
    };

})();
