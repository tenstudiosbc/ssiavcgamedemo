/*:
 * @plugindesc Ultra-Modern Honkai Star Rail Photo Mode for RPG Maker MV (Mobile Optimized).
 * @author Gemini
 * * @help
 * Call the photo mode using: SceneManager.push(Scene_PhotoMode);
 * * Features:
 * - Anti-Accidental Exit: Standard "Cancel" inputs (Right Click/Back) are disabled.
 * - Fixed "Shrinking World" bug: Map now fills the screen correctly.
 * - Real Live Map View: Rendered directly in the background.
 * - Zoom Control: Slide to zoom in or out smoothly.
 * - Filters: Cycle through various visual styles.
 * - Filename: SSIAVCScreenshots_{timestamp}
 * - Mobile Optimized: Uses Web Share API for better gallery integration.
 */

(function() {

    function Scene_PhotoMode() {
        this.initialize.apply(this, arguments);
    }

    Scene_PhotoMode.prototype = Object.create(Scene_Base.prototype);
    Scene_PhotoMode.prototype.constructor = Scene_PhotoMode;

    Scene_PhotoMode.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._revealOnTouch = false;
        this._zoomLevel = 1.0;
        this._filterIndex = 0;
        this._filters = [
            { name: "Normal", filter: null },
            { name: "B&W", filter: new PIXI.filters.ColorMatrixFilter() },
            { name: "Sepia", filter: new PIXI.filters.ColorMatrixFilter() },
            { name: "Cool", filter: new PIXI.filters.ColorMatrixFilter() },
            { name: "Vivid", filter: new PIXI.filters.ColorMatrixFilter() }
        ];
        
        this._filters[1].filter.blackAndWhite();
        this._filters[2].filter.sepia();
        this._filters[3].filter.night(0.5);
        this._filters[4].filter.lsd();
    };

    // Prevent standard "Cancel" input from closing the scene
    Scene_PhotoMode.prototype.isCancelEnabled = function() {
        return false;
    };

    // Override the back button/cancel trigger to do nothing
    Scene_PhotoMode.prototype.popScene = function() {
        // Only allow popScene if it's called explicitly by our button
        if (this._isExiting) {
            Scene_Base.prototype.popScene.call(this);
        }
    };

    // Custom method for our specific exit button
    Scene_PhotoMode.prototype.commandExit = function() {
        this._isExiting = true;
        this.popScene();
    };

    Scene_PhotoMode.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createSpriteset();
        this.createWindowLayer();
        this.createUI();
    };

    Scene_PhotoMode.prototype.createSpriteset = function() {
        this._spriteset = new Spriteset_Map();
        this.addChild(this._spriteset);
    };

    Scene_PhotoMode.prototype.createUI = function() {
        this._uiContainer = new Sprite();
        this.addChild(this._uiContainer);

        const margin = 24;
        const btnSize = 64;
        const screenW = Graphics.boxWidth || 816;
        const screenH = Graphics.boxHeight || 624;

        this._buttons = [];

        // 1. TOP BAR
        this._topBar = new Sprite(new Bitmap(screenW, 80));
        this._topBar.bitmap.fontSize = 20;
        this._topBar.bitmap.textColor = '#ffffff';
        this._topBar.bitmap.outlineWidth = 2;
        this._topBar.bitmap.outlineColor = 'rgba(0,0,0,0.5)';
        this._topBar.bitmap.drawText('PHOTO MODE', 30, 20, 300, 40, 'left');
        this._uiContainer.addChild(this._topBar);

        // 2. ZOOM SLIDER AREA (Bottom Right)
        this.createZoomSlider(screenW - 220, screenH - 100);

        // 3. MAIN ACTION BUTTONS
        this.createModernButton(screenW - btnSize - margin, screenH / 2 - btnSize / 2, "📸", this.commandCapture.bind(this));
        this.createModernButton(screenW - btnSize - margin, screenH / 2 + btnSize + 10, "🪄", this.cycleFilters.bind(this));
        this.createModernButton(screenW - btnSize - margin, margin + 10, "👁️", this.toggleUI.bind(this));

        // Exit (Bottom Left) - Uses commandExit now
        this.createModernButton(margin, screenH - btnSize - margin, "✕", this.commandExit.bind(this));
    };

    Scene_PhotoMode.prototype.createZoomSlider = function(x, y) {
        const width = 160;
        const height = 40;
        
        this._sliderContainer = new Sprite(new Bitmap(width, height));
        this._sliderContainer.x = x;
        this._sliderContainer.y = y;
        
        const ctx = this._sliderContainer.bitmap.context;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, height / 2 - 2, width, 4);
        
        this._uiContainer.addChild(this._sliderContainer);
        
        this._knob = new Sprite(new Bitmap(24, 24));
        const kCtx = this._knob.bitmap.context;
        kCtx.beginPath();
        kCtx.arc(12, 12, 10, 0, Math.PI * 2);
        kCtx.fillStyle = '#ffffff';
        kCtx.fill();
        this._knob.anchor.set(0.5, 0.5);
        this._knob.y = y + height / 2;
        this._knob.x = x + (width / 3); 
        this._uiContainer.addChild(this._knob);
    };

    Scene_PhotoMode.prototype.createModernButton = function(x, y, icon, action) {
        const size = 64;
        const button = new Sprite_Button();
        button.bitmap = new Bitmap(size, size);
        const ctx = button.bitmap.context;
        ctx.beginPath();
        ctx.arc(size/2, size/2, (size/2)-4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        button.bitmap.fontSize = 28;
        button.bitmap.drawText(icon, 0, 0, size, size, 'center');
        button.x = x + size/2;
        button.y = y + size/2;
        button.anchor.x = 0.5;
        button.anchor.y = 0.5;
        button.setClickHandler(() => {
            if (SoundManager && SoundManager.playOk) SoundManager.playOk();
            if (action) action();
        });
        this._uiContainer.addChild(button);
        this._buttons.push(button);
    };

    Scene_PhotoMode.prototype.cycleFilters = function() {
        this._filterIndex = (this._filterIndex + 1) % this._filters.length;
        const fObj = this._filters[this._filterIndex];
        this._spriteset.filters = fObj.filter ? [fObj.filter] : null;
    };

    Scene_PhotoMode.prototype.toggleUI = function() {
        if (!this._uiContainer) return;
        this._uiContainer.visible = !this._uiContainer.visible;
        this._revealOnTouch = !this._uiContainer.visible;
    };

    Scene_PhotoMode.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        this.updateButtonVisuals();
        this.updateZoomLogic();
        
        // Disable "Cancel" to quit check manually to be extra safe
        if (Input.isTriggered('escape') || TouchInput.isCancelled()) {
            // Do nothing
        }

        if (this._revealOnTouch && TouchInput.isTriggered()) {
            this._uiContainer.visible = true;
            this._revealOnTouch = false;
        }
    };

    Scene_PhotoMode.prototype.updateButtonVisuals = function() {
        if (!this._buttons) return;
        for (let btn of this._buttons) {
            const isTouched = TouchInput.isPressed() && 
                Math.abs(TouchInput.x - btn.x) < 32 && Math.abs(TouchInput.y - btn.y) < 32;
            btn.scale.x = btn.scale.y = isTouched ? 0.85 : 1.0;
        }
    };

    Scene_PhotoMode.prototype.updateZoomLogic = function() {
        if (!this._uiContainer.visible) return;
        
        if (TouchInput.isPressed()) {
            const tx = TouchInput.x;
            const ty = TouchInput.y;
            const sx = this._sliderContainer.x;
            const sy = this._sliderContainer.y;
            const sw = 160;

            if (tx >= sx - 20 && tx <= sx + sw + 20 && ty >= sy - 20 && ty <= sy + 60) {
                this._knob.x = Math.max(sx, Math.min(sx + sw, tx));
                const ratio = (this._knob.x - sx) / sw;
                this._zoomLevel = 1.0 + (ratio * 2.0);
                this._spriteset.scale.set(this._zoomLevel, this._zoomLevel);
                const offsetX = (Graphics.boxWidth * (1 - this._zoomLevel)) / 2;
                const offsetY = (Graphics.boxHeight * (1 - this._zoomLevel)) / 2;
                this._spriteset.x = offsetX;
                this._spriteset.y = offsetY;
            }
        }
    };

    Scene_PhotoMode.prototype.commandCapture = async function() {
        if (this._uiContainer) this._uiContainer.visible = false;
        
        setTimeout(async () => {
            try {
                const bitmap = SceneManager.snap();
                const canvas = bitmap.canvas;
                const date = new Date();
                const ts = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}${String(date.getSeconds()).padStart(2,'0')}`;
                const filename = `SSIAVCScreenshots_${ts}.png`;
                
                if (navigator.canShare && navigator.share) {
                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], filename, { type: 'image/png' });
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'SSIAVC Screenshot',
                                text: 'Check out my screenshot!'
                            });
                        } catch (err) {
                            this.fallbackDownload(canvas, filename);
                        }
                    });
                } else {
                    this.fallbackDownload(canvas, filename);
                }
                
                this.showFlashEffect();
            } catch (e) {
                console.error(e);
            } finally {
                if (this._uiContainer) this._uiContainer.visible = true;
            }
        }, 200);
    };

    Scene_PhotoMode.prototype.fallbackDownload = function(canvas, filename) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    Scene_PhotoMode.prototype.showFlashEffect = function() {
        const flash = new ScreenSprite();
        flash.setColor(255, 255, 255);
        flash.opacity = 255;
        this.addChild(flash);
        let flashInt = setInterval(() => {
            if (flash.opacity <= 0) {
                this.removeChild(flash);
                clearInterval(flashInt);
            } else { flash.opacity -= 20; }
        }, 16);
    };

    window.Scene_PhotoMode = Scene_PhotoMode;

})();