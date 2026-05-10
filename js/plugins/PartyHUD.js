//=============================================================================
// HSR_PartyHUD.js
//=============================================================================
/*:
 * @plugindesc v2.1 HSR-Inspired Party HUD + Mobile Touch Switch
 *             Compatible with ImprovedTouchInput.js & VirtualJoysticks.js
 * @author Naufal Ammariq (MV Port, v2.1 improvements)
 *
 * @param tabWidth
 * @text Tab Width
 * @type number
 * @min 100
 * @max 400
 * @desc Width of each party member tab in pixels.
 * @default 190
 *
 * @param tabHeight
 * @text Tab Height
 * @type number
 * @min 40
 * @max 120
 * @desc Height of each party member tab in pixels.
 * @default 68
 *
 * @param tabSpacing
 * @text Tab Spacing
 * @type number
 * @min 0
 * @max 30
 * @desc Vertical gap between tabs in pixels.
 * @default 6
 *
 * @param slideSpeed
 * @text Slide Speed
 * @type number
 * @decimals 2
 * @min 0.05
 * @max 1.00
 * @desc Animation slide speed (0.05 = slow, 1.00 = instant).
 * @default 0.18
 *
 * @param faceSize
 * @text Face Portrait Size
 * @type number
 * @min 24
 * @max 100
 * @desc Cropped face portrait size in pixels.
 * @default 46
 *
 * @param peekAmount
 * @text Peek Amount (px)
 * @type number
 * @min 10
 * @max 100
 * @desc How many pixels of non-leader tabs are visible from the right edge. Increase for easier mobile tapping.
 * @default 36
 *
 * @param showMpBar
 * @text Show MP Bar
 * @type boolean
 * @desc Show a small MP bar beneath the HP bar.
 * @default true
 *
 * @param showStateIcons
 * @text Show State Icons
 * @type boolean
 * @desc Show up to 2 active state icons per slot.
 * @default true
 *
 * @param switchSoundName
 * @text Switch Sound Name
 * @type file
 * @dir audio/se/
 * @desc SE played on party leader swap. Leave blank to disable.
 * @default Cursor1
 *
 * @param switchSoundVolume
 * @text Switch Sound Volume
 * @type number
 * @min 0
 * @max 100
 * @default 80
 *
 * @param switchSoundPitch
 * @text Switch Sound Pitch
 * @type number
 * @min 50
 * @max 150
 * @default 150
 *
 * @help
 * ================================================================
 *  HSR-Inspired Party HUD  [RPG Maker MV]  v2.1
 *  by Naufal Ammariq
 * ================================================================
 *
 *  Displays animated party member tabs on the right side of the
 *  map screen.  The current leader's tab is highlighted in teal
 *  and fully visible; other members peek in from the right edge.
 *  HP and MP bars update live. State icons display status effects.
 *
 *  ── HOW TO SWITCH THE LEADER ─────────────────────────────────
 *
 *  Mobile / Touch:
 *    TAP any non-leader slot directly to promote that member.
 *    The tap is fully consumed — the player character will NOT
 *    walk toward the tap point (compatible with ImprovedTouchInput).
 *
 *  Keyboard (Desktop):
 *    Hold  ALT  then press an Arrow key —
 *      UP    → switch to party member slot 1
 *      RIGHT → switch to party member slot 2
 *      DOWN  → switch to party member slot 3
 *      LEFT  → switch to party member slot 3
 *
 *  Gamepad:
 *    Hold  L (PageUp)  or  R (PageDown)  then press D-Pad.
 *    Same slot mapping as keyboard above.
 *
 *  ── PLUGIN LOAD ORDER ────────────────────────────────────────
 *  Recommended order in Plugin Manager:
 *    1. VirtualJoysticks.js
 *    2. ImprovedTouchInput.js
 *    3. HSR_PartyHUD.js      ← this file
 *
 *  ── INSTALLATION ─────────────────────────────────────────────
 *  1. Place HSR_PartyHUD.js in your project's  js/plugins/  folder.
 *  2. Open the Plugin Manager and activate it.
 *  3. Adjust parameters as desired.
 *
 *  ── COMPATIBILITY ────────────────────────────────────────────
 *  • VirtualJoysticks.js  — HUD touch is disabled while the
 *    joystick stick is active (checks _joystick.active).
 *  • ImprovedTouchInput.js — HUD taps clear $gameTemp destination
 *    and block processMapTouch so the player won't walk.
 *  • Two-finger cancel (ImprovedTouchInput) — HUD ignores
 *    multi-touch gestures.
 *
 *  ── NOTES ────────────────────────────────────────────────────
 *  - Works with up to 4 battle members.
 *  - A brief digital-glitch effect plays on every leader swap.
 *  - No other plugins required.
 * ================================================================
 */

