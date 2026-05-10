/*:
 * @target MV
 * @plugindesc v4.0 Modern Animated Gacha System (Responsive HTML/CSS)
 * @author Gemini / AI Upgrade
 *
 * @help
 * ============================================================================
 * Features Included (v4.0 Mobile & Modern Upgrade):
 * ============================================================================
 * - Global Access: Call via Plugin Command: OpenGacha
 * OR via Script: SceneManager.push(Scene_ModernGacha)
 * - Modern Glass UI: Replaces RPG Maker windows with beautiful, animated
 * HTML/CSS overlays featuring blur effects and smooth transitions.
 * - Mobile Responsive: UI scales dynamically. Buttons auto-resize to be 
 * touch-friendly on smartphones.
 * - Gacha Animations: Staggered pop-in effects for 10x pulls and glowing 
 * hover states.
 * - Highly Configurable: Tweak colors, UI text, and layouts directly from 
 * the plugin manager.
 *
 * ============================================================================
 * @param --- General Settings ---
 * @default 
 *
 * @param currencyName
 * @text Currency Name
 * @type string
 * @default Stellar Jades
 * @desc What your gacha currency is called.
 *
 * @param gachaBgImage
 * @text Default Background Image
 * @type file
 * @dir img/pictures/
 * @desc Background picture (leave empty for black/blur).
 *
 * @param --- Tracking ---
 * @default 
 *
 * @param pityVariableId
 * @text Pity Variable ID
 * @type variable
 * @default 50
 *
 * @param gemsVariableId
 * @text Currency Variable ID
 * @type variable
 * @default 52
 *
 * @param --- Rates & Costs ---
 * @default 
 *
 * @param singlePullCost
 * @text Single Pull Cost
 * @type number
 * @default 160
 *
 * @param tenPullCost
 * @text 10x Pull Cost
 * @type number
 * @default 1600
 *
 * @param hardPityThreshold
 * @text Hard Pity Threshold
 * @type number
 * @default 90
 *
 * @param --- Banners ---
 * @default 
 *
 * @param banners
 * @text Banners Configuration
 * @type struct<Banner>[]
 * @default []
 *
 * @param fiveStarPool
 * @text Standard 5-Star Pool
 * @type actor[]
 * @default ["1"]
 *
 * @param fourStarPool
 * @text Standard 4-Star Pool
 * @type actor[]
 * @default ["5","6"]
 *
 * @param --- Modern UI Customization ---
 * @default
 * * @param themeColor
 * @text Primary Theme Color
 * @type string
 * @default #ffcc00
 * @desc Hex color code for rare drops and accents.
 * * @param accentColor
 * @text Secondary Accent Color
 * @type string
 * @default #00d4ff
 * @desc Hex color code for standard text/highlights.
 * * @param btnColor
 * @text Pull Button Color
 * @type string
 * @default rgba(255, 255, 255, 0.1)
 * @desc CSS Background for buttons (e.g., rgba, hex, or gradients)
 * * @param textPull1
 * @text "Pull 1x" Text
 * @type string
 * @default Warp x1
 * * @param textPull10
 * @text "Pull 10x" Text
 * @type string
 * @default Warp x10
 * * @param textPity
 * @text "Pity" Label
 * @type string
 * @default Guarantee in: 
 * * @param textClose
 * @text "Close Menu" Text
 * @type string
 * @default Close
 */

/*~struct~Banner:
 * @param id @text Banner ID @type number @default 1
 * @param name @text Tab Name @type string @default Limited Warp
 * @param subtitle @text Banner Subtitle @type string @default Character Event Warp
 * @param image @text Banner Image @type file @dir img/pictures/
 * @param featured5Star @text Featured 5-Stars @type actor[]
 * @param rate5 @text 5-Star Rate (%) @type number @decimals 2 @default 0.60
 * @param rate4 @text 4-Star Rate (%) @type number @decimals 2 @default 5.10
 */

// Global Reference
function Scene_ModernGacha() { this.initialize.apply(this, arguments); }

