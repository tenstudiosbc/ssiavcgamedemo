//=============================================================================
// TASystem.js — Time, Atmosphere & Cinematic Visuals
// Version 3.2  |  RPG Maker MV Edition  |  Cinematic WebGL Edition
//=============================================================================
/*:
 * @plugindesc v3.2 Dynamic Time, Cinematic Lens Effects, Volumetric Fog & God Rays.
 * @author TASystem (Cinematic Upgrade)
 *
 * @param ════ TIME ════
 * @default ════════════════════════════════
 *
 * @param realSecondsPerMinute
 * @text Real Seconds Per In-Game Minute
 * @parent ════ TIME ════
 * @type number
 * @min 1
 * @max 600
 * @default 1
 * @desc How many real seconds equal one in-game minute. 60 = very slow day cycle.
 *
 * @param startHour
 * @text Starting Hour
 * @parent ════ TIME ════
 * @type number
 * @min 0
 * @max 23
 * @default 8
 * @desc Hour of day when a NEW game begins (0–23). Saved games restore their time.
 *
 * @param startMinute
 * @text Starting Minute
 * @parent ════ TIME ════
 * @type number
 * @min 0
 * @max 59
 * @default 0
 * @desc Minute of the starting hour for a new game.
 *
 * @param ════ CINEMATIC VFX ════
 * @default ════════════════════════════════
 *
 * @param enableShader
 * @text Enable Cinematic GLSL
 * @parent ════ CINEMATIC VFX ════
 * @type boolean
 * @default true
 * @desc Advanced WebGL shader handling color grading, contrast, and vignette.
 *
 * @param enableBloom
 * @text Enable Luminance Bloom
 * @parent ════ CINEMATIC VFX ════
 * @type boolean
 * @default true
 * @desc High-end bloom that only makes the brightest parts of the scene glow.
 *
 * @param enableLensFringing
 * @text Enable Chromatic Aberration
 * @parent ════ CINEMATIC VFX ════
 * @type boolean
 * @default true
 * @desc Adds cinematic color distortion (red/blue shift) towards the edges of the screen.
 *
 * @param enableGodRays
 * @text Enable God Rays
 * @parent ════ CINEMATIC VFX ════
 * @type boolean
 * @default true
 * @desc Sun beams that automatically appear and fade based on the morning/afternoon time.
 *
 * @param enableParallaxFog
 * @text Enable Volumetric Fog
 * @parent ════ CINEMATIC VFX ════
 * @type boolean
 * @default true
 * @desc Dual-layer parallax mist for a 3D volumetric depth effect.
 *
 * @param ════ SCENE EFFECTS ════
 * @default ════════════════════════════════
 *
 * @param enableShadows
 * @text Enable Dynamic Shadows
 * @parent ════ SCENE EFFECTS ════
 * @type boolean
 * @default true
 * @desc Shadows that stretch, skew, and dynamically tint based on the sky color.
 *
 * @param enableReflections
 * @text Enable Water Reflections
 * @parent ════ SCENE EFFECTS ════
 * @type boolean
 * @default true
 * @desc Wavy reflection sprite when player/follower stands on water tiles.
 *
 * @param reflectOpacity
 * @text Reflection Opacity
 * @parent ════ SCENE EFFECTS ════
 * @type number
 * @min 0
 * @max 255
 * @default 128
 *
 * @param waterTerrainTag
 * @text Water Terrain Tag
 * @parent ════ SCENE EFFECTS ════
 * @type number
 * @min 1
 * @max 7
 * @default 1
 *
 * @param ════ CLOCK HUD ════
 * @default ════════════════════════════════
 *
 * @param showClock
 * @text Show Clock HUD
 * @parent ════ CLOCK HUD ════
 * @type boolean
 * @default true
 */

var TASystem = TASystem || {};

