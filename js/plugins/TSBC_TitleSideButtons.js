/*:
 * @plugindesc v2.0.0 Responsive side-button panel for the Title Screen. Touch & Android optimized.
 * @author TSBC
 *
 * @param Support URL
 * @desc URL opened when the Support button is pressed.
 * @default https://www.tenstudiosbc.my.id/Pages/helpcenter.html
 *
 * @param Panel X Offset Percent
 * @desc Right-edge offset as a % of screen width. Default: 2
 * @default 2
 *
 * @param Panel Y Offset Percent
 * @desc Bottom-edge offset as a % of screen height. Default: 3
 * @default 3
 *
 * @help
 * ============================================================================
 *  TSBC_TitleSideButtons  v2.0.0
 *  by TSBC
 * ============================================================================
 *
 * Adds a responsive vertical button panel to the bottom-right of the Title
 * Screen. All sizes scale with the game window so it looks correct at any
 * resolution. Optimised for Android touch screens:
 *
 *   [?] Support  — Opens the Help Center in the system browser.
 *   [X] Exit     — Exits the game cleanly.
 *
 * ── How sizing works ──────────────────────────────────────────────────────
 *  Button height  = 8 % of box height  (min 48 px — Android touch guideline)
 *  Button width   = 18% of box width   (min 130 px)
 *  Gap between    = 1.5% of box height (min 8 px)
 *  Panel padding  = 1%  of box width   (min 6 px)
 *  Font size      = 38% of button height, clamped 13–22 px
 *
 * ── Touch handling ────────────────────────────────────────────────────────
 *  Native touchstart / touchend events are registered directly on the canvas
 *  so there is zero frame-delay and the hit-test uses the real CSS bounding
 *  rect — works correctly even when the canvas is zoomed/letterboxed.
 *
 * No plugin commands needed.
 * Place TSBC_TitleSideButtons.js in js/plugins/ and enable in Plugin Manager.
 *
 * ============================================================================
 */