(function() {
    'use strict';

    const pluginName = 'ModernGachaSystem';
    const params = PluginManager.parameters(pluginName);

    function parseJSON(str, fallback) {
        try { return JSON.parse(str); } catch (e) { return fallback; }
    }

    // --- Config Setup ---
    const CFG = {
        currency: params.currencyName || "Gems",
        varPity: Number(params.pityVariableId) || 50,
        varGems: Number(params.gemsVariableId) || 52,
        cost1: Number(params.singlePullCost) || 160,
        cost10: Number(params.tenPullCost) || 1600,
        hardPity: Number(params.hardPityThreshold) || 90,
        bgImage: params.gachaBgImage || "",
        
        // UI Config
        colorTheme: params.themeColor || "#ffcc00",
        colorAccent: params.accentColor || "#00d4ff",
        colorBtn: params.btnColor || "rgba(255, 255, 255, 0.1)",
        txt1: params.textPull1 || "Warp x1",
        txt10: params.textPull10 || "Warp x10",
        txtPity: params.textPity || "Guarantee in: ",
        txtClose: params.textClose || "Close",
        
        pool5: parseJSON(params.fiveStarPool, []).map(Number),
        pool4: parseJSON(params.fourStarPool, []).map(Number),
        
        banners: parseJSON(params.banners, []).map(s => {
            const b = parseJSON(s, {});
            return {
                id: Number(b.id),
                name: b.name || "Banner",
                subtitle: b.subtitle || "",
                image: b.image || "",
                featured5: parseJSON(b.featured5Star, []).map(Number),
                rate5: Number(b.rate5) || 0.6,
                rate4: Number(b.rate4) || 5.1
            };
        })
    };

    window.GachaManager = {
        _idx: 0,
        currentBanner: function() { return CFG.banners[this._idx] || CFG.banners[0] || {name: "Banner", subtitle: "", image: ""}; },
        setBanner: function(index) { this._idx = index; },
        getGems: function() { return $gameVariables.value(CFG.varGems); },
        getPity: function() { return $gameVariables.value(CFG.varPity); },
        canAfford: function(isTen) { return this.getGems() >= (isTen ? CFG.cost10 : CFG.cost1); },

        executePull: function(isTen) {
            const count = isTen ? 10 : 1;
            const results = [];
            $gameVariables.setValue(CFG.varGems, this.getGems() - (isTen ? CFG.cost10 : CFG.cost1));
            for (let i = 0; i < count; i++) results.push(this.roll());
            return results;
        },

        roll: function() {
            let pity = this.getPity() + 1;
            $gameVariables.setValue(CFG.varPity, pity);
            const b = this.currentBanner();
            const roll = Math.random() * 100;
            let curRate5 = b.rate5 || 0.6;
            
            // Soft Pity Logic
            if (pity >= CFG.hardPity) curRate5 = 100;
            else if (pity >= 74) curRate5 += (pity - 74) * 6;

            let rarity = 3, actorId = 0;
            if (roll < curRate5) {
                rarity = 5;
                $gameVariables.setValue(CFG.varPity, 0); // Reset Pity
                if (b.featured5 && b.featured5.length > 0 && Math.random() < 0.5) {
                    actorId = b.featured5[Math.floor(Math.random() * b.featured5.length)];
                } else if (CFG.pool5.length > 0) {
                    actorId = CFG.pool5[Math.floor(Math.random() * CFG.pool5.length)];
                }
            } else if (roll < curRate5 + (b.rate4 || 5.1)) {
                rarity = 4;
                if (CFG.pool4.length > 0) actorId = CFG.pool4[Math.floor(Math.random() * CFG.pool4.length)];
            }
            if (actorId > 0) $gameParty.addActor(actorId);
            return { rarity, actorId };
        }
    };

    // --- Scene Definition ---
    Scene_ModernGacha.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ModernGacha.prototype.constructor = Scene_ModernGacha;

    Scene_ModernGacha.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createBackground();
        this.createBannerSprite();
        this.createHtmlUI();
    };

    Scene_ModernGacha.prototype.createBackground = function() {
        this._bgSprite = new Sprite();
        if (CFG.bgImage) {
            this._bgSprite.bitmap = ImageManager.loadPicture(CFG.bgImage);
        } else {
            this._bgSprite.bitmap = new Bitmap(Graphics.boxWidth, Graphics.boxHeight);
            this._bgSprite.bitmap.fillAll('#0b0e14'); // Dark sleek background
        }
        this.addChild(this._bgSprite);
    };

    Scene_ModernGacha.prototype.createBannerSprite = function() {
        // Sprite sits behind HTML UI to maintain standard game rendering
        this._bannerSprite = new Sprite();
        this._bannerSprite.anchor.set(0.5, 0.5);
        this._bannerSprite.x = Graphics.boxWidth / 2;
        this._bannerSprite.y = Graphics.boxHeight / 2;
        this.addChild(this._bannerSprite);
        this.updateBannerImage();
    };

    Scene_ModernGacha.prototype.updateBannerImage = function() {
        const b = GachaManager.currentBanner();
        if (b && b.image) {
            this._bannerSprite.bitmap = ImageManager.loadPicture(b.image);
            this._bannerSprite.opacity = 0; // Starts 0 for fade in
        }
    };

    Scene_ModernGacha.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._bannerSprite && this._bannerSprite.opacity < 255) {
            this._bannerSprite.opacity += 10; // Fade in animation
        }
        
        // Escape / Cancel mapping
        if (!this._isDisplayingResults && (Input.isTriggered('cancel') || TouchInput.isCancelled())) {
            this.closeScene();
        }
    };

    // --- Massive HTML/CSS Injection ---
    Scene_ModernGacha.prototype.createHtmlUI = function() {
        this._uiContainer = document.createElement('div');
        this._uiContainer.id = 'modern-gacha-ui';
        
        // Setup CSS rules
        const style = document.createElement('style');
        style.innerHTML = `
            #modern-gacha-ui {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 999; display: flex; flex-direction: column; justify-content: space-between;
                font-family: 'GameFont', Arial, sans-serif; user-select: none;
                pointer-events: none; /* Let canvas get clicks where there's no UI */
            }
            
            .mg-interactive { pointer-events: auto; } /* Re-enable clicks for UI elements */

            /* Header / Tabs */
            .mg-header {
                display: flex; justify-content: space-between; align-items: flex-start;
                padding: 2vw 3vw; background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%);
            }
            .mg-tabs { display: flex; gap: 10px; flex-wrap: wrap; }
            .mg-tab {
                padding: 10px 20px; font-size: 1.2rem; cursor: pointer;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                color: white; border-radius: 30px; transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }
            .mg-tab.active {
                background: ${CFG.colorAccent}44; border-color: ${CFG.colorAccent};
                box-shadow: 0 0 15px ${CFG.colorAccent}66; color: white;
            }

            /* Currency Header */
            .mg-currency {
                background: rgba(0,0,0,0.6); padding: 8px 20px; border-radius: 30px;
                display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(5px);
            }
            .mg-currency-amount { color: ${CFG.colorAccent}; font-weight: bold; font-size: 1.2rem; }

            /* Middle Info */
            .mg-body { padding: 0 4vw; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
            .mg-title { 
                font-size: 3rem; font-weight: bold; color: white; 
                text-shadow: 2px 2px 8px rgba(0,0,0,0.8); margin: 0;
                animation: floatText 4s ease-in-out infinite;
            }
            .mg-subtitle { 
                font-size: 1.5rem; color: ${CFG.colorTheme}; 
                text-shadow: 1px 1px 4px rgba(0,0,0,0.8); margin-top: 5px;
            }
            @keyframes floatText { 0%, 100% {transform: translateY(0);} 50% {transform: translateY(-8px);} }

            /* Footer / Action Buttons */
            .mg-footer {
                padding: 3vw; display: flex; justify-content: space-between; align-items: flex-end;
                background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%);
            }
            .mg-status-pity {
                color: #aaa; font-size: 1.1rem; text-shadow: 1px 1px 2px black;
            }
            .mg-pity-num { color: ${CFG.colorTheme}; font-weight: bold; }

            .mg-actions { display: flex; gap: 15px; flex-wrap: wrap; justify-content: flex-end;}
            .mg-btn {
                padding: 15px 30px; font-size: 1.3rem; font-weight: bold; color: white;
                background: ${CFG.colorBtn}; border: 1px solid rgba(255,255,255,0.3);
                border-radius: 50px; cursor: pointer; backdrop-filter: blur(8px);
                transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                min-width: 140px; text-align: center;
            }
            .mg-btn-close { background: rgba(255,50,50,0.2); }
            .mg-btn:hover, .mg-btn:active {
                transform: scale(1.05); background: rgba(255,255,255,0.2);
                box-shadow: 0 0 20px rgba(255,255,255,0.3);
            }
            .mg-btn-10 { border-color: ${CFG.colorTheme}; box-shadow: 0 0 10px ${CFG.colorTheme}44; }
            .mg-btn-10:hover, .mg-btn-10:active { box-shadow: 0 0 25px ${CFG.colorTheme}aa; background: ${CFG.colorTheme}44; }

            /* Results Overlay */
            #mg-results {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); z-index: 1000; display: none;
                flex-direction: column; align-items: center; justify-content: center;
                pointer-events: auto; opacity: 0; transition: opacity 0.3s;
            }
            .mg-results-title { color: ${CFG.colorAccent}; font-size: 2rem; letter-spacing: 5px; margin-bottom: 30px; animation: glow 2s infinite; }
            .mg-grid { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; width: 90%; max-width: 1000px; }
            
            .mg-card {
                width: 12%; min-width: 100px; background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.6) 100%);
                border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 15px 5px; text-align: center;
                opacity: 0; transform: translateY(30px) scale(0.9);
                animation: popIn 0.5s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .mg-card.r5 { border-color: ${CFG.colorTheme}; box-shadow: 0 0 20px ${CFG.colorTheme}88; background: linear-gradient(180deg, ${CFG.colorTheme}44 0%, rgba(0,0,0,0.8) 100%); }
            .mg-card.r4 { border-color: #cc99ff; box-shadow: 0 0 15px #cc99ff88; }
            .mg-stars { font-size: 1.2rem; color: ${CFG.colorTheme}; margin-bottom: 10px; text-shadow: 0 0 5px ${CFG.colorTheme}; }
            .mg-name { font-size: 1rem; color: white; font-weight: bold; word-wrap: break-word; }
            
            .mg-tap-msg { margin-top: 50px; color: white; opacity: 0.5; font-size: 1.2rem; animation: pulse 1.5s infinite; }

            @keyframes popIn { to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes pulse { 0%, 100% {opacity: 0.3;} 50% {opacity: 1;} }
            @keyframes glow { 0%, 100% {text-shadow: 0 0 10px ${CFG.colorAccent};} 50% {text-shadow: 0 0 25px ${CFG.colorAccent}, 0 0 10px white;} }

            /* Mobile Responsive Rules */
            @media (max-width: 768px) {
                .mg-title { font-size: 2rem; }
                .mg-subtitle { font-size: 1.2rem; }
                .mg-btn { padding: 12px 20px; font-size: 1.1rem; width: 100%; margin-bottom: 10px; }
                .mg-actions { width: 100%; flex-direction: column; align-items: stretch; }
                .mg-footer { flex-direction: column; align-items: flex-start; gap: 15px; }
                .mg-card { width: 25%; min-width: 80px; padding: 10px 5px; }
                .mg-header { flex-direction: column-reverse; gap: 15px; }
            }
        `;
        document.head.appendChild(style);
        this._styleElem = style;

        this.renderInterface();
        document.body.appendChild(this._uiContainer);

        // Results Overlay
        this._resultsDiv = document.createElement('div');
        this._resultsDiv.id = 'mg-results';
        this._resultsDiv.addEventListener('mousedown', this.hideResults.bind(this));
        this._resultsDiv.addEventListener('touchstart', this.hideResults.bind(this));
        document.body.appendChild(this._resultsDiv);
    };

    Scene_ModernGacha.prototype.renderInterface = function() {
        const b = GachaManager.currentBanner();
        const tabsHtml = CFG.banners.map((ban, i) => 
            `<div class="mg-tab mg-interactive ${i === GachaManager._idx ? 'active' : ''}" data-idx="${i}">${ban.name}</div>`
        ).join('');

        this._uiContainer.innerHTML = `
            <div class="mg-header">
                <div class="mg-tabs">${tabsHtml}</div>
                <div class="mg-currency mg-interactive">
                    <span class="mg-currency-amount">${GachaManager.getGems()}</span>
                    <span>${CFG.currency}</span>
                </div>
            </div>
            
            <div class="mg-body">
                <h1 class="mg-title">${b.name}</h1>
                <div class="mg-subtitle">${b.subtitle}</div>
            </div>

            <div class="mg-footer">
                <div class="mg-status-pity">
                    ${CFG.txtPity} <span class="mg-pity-num">${CFG.hardPity - GachaManager.getPity()}</span> Pulls
                </div>
                <div class="mg-actions">
                    <button class="mg-btn mg-btn-close mg-interactive" id="btn-close">${CFG.txtClose}</button>
                    <button class="mg-btn mg-interactive" id="btn-single">${CFG.txt1} <br><span style="font-size:0.8rem;opacity:0.8">${CFG.cost1}</span></button>
                    <button class="mg-btn mg-btn-10 mg-interactive" id="btn-ten">${CFG.txt10} <br><span style="font-size:0.8rem;opacity:0.8">${CFG.cost10}</span></button>
                </div>
            </div>
        `;

        // Bind Events
        const tabs = this._uiContainer.querySelectorAll('.mg-tab');
        tabs.forEach(t => t.addEventListener('mousedown', (e) => this.onTabChange(e.target.dataset.idx)));
        tabs.forEach(t => t.addEventListener('touchstart', (e) => this.onTabChange(e.target.dataset.idx)));

        this.bindBtn('btn-close', () => this.closeScene());
        this.bindBtn('btn-single', () => this.commandPull(false));
        this.bindBtn('btn-ten', () => this.commandPull(true));
    };

    Scene_ModernGacha.prototype.bindBtn = function(id, callback) {
        const el = this._uiContainer.querySelector(`#${id}`);
        if(el) {
            el.addEventListener('mousedown', (e) => { e.preventDefault(); callback(); });
            el.addEventListener('touchstart', (e) => { e.preventDefault(); callback(); });
        }
    };

    Scene_ModernGacha.prototype.onTabChange = function(index) {
        if(GachaManager._idx == index) return;
        SoundManager.playCursor();
        GachaManager.setBanner(Number(index));
        this.updateBannerImage();
        this.renderInterface();
    };

    Scene_ModernGacha.prototype.commandPull = function(isTen) {
        if (GachaManager.canAfford(isTen)) {
            const results = GachaManager.executePull(isTen);
            SoundManager.playUseSkill(); // Play sound before results
            this.showResults(results);
            this.renderInterface(); // Update currency and pity UI immediately
        } else {
            SoundManager.playBuzzer();
        }
    };

    Scene_ModernGacha.prototype.showResults = function(results) {
        this._isDisplayingResults = true;
        this._uiContainer.style.display = 'none'; // Hide main UI
        
        let html = `<div class="mg-results-title">WARP RESULTS</div><div class="mg-grid">`;
        
        results.forEach((r, index) => {
            const actor = $gameActors.actor(r.actorId);
            const name = actor ? actor.name() : "3★ Item";
            const stars = "★".repeat(r.rarity);
            
            // Staggered animation delay
            const delay = index * 0.15; 
            
            html += `
                <div class="mg-card r${r.rarity}" style="animation-delay: ${delay}s">
                    <div class="mg-stars">${stars}</div>
                    <div class="mg-name">${name}</div>
                </div>
            `;
        });
        
        html += `</div><div class="mg-tap-msg">Tap anywhere to continue</div>`;
        this._resultsDiv.innerHTML = html;
        this._resultsDiv.style.display = 'flex';
        
        // Small delay to allow display:flex to apply before fading in
        setTimeout(() => { this._resultsDiv.style.opacity = '1'; }, 50);
    };

    Scene_ModernGacha.prototype.hideResults = function(e) {
        if (!this._isDisplayingResults) return;
        if (e) e.preventDefault();
        
        SoundManager.playCancel();
        this._isDisplayingResults = false;
        this._resultsDiv.style.opacity = '0';
        
        setTimeout(() => { 
            this._resultsDiv.style.display = 'none';
            this._uiContainer.style.display = 'flex'; // Restore main UI
        }, 300);
    };

    Scene_ModernGacha.prototype.closeScene = function() {
        SoundManager.playCancel();
        this.popScene();
    };

    Scene_ModernGacha.prototype.terminate = function() {
        Scene_MenuBase.prototype.terminate.call(this);
        // Clean up DOM elements so they don't leak into the rest of the game
        if (this._uiContainer) document.body.removeChild(this._uiContainer);
        if (this._resultsDiv) document.body.removeChild(this._resultsDiv);
        if (this._styleElem) document.head.removeChild(this._styleElem);
    };

    // --- Plugin Command Integration ---
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'OpenGacha') SceneManager.push(Scene_ModernGacha);
    };

})();