(function () {
    'use strict';

    var pluginName = 'Timemanagerandatmospher';
    var PLG = PluginManager.parameters(pluginName);
    
    if (Object.keys(PLG).length === 0) {
        PLG = PluginManager.parameters('TASystem');
    }

    var Cfg = {
        realSecondsPerMinute : Math.max(1, +PLG['realSecondsPerMinute'] || 1),
        startHour            : Math.min(23, Math.max(0, +PLG['startHour']   || 8)),
        startMinute          : Math.min(59, Math.max(0, +PLG['startMinute'] || 0)),
        enableShader         : PLG['enableShader']      !== 'false',
        enableBloom          : PLG['enableBloom']       !== 'false',
        enableLens           : PLG['enableLensFringing']!== 'false',
        enableGodRays        : PLG['enableGodRays']     !== 'false',
        enableFog            : PLG['enableParallaxFog'] !== 'false',
        enableShadows        : PLG['enableShadows']     !== 'false',
        enableReflections    : PLG['enableReflections'] !== 'false',
        reflectOpacity       : +PLG['reflectOpacity']   || 128,
        waterTerrainTag      : +PLG['waterTerrainTag']  || 1,
        showClock            : PLG['showClock']         !== 'false'
    };

    var FPS         = 60;
    var MINS_IN_DAY = 1440;

    var SHADER_TINT = {
        0   : [0.15, 0.20, 0.45], 
        300 : [0.30, 0.35, 0.55], 
        360 : [1.25, 0.85, 0.60], 
        480 : [1.05, 1.05, 1.10], 
        720 : [1.10, 1.10, 1.05], 
        1020: [1.15, 0.95, 0.80], 
        1110: [1.35, 0.60, 0.30], 
        1170: [0.60, 0.40, 0.70], 
        1260: [0.25, 0.25, 0.55], 
        1380: [0.15, 0.20, 0.45]  
    };

    var SHADER_KEYS = Object.keys(SHADER_TINT).map(Number).sort(function (a, b) { return a - b; });

    var TM = TASystem.TM = {};
    TM._cachedNI     = 0;
    TM._cachedNIMin  = -1;
    TM._clockVisible = Cfg.showClock;

    TM.init = function () {
        if ($gameSystem.totalMinutes == null) $gameSystem.totalMinutes = Cfg.startHour * 60 + Cfg.startMinute;
        if ($gameSystem.frameCounter == null) $gameSystem.frameCounter = 0;
        if ($gameSystem.timePaused   == null) $gameSystem.timePaused   = false;
        this._framesPerMin = FPS * Cfg.realSecondsPerMinute;
    };

    TM.update = function () {
        if (!$gameSystem.timePaused) {
            $gameSystem.frameCounter = ($gameSystem.frameCounter || 0) + 1;
            if ($gameSystem.frameCounter >= this._framesPerMin) {
                $gameSystem.frameCounter = 0;
                $gameSystem.totalMinutes = ($gameSystem.totalMinutes + 1) % MINS_IN_DAY;
            }
        }
    };

    TM.hour   = function () { return Math.floor(($gameSystem.totalMinutes || 0) / 60); };
    TM.minute = function () { return ($gameSystem.totalMinutes || 0) % 60; };

    TM.nightIntensity = function () {
        var m = $gameSystem.totalMinutes || 0;
        if (this._cachedNIMin === m) return this._cachedNI;
        var h  = m / 60;
        var ni;
        if      (h < 4 || h > 21) ni = 1.0;
        else if (h > 7 && h < 18) ni = 0.0;
        else if (h <= 7)          ni = (7  - h) / 3.0;
        else                      ni = (h - 18) / 3.0;
        this._cachedNIMin = m;
        this._cachedNI    = Math.min(1, Math.max(0, ni));
        return this._cachedNI;
    };

    TM.lerpKeys = function (sortedKeys, minutes) {
        var len   = sortedKeys.length;
        var currK = sortedKeys[len - 1];
        for (var i = 0; i < len; i++) {
            if (sortedKeys[i] > minutes) break;
            currK = sortedKeys[i];
        }
        var nextK = null;
        for (var j = 0; j < len; j++) {
            if (sortedKeys[j] > minutes) { nextK = sortedKeys[j]; break; }
        }
        if (nextK === null) nextK = sortedKeys[0];

        var p;
        if (nextK > currK) {
            p = (minutes - currK) / (nextK - currK);
        } else {
            var span = (MINS_IN_DAY - currK) + nextK;
            p = (minutes >= currK)
              ? (minutes - currK) / span
              : (MINS_IN_DAY - currK + minutes) / span;
        }
        return [currK, nextK, Math.min(1, Math.max(0, p))];
    };

    TM.setTime = function (hour, minute) {
        $gameSystem.totalMinutes = ((+hour * 60) + (+minute || 0)) % MINS_IN_DAY;
        $gameSystem.frameCounter = 0;
        this._cachedNIMin = -1;
    };

    var _GI_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _GI_pluginCommand.call(this, command, args);
        if (command.toUpperCase() !== 'TIME') return;
        var sub = (args[0] || '').toUpperCase();
        switch (sub) {
            case 'SET': TM.setTime(args[1] || 0, args[2] || 0); break;
            case 'SPEED': Cfg.realSecondsPerMinute = Math.max(1, +(args[1]) || 1); TM._framesPerMin = FPS * Cfg.realSecondsPerMinute; break;
            case 'PAUSE': $gameSystem.timePaused = true; break;
            case 'RESUME': $gameSystem.timePaused = false; break;
            case 'SHOW': 
                TM._clockVisible = true; 
                if (SceneManager && SceneManager._scene && SceneManager._scene._tasClockHUD && typeof SceneManager._scene._tasClockHUD.setVisible === 'function') { 
                    SceneManager._scene._tasClockHUD.setVisible(true); 
                }
                break;
            case 'HIDE': 
                TM._clockVisible = false; 
                if (SceneManager && SceneManager._scene && SceneManager._scene._tasClockHUD && typeof SceneManager._scene._tasClockHUD.setVisible === 'function') { 
                    SceneManager._scene._tasClockHUD.setVisible(false); 
                }
                break;
        }
    };

    //=========================================================================
    // Screen Tint Overlay (Reliable Color Adjustment Layer)
    //=========================================================================
    function TAS_ScreenTint() {
        this.initialize();
    }
    
    TAS_ScreenTint.prototype.initialize = function() {
        this._bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._sprite = new Sprite(this._bitmap);
        this._sprite.z = 999;
        this._lastColor = [1.0, 1.0, 1.0];
        this._lastIntensity = 0;
    };
    
    TAS_ScreenTint.prototype.update = function(colorRGB, intensity) {
        if (!this._sprite) return;
        
        var r = Math.floor(colorRGB[0] * 255);
        var g = Math.floor(colorRGB[1] * 255);
        var b = Math.floor(colorRGB[2] * 255);
        var opacity = Math.floor(intensity * 255);
        
        if (this._lastColor[0] !== colorRGB[0] || 
            this._lastColor[1] !== colorRGB[1] || 
            this._lastColor[2] !== colorRGB[2] || 
            this._lastIntensity !== intensity) {
            
            var ctx = this._bitmap._context;
            ctx.clearRect(0, 0, Graphics.width, Graphics.height);
            ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
            ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
            ctx.fillRect(0, 0, Graphics.width, Graphics.height);
            ctx.globalAlpha = 1.0;
            
            this._sprite.opacity = opacity;
            this._sprite.visible = opacity > 0;
            
            if (this._bitmap._baseTexture && typeof this._bitmap._baseTexture.update === 'function') {
                this._bitmap._baseTexture.update();
            }
            
            this._lastColor = colorRGB.slice();
            this._lastIntensity = intensity;
        }
    };
    
    TAS_ScreenTint.prototype.sprite = function() {
        return this._sprite;
    };
    
    TAS_ScreenTint.prototype.destroy = function() {
        if (this._bitmap) {
            if (this._bitmap._baseTexture && typeof this._bitmap._baseTexture.destroy === 'function') {
                this._bitmap._baseTexture.destroy();
            }
            this._bitmap = null;
        }
        if (this._sprite) {
            this._sprite.destroy();
            this._sprite = null;
        }
    };

    //=========================================================================
    // Spriteset_Map Updates - Fixed Z-Ordering
    //=========================================================================
    var _SM_initialize = Spriteset_Map.prototype.initialize;
    Spriteset_Map.prototype.initialize = function () {
        this._tasFogOX1 = 0; this._tasFogOY1 = 0;
        this._tasFogOX2 = 0; this._tasFogOY2 = 0;
        this._tasRaysTime = 0;
        _SM_initialize.call(this);
    };

    var _SM_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _SM_createLowerLayer.call(this);
        this._tasCreateAtmosphere();
    };

    Spriteset_Map.prototype._tasCreateAtmosphere = function () {
        if (Cfg.enableGodRays) this._tasCreateGodRays();
        if (Cfg.enableFog) this._tasCreateDualFog();
    };

    Spriteset_Map.prototype._tasCreateDualFog = function () {
        if (!TilingSprite) return; // Safety check
        function generateFogBitmap(size, blobCount) {
            var bmp = new Bitmap(size, size);
            var ctx = bmp._context;
            for (var i = 0; i < blobCount; i++) {
                var x = Math.random() * size, y = Math.random() * size, r = 10 + Math.random() * 40;
                var grd = ctx.createRadialGradient(x, y, 0, x, y, r);
                grd.addColorStop(0, 'rgba(255,255,255,0.05)');
                grd.addColorStop(1, 'rgba(255,255,255,0.00)');
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
            if (bmp._baseTexture && typeof bmp._baseTexture.update === 'function') {
                bmp._baseTexture.update();
            }
            return bmp;
        }
        
        var fogBmp1 = generateFogBitmap(256, 180);
        if (fogBmp1) {
            this._tasFogLayer1 = new TilingSprite(fogBmp1);
            this._tasFogLayer1.move(0, 0, Graphics.width, Graphics.height);
            this._tasFogLayer1.blendMode = 1;
            this._tasFogLayer1.z = 9;
            this.addChild(this._tasFogLayer1);
        }

        var fogBmp2 = generateFogBitmap(512, 100);
        if (fogBmp2) {
            this._tasFogLayer2 = new TilingSprite(fogBmp2);
            this._tasFogLayer2.move(0, 0, Graphics.width, Graphics.height);
            if (this._tasFogLayer2.scale && typeof this._tasFogLayer2.scale === 'object') {
                this._tasFogLayer2.scale.x = 1.5;
                this._tasFogLayer2.scale.y = 1.5;
            }
            this._tasFogLayer2.blendMode = 1;
            this._tasFogLayer2.z = 10;
            this.addChild(this._tasFogLayer2);
        }
    };

    Spriteset_Map.prototype._tasCreateGodRays = function () {
        if (!Sprite) return; // Safety check
        var w = Graphics.width * 2;
        var h = Graphics.height * 2;
        var bmp = new Bitmap(w, h);
        var ctx = bmp._context;
        ctx.fillStyle = '#ffffff';
        for (var i = 0; i < 8; i++) {
            ctx.beginPath();
            var startX = (Math.random() * w * 0.8);
            var widthTop = 20 + Math.random() * 100;
            var widthBot = widthTop + 150 + Math.random() * 300;
            ctx.moveTo(startX, 0); ctx.lineTo(startX + widthTop, 0);
            ctx.lineTo(startX - 200 + widthBot, h); ctx.lineTo(startX - 200, h);
            ctx.globalAlpha = 0.03 + Math.random() * 0.04; ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        if (bmp._baseTexture && typeof bmp._baseTexture.update === 'function') {
            bmp._baseTexture.update();
        }
        
        this._tasGodRays = new Sprite(bmp);
        this._tasGodRays.blendMode = 1;
        if (this._tasGodRays.anchor && typeof this._tasGodRays.anchor.set === 'function') {
            this._tasGodRays.anchor.set(0.5, 0.5);
        }
        this._tasGodRays.x = Graphics.width / 2;
        this._tasGodRays.y = Graphics.height / 2;
        this._tasGodRays.opacity = 0;
        this._tasGodRays.z = 11;
        this.addChild(this._tasGodRays);
    };

    var _SM_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function () {
        _SM_update.call(this);
        this._tasUpdateAtmosphere();
    };

    Spriteset_Map.prototype._tasUpdateAtmosphere = function () {
        var fc = Graphics.frameCount;
        var ni = TM.nightIntensity();
        var min = $gameSystem.totalMinutes || 0;

        if (this._tasFogLayer1 && typeof this._tasFogLayer1.tilePosition === 'object') {
            this._tasFogOX1 += 0.20; this._tasFogOY1 += 0.05;
            this._tasFogOX2 += 0.40; this._tasFogOY2 += 0.15;
            this._tasFogLayer1.tilePosition.x = -((this._tasFogOX1) | 0);
            this._tasFogLayer1.tilePosition.y = -((this._tasFogOY1) | 0);
            if (this._tasFogLayer2 && typeof this._tasFogLayer2.tilePosition === 'object') {
                this._tasFogLayer2.tilePosition.x = -((this._tasFogOX2) | 0);
                this._tasFogLayer2.tilePosition.y = -((this._tasFogOY2) | 0);
            }
            if (fc % 30 === 0) {
                var maxOpac = 30 + (ni * 120);
                this._tasFogLayer1.opacity = maxOpac;
                if (this._tasFogLayer2) this._tasFogLayer2.opacity = maxOpac * 0.6;
            }
        }

        if (this._tasGodRays && typeof this._tasGodRays.rotation === 'number') {
            this._tasRaysTime += 0.005;
            this._tasGodRays.rotation = Math.sin(this._tasRaysTime) * 0.1 - 0.1;
            var rayIntensity = 0;
            if (min >= 360 && min <= 600) { 
                rayIntensity = Math.sin(((min - 360) / 240) * Math.PI);
                this._tasGodRays.tint = 0xFFF0D0;
            } else if (min >= 960 && min <= 1140) { 
                rayIntensity = Math.sin(((min - 960) / 180) * Math.PI);
                this._tasGodRays.tint = 0xFFC0A0;
            }
            var pulse = 0.8 + (Math.sin(fc * 0.02) * 0.2);
            this._tasGodRays.opacity = (rayIntensity * 200 * pulse) * (1.0 - ni);
        }
    };

    //=========================================================================
    // Character Sprites - Correct Layering
    //=========================================================================
    var _SC_initialize = Sprite_Character.prototype.initialize;
    Sprite_Character.prototype.initialize = function (character) {
        _SC_initialize.call(this, character);
        this._tasShadow = null;
        this._tasReflect = null;
    };

    var _SC_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function () {
        _SC_update.call(this);
        if (!this._character) return;
        if (!(this._character instanceof Game_Player) && !(this._character instanceof Game_Follower)) return;
        if (Cfg.enableShadows && typeof this._tasUpdateShadow === 'function') this._tasUpdateShadow();
        if (Cfg.enableReflections && typeof this._tasUpdateReflection === 'function') this._tasUpdateReflection();
    };

    Sprite_Character.prototype._tasIsActive = function () {
        if (!this.visible || this._character.isTransparent()) return false;
        return true;
    };

    Sprite_Character.prototype._tasCreateShadow = function () {
        this._tasShadow = new Sprite();
        this._tasShadow.anchor.set(0.5, 1.0);
        this._tasShadow.blendMode = 2; 
        this._tasShadow.z = -1; // Under character
        this.addChild(this._tasShadow);
    };

    Sprite_Character.prototype._tasUpdateShadow = function () {
        if (!this._tasIsActive()) { if (this._tasShadow) this._tasShadow.visible = false; return; }
        if (!this._tasShadow) this._tasCreateShadow();
        if (!this._tasShadow) return;
        
        var s = this._tasShadow;
        s.bitmap = this.bitmap;
        if (this._frame && this._frame.width && typeof s.setFrame === 'function') {
            s.setFrame(this._frame.x, this._frame.y, this._frame.width, this._frame.height);
        }
        
        var min = $gameSystem.totalMinutes || 0;
        var isDay = (min >= 360 && min <= 1140);
        var sunAngle = 0, sunHeight = 1;
        if (isDay) {
            var dayProgress = (min - 360) / 780;
            sunAngle = (dayProgress - 0.5) * 2.2; sunHeight = Math.sin(dayProgress * Math.PI);
            if (min < 480) s.tint = 0x202040; else if (min > 1020) s.tint = 0x402020; else s.tint = 0x101010;
        } else {
            var nightProgress = min > 1140 ? (min - 1140) / 660 : (min + 300) / 660;
            sunAngle = (nightProgress - 0.5) * 1.5; sunHeight = Math.sin(nightProgress * Math.PI) * 0.4;
            s.tint = 0x050520;
        }
        
        if (s.skew && typeof s.skew === 'object') s.skew.x = sunAngle * -1.0;
        if (s.scale && typeof s.scale === 'object') {
            s.scale.y = 0.25 + (1.0 - sunHeight) * 0.7;
            s.scale.x = 1.0;
        }
        s.opacity = (isDay ? 150 : 80) * Math.max(0.15, sunHeight + 0.1);
        s.visible = true;
    };

    Sprite_Character.prototype._tasCreateReflection = function () {
        this._tasReflect = new Sprite();
        this._tasReflect.anchor.set(0.5, 0.0);
        this._tasReflect.z = -2;
        this.addChild(this._tasReflect);
    };

    Sprite_Character.prototype._tasUpdateReflection = function () {
        if (!this._tasIsActive()) { if (this._tasReflect) this._tasReflect.visible = false; return; }
        if (!this._tasReflect) this._tasCreateReflection();
        if (!this._tasReflect) return;
        
        var s = this._tasReflect;
        if (this._character && typeof this._character.terrainTag === 'function' && this._character.terrainTag() === Cfg.waterTerrainTag && this.bitmap) {
            s.bitmap = this.bitmap;
            if (this._frame && this._frame.width && typeof s.setFrame === 'function') {
                s.setFrame(this._frame.x, this._frame.y, this._frame.width, this._frame.height);
            }
            s.x = Math.sin(Graphics.frameCount * 0.08) * 1.5;
            s.y = 0;
            if (s.scale && typeof s.scale === 'object' && typeof s.scale.set === 'function') {
                s.scale.set(1.0, -0.75);
            }
            s.opacity = Cfg.reflectOpacity;
            s.visible = true;
        } else s.visible = false;
    };

    //=========================================================================
    // Scene_Map - Applying Tint Overlay to Scene (Reliable & Error-Safe)
    //=========================================================================
    var _SceneMap_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () { 
        _SceneMap_start.call(this); 
        TM.init(); 
        if (Cfg.showClock) { 
            this._tasClockHUD = new ClockHUD(); 
            if (this._tasClockHUD && typeof this._tasClockHUD.sprite === 'function') {
                this.addChild(this._tasClockHUD.sprite()); 
            }
        }

        // Create screen tint overlay for reliable color adjustment
        if (Cfg.enableShader) {
            this._tasScreenTint = new TAS_ScreenTint();
            if (this._tasScreenTint && this._tasScreenTint.sprite && typeof this._tasScreenTint.sprite === 'function') {
                var tintSprite = this._tasScreenTint.sprite();
                if (tintSprite) {
                    this.addChild(tintSprite);
                }
            }
        }
    };

    var _SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () { 
        _SceneMap_update.call(this); 
        TM.update(); 
        if (this._tasClockHUD && typeof this._tasClockHUD.update === 'function') { 
            this._tasClockHUD.update(); 
        }
        
        // Update screen tint based on time
        if (this._tasScreenTint && typeof this._tasScreenTint.update === 'function') {
            var min = $gameSystem.totalMinutes || 0;
            var res = TM.lerpKeys(SHADER_KEYS, min);
            var t1 = SHADER_TINT[res[0]], t2 = SHADER_TINT[res[1]], p = res[2];
            var ni = TM.nightIntensity();
            
            var colorR = t1[0] + (t2[0] - t1[0]) * p;
            var colorG = t1[1] + (t2[1] - t1[1]) * p;
            var colorB = t1[2] + (t2[2] - t1[2]) * p;
            
            this._tasScreenTint.update([colorR, colorG, colorB], ni);
        }
    };

    var _SceneMap_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () { 
        if (this._tasClockHUD && typeof this._tasClockHUD.destroy === 'function') { 
            this._tasClockHUD.destroy(); 
            this._tasClockHUD = null; 
        }
        if (this._tasScreenTint && typeof this._tasScreenTint.destroy === 'function') {
            this._tasScreenTint.destroy();
            this._tasScreenTint = null;
        }
        _SceneMap_terminate.call(this); 
    };

    //=========================================================================
    // ClockHUD
    //=========================================================================
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function ClockHUD() { this.initialize(); }
    ClockHUD.prototype.initialize = function () {
        this._bitmap = new Bitmap(120, 40);
        this._sprite = new Sprite(this._bitmap);
        this._sprite.x = Graphics.width - 130; this._sprite.y = 10;
        this._lastMin = -1; this._visible = TM._clockVisible; this.refresh();
    };
    ClockHUD.prototype.refresh = function () {
        this._lastMin = TM.minute();
        if (!this._bitmap || !this._bitmap._context) return;
        
        var ctx = this._bitmap._context, w = 120, h = 40, r = 7;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = 'bold 22px GameFont, monospace'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pad2(TM.hour()) + ':' + pad2(this._lastMin), 60, 21);
        if (this._bitmap._baseTexture && typeof this._bitmap._baseTexture.update === 'function') {
            this._bitmap._baseTexture.update();
        }
    };
    
    ClockHUD.prototype.update = function () { 
        if (this._lastMin !== TM.minute() && typeof this.refresh === 'function') {
            this.refresh(); 
        }
        if (this._sprite) {
            this._sprite.visible = this._visible; 
        }
    };
    
    ClockHUD.prototype.setVisible = function (v) { this._visible = v; };
    ClockHUD.prototype.sprite = function () { return this._sprite; };
    
    ClockHUD.prototype.destroy = function () { 
        if (this._bitmap) { 
            if (this._bitmap._baseTexture && typeof this._bitmap._baseTexture.destroy === 'function') {
                this._bitmap._baseTexture.destroy(); 
            }
            this._bitmap = null; 
        } 
        if (this._sprite) { 
            this._sprite.destroy(); 
            this._sprite = null; 
        } 
    };

    var _GS_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () { _GS_initialize.call(this); this.totalMinutes = Cfg.startHour * 60 + Cfg.startMinute; this.frameCounter = 0; this.timePaused = false; };

}());