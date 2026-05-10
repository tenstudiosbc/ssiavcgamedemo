/*:
 * @plugindesc [v1.0] TSBC HSR-Inspired Leader HUD + Animated Stamina
 * @author Gemini / Naufal Ammariiq (MV Port)
 *
 * @param --- HUD Position ---
 * @default
 *
 * @param HUD Width
 * @parent --- HUD Position ---
 * @type number
 * @min 50
 * @max 800
 * @desc Width of the HUD panel in pixels.
 * @default 300
 *
 * @param HUD Height
 * @parent --- HUD Position ---
 * @type number
 * @min 50
 * @max 300
 * @desc Height of the HUD panel in pixels.
 * @default 100
 *
 * @param HUD Offset X
 * @parent --- HUD Position ---
 * @type number
 * @min -9999
 * @max 9999
 * @desc Additional X offset from center of screen.
 * @default 0
 *
 * @param HUD Offset Y
 * @parent --- HUD Position ---
 * @type number
 * @min 0
 * @max 9999
 * @desc Distance from the bottom edge of the screen.
 * @default 5
 *
 * @param --- Bar Settings ---
 * @default
 *
 * @param Bar Width
 * @parent --- Bar Settings ---
 * @type number
 * @min 20
 * @max 700
 * @desc Width of the HP and Stamina bars.
 * @default 220
 *
 * @param Bar Height
 * @parent --- Bar Settings ---
 * @type number
 * @min 2
 * @max 40
 * @desc Thickness of the bars in pixels.
 * @default 6
 *
 * @param Bar X
 * @parent --- Bar Settings ---
 * @type number
 * @min 0
 * @max 500
 * @desc X offset of bars from the left edge of the HUD.
 * @default 40
 *
 * @param HP Bar Y
 * @parent --- Bar Settings ---
 * @type number
 * @min 0
 * @max 200
 * @desc Y position of the HP bar within the HUD.
 * @default 60
 *
 * @param Stamina Bar Y
 * @parent --- Bar Settings ---
 * @type number
 * @min 0
 * @max 200
 * @desc Y position of the Stamina bar within the HUD.
 * @default 75
 *
 * @param Bar Background Alpha
 * @parent --- Bar Settings ---
 * @type number
 * @decimals 2
 * @min 0.00
 * @max 1.00
 * @desc Opacity of the bar background. 0.0=invisible, 1.0=solid black.
 * @default 0.63
 *
 * @param --- Animation ---
 * @default
 *
 * @param Lerp Speed
 * @parent --- Animation ---
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 1.00
 * @desc Bar fill animation speed. 0.01=very slow, 1.00=instant.
 * @default 0.15
 *
 * @param --- HP Bar Colors ---
 * @default
 *
 * @param HP Color 1
 * @parent --- HP Bar Colors ---
 * @desc HP bar gradient START color. Format: R,G,B  (e.g. 100,255,200)
 * @default 100,255,200
 *
 * @param HP Color 2
 * @parent --- HP Bar Colors ---
 * @desc HP bar gradient END color. Format: R,G,B  (e.g. 50,150,120)
 * @default 50,150,120
 *
 * @param --- Stamina Bar Colors ---
 * @default
 *
 * @param ST Color 1
 * @parent --- Stamina Bar Colors ---
 * @desc Stamina bar gradient START color. Format: R,G,B
 * @default 255,255,255
 *
 * @param ST Color 2
 * @parent --- Stamina Bar Colors ---
 * @desc Stamina bar gradient END color. Format: R,G,B
 * @default 180,180,200
 *
 * @param ST Exhaust Color
 * @parent --- Stamina Bar Colors ---
 * @desc Pulse color shown when stamina is exhausted. Format: R,G,B
 * @default 255,50,50
 *
 * @param --- Stamina Mechanics ---
 * @default
 *
 * @param Max Stamina
 * @parent --- Stamina Mechanics ---
 * @type number
 * @min 10
 * @max 99999
 * @desc Maximum stamina value.
 * @default 100
 *
 * @param Stamina Cost
 * @parent --- Stamina Mechanics ---
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 50.00
 * @desc Stamina drained per frame while the player is dashing.
 * @default 0.40
 *
 * @param Stamina Regen
 * @parent --- Stamina Mechanics ---
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 50.00
 * @desc Stamina regained per frame when the player is NOT dashing.
 * @default 0.60
 *
 * @param Regen Wait
 * @parent --- Stamina Mechanics ---
 * @type number
 * @min 0
 * @max 600
 * @desc Frames to wait before stamina regeneration begins after dashing stops.
 * @default 40
 *
 * @param Recovery Threshold
 * @parent --- Stamina Mechanics ---
 * @type number
 * @min 1
 * @max 100
 * @desc Stamina % that must be reached to end the Exhausted state (1-100).
 * @default 30
 *
 * @help
 * ============================================================================
 *  TSBC HSR-Inspired Leader HUD + Animated Stamina  [MV Port v1.0]
 * ============================================================================
 *  Features:
 *   - Smoothly animated HP and Stamina bars (Lerp interpolation)
 *   - HSR-inspired minimalist bottom-center layout
 *   - Dynamic "Exhausted" red pulse effect on the Stamina bar
 *   - Dash is disabled automatically while stamina is empty / exhausted
 *   - Mobile-optimised: redraws ONLY when values actually change
 *   - All parameters configurable via Plugin Manager — no code editing needed
 *
 *  Installation:
 *   1. Place this file in your project's /js/plugins/ folder.
 *   2. Enable it in the Plugin Manager (no other plugins required).
 *   3. Adjust parameters to taste and play!
 *
 *  Notes:
 *   - The HUD is shown only on the Map scene.
 *   - Stamina data is saved automatically with your game save file.
 *   - Compatible with both keyboard/gamepad (Shift to dash) and mobile.
 * ============================================================================
 */