(function () {
    'use strict';

    // =========================================================================
    // Parameters
    // =========================================================================
    var PLUGIN_NAME = 'HSR_PartyHUD';
    var raw = PluginManager.parameters(PLUGIN_NAME);

    var P = {
        WIDTH       : parseInt(raw['tabWidth'],          10) || 190,
        HEIGHT      : parseInt(raw['tabHeight'],         10) || 68,
        SPACING     : parseInt(raw['tabSpacing'],        10) || 6,
        SLIDE_SPD   : parseFloat(raw['slideSpeed'])          || 0.18,
        FACE_SIZE   : parseInt(raw['faceSize'],          10) || 46,
        PEEK        : parseInt(raw['peekAmount'],        10) || 36,
        SHOW_MP     : String(raw['showMpBar'])     !== 'false',
        SHOW_STATES : String(raw['showStateIcons']) !== 'false',
        SE_NAME     : String(raw['switchSoundName'] || 'Cursor1'),
        SE_VOL      : parseInt(raw['switchSoundVolume'], 10) || 80,
        SE_PITCH    : parseInt(raw['switchSoundPitch'],  10) || 150,
    };

    // =========================================================================
    // Colours
    // =========================================================================
    function rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255).toFixed(3) + ')';
    }

    var C = {
        BG_L     : rgba(  6,  10,  20,   0),
        BG_R     : rgba(  6,  10,  20, 218),
        ACCENT   : rgba(  0, 222, 192, 255),
        ACCENT_G : rgba(  0, 222, 192,  55),
        BORDER   : rgba(255, 255, 255,  18),
        STRIPE   : rgba(  0, 222, 192,  38),
        TEXT     : rgba(255, 255, 255, 255),
        TEXT_D   : rgba(148, 162, 184, 255),
        HP_BG    : rgba( 26,  30,  42, 255),
        HP_1     : rgba( 32, 182,  90, 255),
        HP_2     : rgba( 80, 248, 148, 255),
        HP_LOW   : rgba(212,  58,  50, 255),
        MP_BG    : rgba( 26,  30,  42, 255),
        MP_1     : rgba( 42,  90, 200, 255),
        MP_2     : rgba( 80, 160, 255, 255),
        LVL      : rgba(100, 200, 255, 255),
    };

    // =========================================================================
    // Register ALT key (keyCode 18) in MV's Input system
    // =========================================================================
    Input.keyMapper[18] = 'hsr_alt';

    // =========================================================================
    // Joystick compatibility helper
    // Mirrors the same check used inside ImprovedTouchInput.js
    // =========================================================================
    function isJoystickActive() {
        return (typeof _joystick !== 'undefined' && _joystick && _joystick.active);
    }

    // =========================================================================
    // Touch-consume flag
    // Set to true for one frame when the HUD absorbs a tap, so that
    // Scene_Map.processMapTouch() and ImprovedTouchInput swipe checks both skip.
    // =========================================================================
    var _hudConsumedTouch = false;

    // =========================================================================
    // Sprite_HSR_Slot
    // =========================================================================
    function Sprite_HSR_Slot() {
        this.initialize.apply(this, arguments);
    }

    Sprite_HSR_Slot.prototype             = Object.create(Sprite.prototype);
    Sprite_HSR_Slot.prototype.constructor = Sprite_HSR_Slot;

    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype.initialize = function (index) {
        Sprite.prototype.initialize.call(this);

        this._index      = index;
        this._actor      = null;
        this._isLeader   = false;
        this._dirtyKey   = null;
        this._drawGen    = 0;
        this._isDisposed = false;

        var W = P.WIDTH, H = P.HEIGHT;
        this.bitmap  = new Bitmap(W, H);
        this.z       = 200 + index;

        var totalH = (H + P.SPACING) * 4;
        var baseY  = Math.floor((Graphics.height - totalH) / 2);
        this.y       = baseY + index * (H + P.SPACING);
        this.x       = Graphics.width + W;
        this.opacity = 0;
        this.visible = false;

        this._targetX   = Graphics.width;
        this._targetOpa = 255;

        // Leader pulse animation state
        this._pulseTimer = 0;
    };

    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype.containsPoint = function (px, py) {
        return px >= this.x &&
               px <  this.x + P.WIDTH &&
               py >= this.y &&
               py <  this.y + P.HEIGHT;
    };

    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype.setup = function (actor, leader) {
        this._actor    = actor;
        this._isLeader = leader;
        this.visible   = !!actor;

        if (!this.visible) {
            this._dirtyKey = null;
            return;
        }

        // Slide targets — leader fully visible, others peek by P.PEEK pixels
        this._targetX   = leader
            ? Graphics.width - P.WIDTH
            : Graphics.width - P.PEEK;
        this._targetOpa = leader ? 255 : 160;

        // Dirty-key check includes states so icon changes trigger a redraw
        var stateIds = actor.states().map(function (s) { return s.id; }).join(',');
        var key = [actor.actorId(), leader, actor.hp, actor.mhp, actor.mp, actor.mmp, stateIds];
        var unchanged = this._dirtyKey &&
                        this._dirtyKey[0] === key[0] &&
                        this._dirtyKey[1] === key[1] &&
                        this._dirtyKey[2] === key[2] &&
                        this._dirtyKey[3] === key[3] &&
                        this._dirtyKey[4] === key[4] &&
                        this._dirtyKey[5] === key[5] &&
                        this._dirtyKey[6] === key[6];
        if (unchanged) return;

        var fullRedraw = !this._dirtyKey ||
                         this._dirtyKey[0] !== key[0] ||
                         this._dirtyKey[1] !== key[1] ||
                         this._dirtyKey[6] !== key[6];

        if (fullRedraw) {
            this._drawFull(leader);
        } else {
            this._drawBarsRegion();
        }

        this._dirtyKey = key;
    };

    // -------------------------------------------------------------------------
    // Full redraw
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype._drawFull = function (leader) {
        var b = this.bitmap;
        var W = P.WIDTH, H = P.HEIGHT;
        b.clear();

        // Background
        b.gradientFillRect(0, 0, W, H, C.BG_L, C.BG_R);

        if (leader) {
            b.fillRect(W - 5, 0, 5, H, C.ACCENT);
            b.fillRect(W - 9, 0, 4, H, C.ACCENT_G);
            b.fillRect(0,     0, W - 5, 1, C.STRIPE);
        }

        // Bottom hairline
        b.fillRect(0, H - 1, W, 1, C.BORDER);

        var nx = 16 + P.FACE_SIZE + 9;

        // Name
        b.fontSize  = leader ? 16 : 13;
        b.fontBold  = leader;
        b.textColor = leader ? C.TEXT : C.TEXT_D;
        b.drawText(this._actor.name(), nx, 4, W - nx - 14, 20, 'left');

        // Level badge
        b.fontSize  = 10;
        b.fontBold  = false;
        b.textColor = C.LVL;
        b.drawText('Lv' + this._actor.level, nx, 4, W - nx - 14, 20, 'right');

        // State icons (up to 2, drawn after name row)
        if (P.SHOW_STATES) this._drawStateIcons(nx);

        // HP + MP bars
        this._drawBars(nx);

        // Portrait
        this._scheduleFaceDraw();
    };

    // -------------------------------------------------------------------------
    // Partial redraw — bars region only
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype._drawBarsRegion = function () {
        if (!this._actor) return;
        var nx = 16 + P.FACE_SIZE + 9;
        var ry = P.HEIGHT - (P.SHOW_MP ? 33 : 22);
        var rh = P.HEIGHT - ry;
        this.bitmap.gradientFillRect(0, ry, P.WIDTH, rh, C.BG_L, C.BG_R);
        this._drawBars(nx);
    };

    // -------------------------------------------------------------------------
    // Draws HP (and optionally MP) bar + text
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype._drawBars = function (nx) {
        if (!this._actor) return;
        var b   = this.bitmap;
        var H   = P.HEIGHT, W = P.WIDTH;
        var bw  = W - nx - 14;

        var hpRate = this._actor.mhp > 0 ? this._actor.hp / this._actor.mhp : 0;
        var mpRate = this._actor.mmp > 0 ? this._actor.mp / this._actor.mmp : 0;

        // HP area Y offset — shift up when MP bar is present
        var hpTextY = P.SHOW_MP ? H - 33 : H - 22;
        var hpBarY  = P.SHOW_MP ? H - 20 : H - 10;
        var barH    = 4;

        // HP text
        b.fontSize  = 10;
        b.fontBold  = false;
        b.textColor = hpRate < 0.30 ? C.HP_LOW : C.TEXT_D;
        b.drawText(String(this._actor.hp),
            nx, hpTextY, Math.floor(bw / 2), 12, 'left');
        b.textColor = C.TEXT_D;
        b.drawText('/' + this._actor.mhp,
            nx + Math.floor(bw / 2), hpTextY, Math.ceil(bw / 2), 12, 'right');

        // HP bar track + fill
        b.fillRect(nx, hpBarY, bw, barH, C.HP_BG);
        if (hpRate > 0) {
            var hfw = Math.max(Math.floor(bw * hpRate), 1);
            var hc1 = hpRate < 0.30 ? C.HP_LOW : C.HP_1;
            var hc2 = hpRate < 0.30 ? C.HP_LOW : C.HP_2;
            b.gradientFillRect(nx, hpBarY, hfw, barH, hc1, hc2);
        }

        // MP bar
        if (P.SHOW_MP && this._actor.mmp > 0) {
            var mpBarY = H - 12;
            b.fillRect(nx, mpBarY, bw, barH, C.MP_BG);
            if (mpRate > 0) {
                var mfw = Math.max(Math.floor(bw * mpRate), 1);
                b.gradientFillRect(nx, mpBarY, mfw, barH, C.MP_1, C.MP_2);
            }
        }
    };

    // -------------------------------------------------------------------------
    // Draws up to 2 state icons in the name row (small, right-aligned)
    // Uses the standard iconset image. Falls back silently if not ready.
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype._drawStateIcons = function (nx) {
        if (!this._actor) return;
        var states = this._actor.states();
        if (!states || states.length === 0) return;

        var iconSheet = ImageManager.loadSystem('IconSet');
        if (!iconSheet.isReady()) {
            // Schedule a retry once the image loads
            var self = this;
            iconSheet.addLoadListener(function () {
                if (!self._isDisposed && self._actor) self._drawStateIcons(nx);
            });
            return;
        }

        var iw = Window_Base._iconWidth  || 32;
        var ih = Window_Base._iconHeight || 32;
        var scale  = 0.55;                    // render at 55% → ~18×18 px
        var drawSz = Math.round(iw * scale);
        var b      = this.bitmap;
        var W      = P.WIDTH;
        var maxIcons = 2;

        for (var i = 0; i < Math.min(states.length, maxIcons); i++) {
            var iconIndex = states[i].iconIndex;
            if (!iconIndex) continue;
            var col = iconIndex % 16;
            var row = Math.floor(iconIndex / 16);
            var sx  = col * iw;
            var sy  = row * ih;
            // Right-align: slot 0 at W-nx-14-drawSz, slot 1 one step further left
            var dx  = W - 14 - drawSz - i * (drawSz + 2);
            var dy  = 4;
            b.blt(iconSheet, sx, sy, iw, ih, dx, dy, drawSz, drawSz);
        }
    };

    // -------------------------------------------------------------------------
    // Async-safe face blit
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype._scheduleFaceDraw = function () {
        var actor = this._actor;
        if (!actor) return;

        var gen  = ++this._drawGen;
        var self = this;
        var face = ImageManager.loadFace(actor.faceName());

        var doDraw = function () {
            if (self._isDisposed)      return;
            if (self._drawGen !== gen) return;
            if (!self._actor)          return;

            var b  = self.bitmap;
            var pw = Window_Base._faceWidth;
            var ph = Window_Base._faceHeight;
            var fi = actor.faceIndex();
            var fx = (fi % 4) * pw;
            var fy = Math.floor(fi / 4) * ph;
            var px = 16;
            var py = Math.floor((P.HEIGHT - P.FACE_SIZE) / 2);
            b.blt(face, fx, fy, pw, ph, px, py, P.FACE_SIZE, P.FACE_SIZE);
        };

        if (face.isReady()) {
            doDraw();
        } else {
            face.addLoadListener(doDraw);
        }
    };

    // -------------------------------------------------------------------------
    // Per-frame animation
    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype.update = function () {
        Sprite.prototype.update.call(this);
        if (!this.visible) return;
        this._lerpTo('x',       this._targetX);
        this._lerpTo('opacity', this._targetOpa);

        // Subtle pulse on leader accent bar — re-draw only once per full pulse cycle
        if (this._isLeader) {
            this._pulseTimer = (this._pulseTimer + 1) % 120;
        }
    };

    Sprite_HSR_Slot.prototype._lerpTo = function (attr, target) {
        var cur  = this[attr];
        if (cur === target) return;
        var diff = (target - cur) * P.SLIDE_SPD;
        this[attr] = Math.abs(diff) < 1.0 ? target : Math.floor(cur + diff);
    };

    // -------------------------------------------------------------------------
    Sprite_HSR_Slot.prototype.dispose = function () {
        if (this._isDisposed) return;
        this._isDisposed = true;
        if (this.parent) this.parent.removeChild(this);
        this.bitmap = null;
    };

    // =========================================================================
    // Sprite_HSR_Glitch
    // =========================================================================
    function Sprite_HSR_Glitch() {
        this.initialize.apply(this, arguments);
    }

    Sprite_HSR_Glitch.LIFE                  = 10;
    Sprite_HSR_Glitch.prototype             = Object.create(Sprite.prototype);
    Sprite_HSR_Glitch.prototype.constructor = Sprite_HSR_Glitch;

    Sprite_HSR_Glitch.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);
        this._timer      = Sprite_HSR_Glitch.LIFE;
        this._isDisposed = false;
        this.z           = 999;
        this.bitmap      = new Bitmap(Graphics.width, Graphics.height);
        this._paintLines();
    };

    Sprite_HSR_Glitch.prototype._paintLines = function () {
        var c1 = rgba(  0, 222, 192, 185);
        var c2 = rgba(255, 255, 255, 140);
        for (var i = 0; i < 10; i++) {
            var y = Math.floor(Math.random() * Graphics.height);
            var w = 24 + Math.floor(Math.random() * (Graphics.width - 24));
            var h = 1  + Math.floor(Math.random() * 2);
            this.bitmap.fillRect(0, y, w, h, Math.random() < 0.5 ? c1 : c2);
        }
    };

    Sprite_HSR_Glitch.prototype.update = function () {
        if (this._isDisposed) return;
        Sprite.prototype.update.call(this);
        this._timer -= 1;
        this.visible  = (this._timer % 2 === 1);
        this.opacity  = Math.max(this.opacity - 28, 0);
        if (this._timer <= 0) this.dispose();
    };

    Sprite_HSR_Glitch.prototype.isFinished = function () { return this._isDisposed; };

    Sprite_HSR_Glitch.prototype.dispose = function () {
        if (this._isDisposed) return;
        this._isDisposed = true;
        if (this.parent) this.parent.removeChild(this);
        this.bitmap = null;
    };

    // =========================================================================
    // HSR_HUD_Manager
    // =========================================================================
    function HSR_HUD_Manager() {
        this.initialize.apply(this, arguments);
    }

    HSR_HUD_Manager.prototype.initialize = function (scene) {
        this._scene      = scene;
        this._slots      = [];
        this._glitch     = null;
        this._isDisposed = false;

        for (var i = 0; i < 4; i++) {
            var slot = new Sprite_HSR_Slot(i);
            this._slots.push(slot);
            scene.addChild(slot);
        }
    };

    HSR_HUD_Manager.prototype.update = function () {
        if (this._isDisposed) return;

        var members = $gameParty.battleMembers();
        for (var i = 0; i < 4; i++) {
            this._slots[i].setup(members[i] || null, i === 0);
        }
        this._slots.forEach(function (s) { s.update(); });

        if (this._glitch) {
            if (this._glitch.isFinished()) {
                this._glitch = null;
            } else {
                this._glitch.update();
            }
        }
    };

    HSR_HUD_Manager.prototype.triggerGlitch = function () {
        if (this._glitch && !this._glitch.isFinished()) this._glitch.dispose();
        this._glitch = new Sprite_HSR_Glitch();
        this._scene.addChild(this._glitch);
    };

    // Returns slot index 1–3 if (tx, ty) hits a non-leader slot; else -1.
    HSR_HUD_Manager.prototype.checkTouch = function (tx, ty) {
        for (var i = 1; i < this._slots.length; i++) {
            var s = this._slots[i];
            if (s.visible && s.containsPoint(tx, ty)) return i;
        }
        return -1;
    };

    // Returns true if the point is inside ANY slot (including leader).
    // Used to block map-touch from firing inside the HUD region.
    HSR_HUD_Manager.prototype.isInsideHUD = function (tx, ty) {
        for (var i = 0; i < this._slots.length; i++) {
            var s = this._slots[i];
            if (s.visible && s.containsPoint(tx, ty)) return true;
        }
        return false;
    };

    HSR_HUD_Manager.prototype.dispose = function () {
        if (this._isDisposed) return;
        this._isDisposed = true;
        this._slots.forEach(function (s) { s.dispose(); });
        this._slots = [];
        if (this._glitch && !this._glitch.isFinished()) this._glitch.dispose();
        this._glitch = null;
    };

    // =========================================================================
    // Safe SE helper — silently skips missing audio files
    // =========================================================================
    function playSwapSE() {
        if (!P.SE_NAME) return;
        try {
            AudioManager.playSe({
                name   : P.SE_NAME,
                volume : P.SE_VOL,
                pitch  : P.SE_PITCH,
            });
        } catch (e) { /* ignore missing SE */ }
    }

    // =========================================================================
    // Scene_Map — hooks
    // =========================================================================
    var _Scene_Map_start     = Scene_Map.prototype.start;
    var _Scene_Map_terminate = Scene_Map.prototype.terminate;
    var _Scene_Map_update    = Scene_Map.prototype.update;

    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        this._hsrHUD = new HSR_HUD_Manager(this);
    };

    Scene_Map.prototype.terminate = function () {
        if (this._hsrHUD) {
            this._hsrHUD.dispose();
            this._hsrHUD = null;
        }
        _Scene_Map_terminate.call(this);
    };

    Scene_Map.prototype.update = function () {
        // Reset the consume flag at the start of every frame
        _hudConsumedTouch = false;

        _Scene_Map_update.call(this);

        if (this._hsrHUD) {
            this._hsrHUD.update();
            this._updateHSRSwitch();
        }
    };

    // -------------------------------------------------------------------------
    // Block processMapTouch when the tap landed inside the HUD.
    // This prevents MV from setting a walk destination after a HUD tap,
    // and also prevents ImprovedTouchInput from routing the tap as a map OK.
    // -------------------------------------------------------------------------
    var _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function () {
        // If the HUD already consumed this touch frame, do nothing.
        if (_hudConsumedTouch) return;

        // If the touch position is inside the HUD, block and clear destination.
        if (this._hsrHUD && TouchInput.isTriggered()) {
            if (this._hsrHUD.isInsideHUD(TouchInput.x, TouchInput.y)) {
                if ($gameTemp) $gameTemp.clearDestination();
                return;  // consumed — don't call original
            }
        }

        _Scene_Map_processMapTouch.call(this);
    };

    // -------------------------------------------------------------------------
    // Party switch logic
    // -------------------------------------------------------------------------
    Scene_Map.prototype._updateHSRSwitch = function () {
        var members = $gameParty.battleMembers();
        if (members.length < 2) return;

        var slot = -1;

        // ── Touch / click ─────────────────────────────────────────────────
        // Guard: skip if the virtual joystick is currently held.
        // Guard: skip multi-touch frames (two-finger cancel etc.)
        if (TouchInput.isTriggered() && !isJoystickActive()) {
            // Only check non-leader slots (index 1–3)
            slot = this._hsrHUD.checkTouch(TouchInput.x, TouchInput.y);

            if (slot >= 0) {
                // Consume the touch so nothing else acts on it this frame
                _hudConsumedTouch = true;
                if ($gameTemp) $gameTemp.clearDestination();
            }
        }

        // ── Keyboard: hold ALT + Arrow ─────────────────────────────────────
        // ── Gamepad:  hold L / R (PageUp / PageDown) + D-Pad ──────────────
        if (slot < 0 &&
            (Input.isPressed('hsr_alt') ||
             Input.isPressed('pageup')  ||
             Input.isPressed('pagedown'))) {

            if (Input.isTriggered('up'))    slot = 1;
            if (Input.isTriggered('right')) slot = 2;
            if (Input.isTriggered('down'))  slot = 3;
            if (Input.isTriggered('left'))  slot = 3;
        }

        if (slot < 0 || slot >= members.length) return;

        // ── Execute swap ──────────────────────────────────────────────────
        $gameParty.swapOrder(0, slot);
        $gamePlayer.refresh();
        this._hsrHUD.triggerGlitch();
        playSwapSE();
    };

}()); // end IIFE