(function () {
    'use strict';

    // ── Parameter Parsing ─────────────────────────────────────────────────────
    var _params     = PluginManager.parameters('TSBC_TitleSideButtons');
    var SUPPORT_URL = String(_params['Support URL'] ||
                      'https://www.tenstudiosbc.my.id/Pages/helpcenter.html');
    var X_OFF_PCT   = parseFloat(_params['Panel X Offset Percent'] || 2);
    var Y_OFF_PCT   = parseFloat(_params['Panel Y Offset Percent'] || 3);

    // ── Responsive metric builder ─────────────────────────────────────────────
    function scaled(base, pct, minVal) {
        return Math.max(minVal, Math.round(base * pct / 100));
    }

    function buildMetrics() {
        var bw = Graphics.boxWidth;
        var bh = Graphics.boxHeight;
        var btnH   = scaled(bh, 8,   48);   // Android min touch target = 48 px
        var btnW   = scaled(bw, 18, 130);
        var gap    = scaled(bh, 1.5,  8);
        var pad    = scaled(bw, 1,    6);
        var offX   = scaled(bw, X_OFF_PCT, 4);
        var offY   = scaled(bh, Y_OFF_PCT, 6);
        var fSize  = Math.min(22, Math.max(13, Math.round(btnH * 0.38)));
        var iSize  = Math.min(24, Math.max(14, Math.round(btnH * 0.42)));
        var radius = Math.max(4,  Math.round(btnH * 0.15));
        return { bw:bw, bh:bh, btnW:btnW, btnH:btnH, gap:gap, pad:pad,
                 offX:offX, offY:offY, fSize:fSize, iSize:iSize, radius:radius };
    }

    // ── Platform helpers ──────────────────────────────────────────────────────
    function openURL(url) {
        try { require('nw.gui').Shell.openExternal(url); }
        catch (e) {
            try { window.open(url, '_blank'); }
            catch (e2) { console.warn('TSBC_TitleSideButtons: Cannot open URL', url); }
        }
    }

    function exitGame() {
        try { require('nw.gui').App.quit(); }
        catch (e) { SceneManager.exit(); }
    }

    // ── Button definitions ────────────────────────────────────────────────────
    var BUTTONS = [
        { key:'support', label:'Support', icon:'❓', action: function(){ openURL(SUPPORT_URL); } },
        { key:'exit',    label:'Exit',    icon:'✕',  action: exitGame }
    ];

    // ── Window_TitleSidePanel ─────────────────────────────────────────────────
    function Window_TitleSidePanel() {
        this.initialize.apply(this, arguments);
    }

    Window_TitleSidePanel.prototype = Object.create(Window_Base.prototype);
    Window_TitleSidePanel.prototype.constructor = Window_TitleSidePanel;

    Window_TitleSidePanel.prototype.initialize = function () {
        this._m           = buildMetrics();
        this._hoverIndex  = -1;
        this._pressIndex  = -1;
        this._buttonRects = [];
        this._touchBound  = false;
        this._touchCanvas = null;

        var m      = this._m;
        var count  = BUTTONS.length;
        var totalH = count * m.btnH + (count - 1) * m.gap;
        var ww     = m.btnW + m.pad * 2;
        var wh     = totalH + m.pad * 2;
        var wx     = m.bw - ww - m.offX;
        var wy     = m.bh - wh - m.offY;

        Window_Base.prototype.initialize.call(this, wx, wy, ww, wh);
        this.opacity     = 0;
        this.backOpacity = 0;
        this.openness    = 255;

        this._buildRects();
        this.refresh();
        this._bindTouchEvents();
    };

    // ── Layout ────────────────────────────────────────────────────────────────
    Window_TitleSidePanel.prototype._buildRects = function () {
        var m = this._m;
        this._buttonRects = [];
        for (var i = 0; i < BUTTONS.length; i++) {
            this._buttonRects.push({
                x: m.pad,
                y: m.pad + i * (m.btnH + m.gap),
                w: m.btnW,
                h: m.btnH
            });
        }
    };

    // ── Drawing ───────────────────────────────────────────────────────────────
    Window_TitleSidePanel.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();
        for (var i = 0; i < BUTTONS.length; i++) {
            this._drawButton(i);
        }
    };

    Window_TitleSidePanel.prototype._drawButton = function (index) {
        var btn    = BUTTONS[index];
        var rect   = this._buttonRects[index];
        var m      = this._m;
        var isExit = (btn.key === 'exit');
        var press  = (this._pressIndex === index);
        var hover  = (this._hoverIndex === index);
        var active = press || hover;

        var ctx = this.contents._context || this.contents.context;
        if (ctx) {
            ctx.save();
            var bx = rect.x, by = rect.y, bw = rect.w, bh = rect.h, r = m.radius;

            // Rounded rect path
            ctx.beginPath();
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + bw - r, by);
            ctx.quadraticCurveTo(bx + bw, by,      bx + bw, by + r);
            ctx.lineTo(bx + bw, by + bh - r);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
            ctx.lineTo(bx + r,  by + bh);
            ctx.quadraticCurveTo(bx, by + bh,      bx, by + bh - r);
            ctx.lineTo(bx, by + r);
            ctx.quadraticCurveTo(bx, by,            bx + r, by);
            ctx.closePath();

            // Fill
            var grad = ctx.createLinearGradient(bx, by, bx, by + bh);
            if (press) {
                grad.addColorStop(0, isExit ? 'rgba(220,50,50,0.97)' : 'rgba(20,130,245,0.97)');
                grad.addColorStop(1, isExit ? 'rgba(160,20,20,0.92)' : 'rgba(10,90,185,0.92)');
            } else if (hover) {
                grad.addColorStop(0, isExit ? 'rgba(180,40,40,0.88)' : 'rgba(30,110,215,0.88)');
                grad.addColorStop(1, isExit ? 'rgba(130,15,15,0.82)' : 'rgba(15,75,165,0.82)');
            } else {
                grad.addColorStop(0, 'rgba(15,15,32,0.74)');
                grad.addColorStop(1, 'rgba(26,26,52,0.62)');
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // Border
            ctx.lineWidth   = active ? 1.8 : 1;
            ctx.strokeStyle = active
                ? (isExit ? 'rgba(255,90,90,1.0)'  : 'rgba(80,175,255,1.0)')
                : 'rgba(110,110,175,0.45)';
            ctx.stroke();

            // Glow on active
            if (active) {
                ctx.shadowBlur  = press ? 20 : 10;
                ctx.shadowColor = isExit ? 'rgba(255,60,60,0.55)' : 'rgba(50,145,255,0.55)';
                ctx.stroke();
                ctx.shadowBlur  = 0;
                ctx.shadowColor = 'transparent';
            }

            ctx.restore();
        }

        // Icon
        var iconCol = active ? (isExit ? '#ff7777' : '#77bbff') : '#aaaacc';
        this.changeTextColor(iconCol);
        this.contents.fontSize = m.iSize;
        var iconX = rect.x + Math.max(6, Math.round(m.btnW * 0.06));
        this.drawText(btn.icon, iconX, rect.y, m.iSize + 4, rect.h, 'left');

        // Label
        var labelCol = active ? '#ffffff' : '#ccccdd';
        this.changeTextColor(labelCol);
        this.contents.fontSize = m.fSize;
        var labelX = iconX + m.iSize + Math.max(4, Math.round(m.btnW * 0.05));
        var labelW = rect.w - (labelX - rect.x) - Math.max(4, Math.round(m.btnW * 0.04));
        this.drawText(btn.label, labelX, rect.y, labelW, rect.h, 'left');

        this.resetTextColor();
        this.contents.fontSize = this.standardFontSize();
    };

    // ── Coordinate mapping ────────────────────────────────────────────────────

    /**
     * Converts raw client pixel (from native touch event) → window local coords.
     * Uses getBoundingClientRect so it is correct at any canvas CSS scale or
     * letterbox offset (landscape/portrait, all Android window sizes).
     */
    Window_TitleSidePanel.prototype._clientToLocal = function (cx, cy) {
        var canvas = Graphics._canvas || document.getElementById('GameCanvas');
        var cr = canvas
            ? canvas.getBoundingClientRect()
            : { left:0, top:0, width: Graphics.width, height: Graphics.height };
        var scaleX = Graphics.boxWidth  / cr.width;
        var scaleY = Graphics.boxHeight / cr.height;
        return {
            x: (cx - cr.left) * scaleX - this.x - this.standardPadding(),
            y: (cy - cr.top)  * scaleY - this.y - this.standardPadding()
        };
    };

    /**
     * Converts MV's TouchInput box-coordinates → window local coords.
     * Used for mouse hover / click fallback.
     */
    Window_TitleSidePanel.prototype._mvToLocal = function (tx, ty) {
        return {
            x: tx - this.x - this.standardPadding(),
            y: ty - this.y - this.standardPadding()
        };
    };

    Window_TitleSidePanel.prototype._hitIndex = function (lx, ly) {
        for (var i = 0; i < this._buttonRects.length; i++) {
            var r = this._buttonRects[i];
            if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return i;
        }
        return -1;
    };

    // ── Native touch event binding ────────────────────────────────────────────
    Window_TitleSidePanel.prototype._bindTouchEvents = function () {
        if (this._touchBound) return;
        var self   = this;
        var canvas = Graphics._canvas || document.getElementById('GameCanvas');
        if (!canvas) return;

        this._onTouchStart = function (e) {
            if (!self.parent) return;
            var t     = e.changedTouches[0];
            var local = self._clientToLocal(t.clientX, t.clientY);
            var idx   = self._hitIndex(local.x, local.y);
            if (idx >= 0) {
                e.preventDefault();   // block scroll / pinch-zoom
                self._pressIndex = idx;
                self._hoverIndex = idx;
                self.refresh();
            }
        };

        this._onTouchEnd = function (e) {
            if (!self.parent) return;
            var fired = self._pressIndex;
            self._pressIndex = -1;
            self._hoverIndex = -1;
            self.refresh();
            if (fired < 0) return;
            var t     = e.changedTouches[0];
            var local = self._clientToLocal(t.clientX, t.clientY);
            var idx   = self._hitIndex(local.x, local.y);
            if (idx === fired) {
                e.preventDefault();
                SoundManager.playOk();
                BUTTONS[fired].action();
            }
        };

        this._onTouchCancel = function () {
            if (self._pressIndex >= 0) {
                self._pressIndex = -1;
                self._hoverIndex = -1;
                self.refresh();
            }
        };

        canvas.addEventListener('touchstart',  this._onTouchStart,  { passive: false });
        canvas.addEventListener('touchend',    this._onTouchEnd,    { passive: false });
        canvas.addEventListener('touchcancel', this._onTouchCancel, { passive: true  });
        this._touchBound  = true;
        this._touchCanvas = canvas;
    };

    Window_TitleSidePanel.prototype._unbindTouchEvents = function () {
        if (!this._touchBound || !this._touchCanvas) return;
        this._touchCanvas.removeEventListener('touchstart',  this._onTouchStart);
        this._touchCanvas.removeEventListener('touchend',    this._onTouchEnd);
        this._touchCanvas.removeEventListener('touchcancel', this._onTouchCancel);
        this._touchBound  = false;
        this._touchCanvas = null;
    };

    // ── Per-frame update (mouse / desktop fallback) ───────────────────────────
    Window_TitleSidePanel.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        // Skip mouse hover update while a touch press is active
        if (this._pressIndex < 0) {
            var local = this._mvToLocal(TouchInput.x, TouchInput.y);
            var idx   = this._hitIndex(local.x, local.y);
            if (idx !== this._hoverIndex) {
                this._hoverIndex = idx;
                this.refresh();
            }
        }
        // Mouse click fallback (desktop)
        if (TouchInput.isTriggered()) {
            var local2 = this._mvToLocal(TouchInput.x, TouchInput.y);
            var idx2   = this._hitIndex(local2.x, local2.y);
            if (idx2 >= 0) {
                SoundManager.playOk();
                BUTTONS[idx2].action();
            }
        }
    };

    // ── Scene_Title hook ──────────────────────────────────────────────────────
    var _Scene_Title_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function () {
        _Scene_Title_create.call(this);
        this._sidePanel = new Window_TitleSidePanel();
        this.addChild(this._sidePanel);
    };

    var _Scene_Title_terminate = Scene_Title.prototype.terminate;
    Scene_Title.prototype.terminate = function () {
        if (this._sidePanel) {
            this._sidePanel._unbindTouchEvents();
            this.removeChild(this._sidePanel);
            this._sidePanel = null;
        }
        _Scene_Title_terminate.call(this);
    };

}());