(function () {
    'use strict';

    // =========================================================================
    //  Plugin Parameters
    // =========================================================================
    var PLUGIN_NAME = 'TSBC_LeaderHUD';
    var p = PluginManager.parameters(PLUGIN_NAME);

    /** Central config object built from Plugin Manager values. */
    var CFG = {
        // HUD layout
        WIDTH:      Number(p['HUD Width']    || 300),
        HEIGHT:     Number(p['HUD Height']   || 100),
        OFS_X:      Number(p['HUD Offset X'] || 0),
        OFS_Y:      Number(p['HUD Offset Y'] || 5),
        // Bars
        BAR_W:      Number(p['Bar Width']      || 220),
        BAR_H:      Number(p['Bar Height']     || 6),
        BAR_X:      Number(p['Bar X']          || 40),
        HP_Y:       Number(p['HP Bar Y']       || 60),
        ST_Y:       Number(p['Stamina Bar Y']  || 75),
        BAR_BG_A:   Number(p['Bar Background Alpha'] || 0.63),
        // Animation
        LERP:       Number(p['Lerp Speed']     || 0.15),
        // Stamina mechanics
        MAX_ST:     Number(p['Max Stamina']    || 100),
        ST_COST:    Number(p['Stamina Cost']   || 0.4),
        ST_REGEN:   Number(p['Stamina Regen']  || 0.6),
        RGN_WAIT:   Number(p['Regen Wait']     || 40),
        THRESHOLD:  Number(p['Recovery Threshold'] || 30) / 100,
        // Color strings (kept as "R,G,B" for cheap rgba() construction)
        HP1:        String(p['HP Color 1']     || '100,255,200'),
        HP2:        String(p['HP Color 2']     || '50,150,120'),
        ST1:        String(p['ST Color 1']     || '255,255,255'),
        ST2:        String(p['ST Color 2']     || '180,180,200'),
        EXHAUST:    String(p['ST Exhaust Color']|| '255,50,50'),
    };

    /**
     * Convert an "R,G,B" config string to a CSS rgba() colour.
     * @param {string} rgb   - Comma-separated R,G,B values.
     * @param {number} [a=1] - Alpha (0–1).
     * @returns {string}
     */
    function rgba(rgb, a) {
        return 'rgba(' + rgb + ',' + (a !== undefined ? a : 1) + ')';
    }

    // =========================================================================
    //  Game_Player — Stamina logic
    // =========================================================================

    /** Extend initMembers to set up stamina state. */
    var _GP_initMembers = Game_Player.prototype.initMembers;
    Game_Player.prototype.initMembers = function () {
        _GP_initMembers.call(this);
        this._stamina      = CFG.MAX_ST;
        this._staminaMax   = CFG.MAX_ST;
        this._stExhausted  = false;
        this._stRegenTimer = 0;
    };

    /**
     * Safe getter — handles older saves that lack stamina data.
     * Called from the HUD sprite so stamina is never undefined.
     */
    Game_Player.prototype.getStamina = function () {
        if (this._stamina === undefined) this._resetStamina();
        return this._stamina;
    };
    Game_Player.prototype.getStaminaMax = function () {
        if (this._staminaMax === undefined) this._resetStamina();
        return this._staminaMax;
    };
    Game_Player.prototype.isStaminaExhausted = function () {
        if (this._stExhausted === undefined) this._resetStamina();
        return this._stExhausted;
    };
    Game_Player.prototype._resetStamina = function () {
        this._stamina      = CFG.MAX_ST;
        this._staminaMax   = CFG.MAX_ST;
        this._stExhausted  = false;
        this._stRegenTimer = 0;
    };

    /**
     * Cache the ORIGINAL isDashing so the stamina-drain check always uses
     * the real input state (avoids a circular call once we override isDashing).
     */
    var _isDashing_orig = Game_Player.prototype.isDashing;

    /**
     * Override isDashing: block dashing when stamina is empty / exhausted.
     */
    Game_Player.prototype.isDashing = function () {
        if (this._stExhausted) return false;
        if (this._stamina !== undefined && this._stamina <= 0) return false;
        return _isDashing_orig.call(this);
    };

    /** Extend update to tick stamina every frame. */
    var _GP_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function (sceneActive) {
        _GP_update.call(this, sceneActive);
        this._updateStamina();
    };

    Game_Player.prototype._updateStamina = function () {
        if (this._stamina === undefined) this._resetStamina();

        // Use the original isDashing to read raw input (no stamina gate).
        var reallyDashing = this.isMoving() && _isDashing_orig.call(this);

        if (reallyDashing) {
            this._stamina -= CFG.ST_COST;
            this._stRegenTimer = 0;          // Reset the regen-delay countdown
        } else {
            if (this._stRegenTimer > 0) {
                this._stRegenTimer--;
            } else {
                this._stamina += CFG.ST_REGEN;
            }
        }

        // Clamp to valid range
        this._stamina = Math.min(Math.max(this._stamina, 0), this._staminaMax);

        // Enter Exhausted state
        if (this._stamina <= 0 && !this._stExhausted) {
            this._stExhausted  = true;
            this._stRegenTimer = CFG.RGN_WAIT; // Extra penalty before regen
        }

        // Leave Exhausted state only once stamina crosses the threshold
        if (this._stExhausted && this._stamina >= this._staminaMax * CFG.THRESHOLD) {
            this._stExhausted = false;
        }
    };

    // =========================================================================
    //  Sprite_LeaderHUD
    // =========================================================================
    function Sprite_LeaderHUD() {
        this.initialize.apply(this, arguments);
    }

    Sprite_LeaderHUD.prototype = Object.create(Sprite.prototype);
    Sprite_LeaderHUD.prototype.constructor = Sprite_LeaderHUD;

    Sprite_LeaderHUD.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);

        // Animated display values (lerped towards actual values each frame)
        this._hpView   = 0;
        this._stView   = 0;

        // Pulse animation state for the exhausted effect
        this._pulse    = 0;
        this._pulseDir = 1;

        // Dirty-check cache — avoids redrawing when nothing has changed
        // (key optimisation for mobile GPU/CPU)
        this._cHp       = -1;
        this._cSt       = -1;
        this._cPulse    = -1;
        this._cExhaust  = null;

        this.bitmap = new Bitmap(CFG.WIDTH, CFG.HEIGHT);

        // Centre horizontally, anchor to bottom of screen
        this.x = Math.floor((Graphics.width - CFG.WIDTH) / 2) + CFG.OFS_X;
        this.y = Graphics.height - CFG.HEIGHT - CFG.OFS_Y;
    };

    // ---- Per-frame update ---------------------------------------------------

    Sprite_LeaderHUD.prototype.update = function () {
        Sprite.prototype.update.call(this);
        this._lerpBars();
        this._tickPulse();
        if (this._isDirty()) this.refresh(); // Only draw if something changed
    };

    /** Smoothly interpolate bar fill towards the true value. */
    Sprite_LeaderHUD.prototype._lerpBars = function () {
        var actor = $gameParty.leader();
        if (!actor) return;

        var hpTarget = actor.hp / actor.mhp;
        var stTarget = $gamePlayer.getStamina() / $gamePlayer.getStaminaMax();

        this._hpView += (hpTarget - this._hpView) * CFG.LERP;
        this._stView += (stTarget - this._stView) * CFG.LERP;
    };

    /** Animate the exhaustion pulse alpha. */
    Sprite_LeaderHUD.prototype._tickPulse = function () {
        if (!$gamePlayer.isStaminaExhausted()) {
            this._pulse = 0;
            return;
        }
        this._pulse += 10 * this._pulseDir;
        if (this._pulse >= 255) { this._pulse = 255; this._pulseDir = -1; }
        if (this._pulse <= 0)   { this._pulse = 0;   this._pulseDir =  1; }
    };

    /**
     * Compare rounded state against the cached values.
     * Returns true and updates cache when a redraw is needed.
     * Rounding prevents floating-point noise from triggering redundant draws.
     */
    Sprite_LeaderHUD.prototype._isDirty = function () {
        var hp = Math.round(this._hpView * 500);
        var st = Math.round(this._stView * 500);
        var pu = Math.round(this._pulse);
        var ex = $gamePlayer.isStaminaExhausted();

        if (hp !== this._cHp || st !== this._cSt ||
            pu !== this._cPulse || ex !== this._cExhaust) {
            this._cHp     = hp;
            this._cSt     = st;
            this._cPulse  = pu;
            this._cExhaust = ex;
            return true;
        }
        return false;
    };

    // ---- Drawing ------------------------------------------------------------

    Sprite_LeaderHUD.prototype.refresh = function () {
        var bm = this.bitmap;
        bm.clear();
        var actor = $gameParty.leader();
        if (!actor) return;

        this._drawBackground(bm);
        this._drawInfo(bm, actor);
        this._drawBars(bm);
    };

    /** Subtle vertical gradient fading to a dark tint at the bottom. */
    Sprite_LeaderHUD.prototype._drawBackground = function (bm) {
        var ctx  = bm._context;
        var topY = CFG.HEIGHT - 50;
        var grad = ctx.createLinearGradient(0, topY, 0, CFG.HEIGHT);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.39)');
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, topY, CFG.WIDTH, 50);
        ctx.restore();
        bm._setDirty();
    };

    /** Draw actor name and level above the bars. */
    Sprite_LeaderHUD.prototype._drawInfo = function (bm, actor) {
        bm.outlineWidth = 3;
        bm.outlineColor = 'rgba(0,0,0,0.65)';

        // Actor name — bold italic white
        bm.fontSize   = 18;
        bm.fontBold   = true;
        bm.fontItalic = true;
        bm.textColor  = '#ffffff';
        bm.drawText(actor.name(), CFG.BAR_X, CFG.HP_Y - 24, 150, 22, 'left');

        // Level — small muted text, right-aligned
        bm.fontSize   = 14;
        bm.fontBold   = false;
        bm.fontItalic = false;
        bm.textColor  = '#c8c8c8';
        bm.drawText(
            'Lv. ' + actor.level,
            CFG.BAR_X + CFG.BAR_W - 60,
            CFG.HP_Y - 22,
            60, 20, 'right'
        );
    };

    /** Draw the HP and Stamina bars using direct canvas calls (fastest path). */
    Sprite_LeaderHUD.prototype._drawBars = function (bm) {
        var ctx     = bm._context;
        var bgColor = 'rgba(0,0,0,' + CFG.BAR_BG_A + ')';
        var bw = CFG.BAR_W;
        var bh = CFG.BAR_H;
        var bx = CFG.BAR_X;

        ctx.save();

        // ── HP Bar ──────────────────────────────────────────────────────────
        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, CFG.HP_Y, bw, bh);

        var fillHp = Math.floor(bw * Math.min(this._hpView, 1));
        if (fillHp > 0) {
            var hpGrad = ctx.createLinearGradient(bx, 0, bx + fillHp, 0);
            hpGrad.addColorStop(0, rgba(CFG.HP1));
            hpGrad.addColorStop(1, rgba(CFG.HP2));
            ctx.fillStyle = hpGrad;
            ctx.fillRect(bx, CFG.HP_Y, fillHp, bh);
        }

        // ── Stamina Bar ─────────────────────────────────────────────────────
        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, CFG.ST_Y, bw, bh);

        var fillSt = Math.floor(bw * Math.min(this._stView, 1));
        if (fillSt > 0) {
            var stGrad = ctx.createLinearGradient(bx, 0, bx + fillSt, 0);
            if ($gamePlayer.isStaminaExhausted()) {
                // Pulsing red during exhaustion
                stGrad.addColorStop(0, rgba(CFG.EXHAUST, this._pulse / 255));
                stGrad.addColorStop(1, rgba(CFG.ST2, 0.5));
            } else {
                stGrad.addColorStop(0, rgba(CFG.ST1));
                stGrad.addColorStop(1, rgba(CFG.ST2));
            }
            ctx.fillStyle = stGrad;
            ctx.fillRect(bx, CFG.ST_Y, fillSt, bh);
        }

        ctx.restore();
        bm._setDirty(); // Signal Pixi that the canvas texture needs re-upload
    };

    // =========================================================================
    //  Scene_Map integration
    // =========================================================================

    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        this._tsbcHud = new Sprite_LeaderHUD();
        this.addChild(this._tsbcHud);
    };

    var _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () {
        if (this._tsbcHud) {
            this._tsbcHud.destroy();
            this._tsbcHud = null;
        }
        _Scene_Map_terminate.call(this);
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (this._tsbcHud) this._tsbcHud.update();
    };

})();