//=============================================================================
// TSBC_VanguardChronicles_Enhanced.js
// Version : 1.1.4 (Fullscreen Loading Fix)
// Author  : TSBC Games & Gemini
//=============================================================================
/*:
 * @plugindesc v1.1.4 SSIA: Vanguard Chronicles — Fullscreen Loading + Default Title
 * @author TSBC Games
 *
 * @help
 * ============================================================================
 * FIX LOG:
 * - v1.1.4: Fixed loading screen background not filling the screen. The image
 *   is now scaled to cover the full Graphics.width x Graphics.height area.
 * - v1.1.4: Confirmed full intro flow: Splash → HealthWarning → Default Title.
 * - v1.1.3: Removed custom Scene_Title overrides. Default MV title restored.
 * - v1.1.2: Fixed "Scene_LoadingMap is not defined" error.
 * - v1.1.2: Re-ordered class definitions to ensure dependencies are met.
 * ============================================================================
 */

(function () {
    "use strict";

    // =========================================================================
    //  ■ Scene_LoadingScreen (Base for New Game)
    // =========================================================================
    function Scene_LoadingScreen() { this.initialize.apply(this, arguments); }
    Scene_LoadingScreen.prototype = Object.create(Scene_Base.prototype);
    Scene_LoadingScreen.prototype.constructor = Scene_LoadingScreen;

    Scene_LoadingScreen.prototype.initialize = function () {
        Scene_Base.prototype.initialize.call(this);
        this._progress = 0;
        this._complete = false;
    };

    Scene_LoadingScreen.prototype.create = function () {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createLoadingBar();
    };

    Scene_LoadingScreen.prototype.createBackground = function () {
        this._bg = new Sprite();
        this._bg.bitmap = ImageManager.loadPicture('LoadingScreen');

        // Scale to fill the entire screen once the image has loaded
        this._bg.bitmap.addLoadListener(function () {
            if (this._bg.bitmap.width <= 1) {
                // Fallback: solid dark background if image is missing
                this._bg.bitmap = new Bitmap(Graphics.width, Graphics.height);
                this._bg.bitmap.fillAll('#000022');
            } else {
                // Scale sprite so it covers the full screen regardless of source size
                this._bg.scale.x = Graphics.width  / this._bg.bitmap.width;
                this._bg.scale.y = Graphics.height / this._bg.bitmap.height;
            }
        }.bind(this));

        this.addChild(this._bg);
    };

    Scene_LoadingScreen.prototype.createLoadingBar = function () {
        this._barBack = new Sprite(new Bitmap(400, 20));
        this._barBack.x = (Graphics.width - 400) / 2;
        this._barBack.y = Graphics.height - 100;
        this._barBack.bitmap.fillAll('rgba(0,0,0,0.5)');
        this.addChild(this._barBack);

        this._barFront = new Sprite(new Bitmap(400, 20));
        this._barFront.x = this._barBack.x;
        this._barFront.y = this._barBack.y;
        this.addChild(this._barFront);

        this._statusLabel = new Sprite(new Bitmap(400, 40));
        this._statusLabel.x = this._barBack.x;
        this._statusLabel.y = this._barBack.y - 45;
        this.addChild(this._statusLabel);
    };

    Scene_LoadingScreen.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        if (this._complete) return;
        this._progress += (Math.random() * 1.8);
        if (this._progress >= 100) {
            this._progress = 100;
            this._complete = true;
            this.onLoadingComplete();
        }
        this.refreshBar();
    };

    Scene_LoadingScreen.prototype.refreshBar = function () {
        var b = this._barFront.bitmap;
        b.clear();
        var w = (this._progress / 100) * 400;
        b.fillRect(0, 0, w, 20, '#ffffff');

        var lb = this._statusLabel.bitmap;
        lb.clear();
        lb.fontSize = 18;
        lb.drawText("LOADING DATA... " + Math.floor(this._progress) + "%", 0, 0, 400, 40, 'center');
    };

    Scene_LoadingScreen.prototype.onLoadingComplete = function () {
        DataManager.setupNewGame();
        SceneManager.goto(Scene_Map);
    };

    // =========================================================================
    //  ■ Scene_LoadingMap (Defined BEFORE it is called by LoadWrapper)
    // =========================================================================
    function Scene_LoadingMap() { this.initialize.apply(this, arguments); }
    Scene_LoadingMap.prototype = Object.create(Scene_LoadingScreen.prototype);
    Scene_LoadingMap.prototype.constructor = Scene_LoadingMap;

    Scene_LoadingMap.prototype.onLoadingComplete = function () {
        $gameSystem.onAfterLoad();
        if (Scene_Load.prototype.reloadMapIfUpdated) {
            Scene_Load.prototype.reloadMapIfUpdated.call(this);
        }
        SceneManager.goto(Scene_Map);
    };

    // =========================================================================
    //  ■ Scene_Splash (TSBC Logo Intro)
    // =========================================================================
    function Scene_Splash() { this.initialize.apply(this, arguments); }
    Scene_Splash.prototype = Object.create(Scene_Base.prototype);
    Scene_Splash.prototype.constructor = Scene_Splash;

    Scene_Splash.prototype.initialize = function () {
        Scene_Base.prototype.initialize.call(this);
        this._phase = 0;
        this._timer = 0;
    };

    Scene_Splash.prototype.create = function () {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createLogo();
    };

    Scene_Splash.prototype.createBackground = function () {
        this._back = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._back.bitmap.fillAll('black');
        this.addChild(this._back);
    };

    Scene_Splash.prototype.createLogo = function () {
        this._logo = new Sprite();
        this._logo.bitmap = ImageManager.loadPicture('SplashLogo');
        this._logo.anchor.x = 0.5;
        this._logo.anchor.y = 0.5;
        this._logo.x = Graphics.width / 2;
        this._logo.y = Graphics.height / 2;
        this._logo.opacity = 0;
        this.addChild(this._logo);

        this._logo.bitmap.addLoadListener(function () {
            if (this._logo.bitmap.width <= 1) {
                var b = new Bitmap(600, 100);
                b.fontSize = 48;
                b.drawText("TSBC GAMES", 0, 0, 600, 100, 'center');
                this._logo.bitmap = b;
            }
        }.bind(this));
    };

    Scene_Splash.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        if (TouchInput.isTriggered()) {
            this.gotoNextScene();
            return;
        }
        this._timer++;
        if (this._phase === 0) {
            this._logo.opacity += 4;
            if (this._logo.opacity >= 255) { this._phase = 1; this._timer = 0; }
        } else if (this._phase === 1) {
            if (this._timer > 90) this._phase = 2;
        } else {
            this._logo.opacity -= 4;
            if (this._logo.opacity <= 0) this.gotoNextScene();
        }
    };

    Scene_Splash.prototype.gotoNextScene = function () {
        SceneManager.goto(Scene_HealthWarning);
    };

    // =========================================================================
    //  ■ Scene_HealthWarning
    // =========================================================================
    function Scene_HealthWarning() { this.initialize.apply(this, arguments); }
    Scene_HealthWarning.prototype = Object.create(Scene_Base.prototype);
    Scene_HealthWarning.prototype.constructor = Scene_HealthWarning;

    Scene_HealthWarning.prototype.create = function () {
        Scene_Base.prototype.create.call(this);

        var bg = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        bg.bitmap.fillAll('#111');
        this.addChild(bg);

        var text = new Sprite(new Bitmap(Graphics.width, 300));
        text.y = (Graphics.height - 300) / 2;
        text.bitmap.fontSize = 24;
        text.bitmap.drawText("IMPORTANT HEALTH AND SAFETY INFORMATION", 0, 0, Graphics.width, 40, 'center');
        text.bitmap.fontSize = 18;
        text.bitmap.drawText("Please take frequent breaks and play in a well-lit area.", 0, 80, Graphics.width, 30, 'center');
        text.bitmap.drawText("Tap anywhere to continue.", 0, 180, Graphics.width, 30, 'center');
        this.addChild(text);
    };

    Scene_HealthWarning.prototype.update = function () {
        Scene_Base.prototype.update.call(this);
        if (TouchInput.isTriggered() || Input.isTriggered('ok')) {
            SoundManager.playOk();
            SceneManager.goto(Scene_Title);
        }
    };

    // =========================================================================
    //  ■ Scene_Title — Default MV title screen, command routing overrides only
    //
    //  Full intro flow:  Scene_Splash → Scene_HealthWarning → Scene_Title
    //
    //  MV's built-in Scene_Title handles everything visually:
    //    - Title1 / Title2 background images from your project
    //    - Game title text
    //    - "New Game / Continue / Options" command window
    //
    //  Only the two command handlers are overridden:
    //    New Game  → Scene_LoadingScreen  (custom animated loading bar)
    //    Continue  → Scene_LoadWrapper    (custom load wrapper)
    //    Options   → unchanged (default Scene_Options)
    // =========================================================================

    Scene_Title.prototype.commandNewGame = function () {
        DataManager.setupNewGame();
        this._commandWindow.close();
        this.fadeOutAll();
        SceneManager.goto(Scene_LoadingScreen);
    };

    Scene_Title.prototype.commandContinue = function () {
        this._commandWindow.close();
        SceneManager.push(Scene_LoadWrapper);
    };

    // =========================================================================
    //  ■ Scene_LoadWrapper
    // =========================================================================
    function Scene_LoadWrapper() { this.initialize.apply(this, arguments); }
    Scene_LoadWrapper.prototype = Object.create(Scene_Load.prototype);
    Scene_LoadWrapper.prototype.constructor = Scene_LoadWrapper;

    Scene_LoadWrapper.prototype.onSavefileOk = function () {
        if (DataManager.loadGame(this.savefileId())) {
            SoundManager.playLoad();
            this.fadeOutAll();
            SceneManager.goto(Scene_LoadingMap);
        } else {
            this.onLoadFailure();
        }
    };

})();