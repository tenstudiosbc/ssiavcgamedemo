/*:
 * @target MV
 * @plugindesc [v1.8.3] FAB Menu — stability patch: fixes "setTarget of null" during forced Auto-Battle — Gemini (patched)
 * @author Gemini
 *
 * @help
 * v1.8.3: Adds defensive checks and error handling around forced auto-battle
 * execution to prevent "Cannot read property 'setTarget' of null" runtime errors.
 * Also keeps previous visual/layout and touch-responsiveness fixes.
 */

(function() {
    'use strict';

    // --- Configurable values ---
    const MENU_WIDTH = 260;
    const MENU_HEIGHT = 80;
    const HITBOX_SIZE = 56;
    const SAFE_OFFSET = 18;
    const MAIN_FAB_SIZE = 56;
    const SUB_BUTTON_SPACING = 72;
    const OPEN_ANIM_SPEED = 0.22;
    const SUB_ANIM_SPEED = 0.28;
    const TOUCH_COOLDOWN_FRAMES = 12;

    // --- State ---
    let _isAutoBattle = false;
    let _isFastForward = false;
    let _isMenuOpen = false;
    let _touchCooldown = 0;

    // --- Preserve originals ---
    const _Scene_Battle_update = Scene_Battle.prototype.update;
    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    const _Game_Actor_makeAutoBattleActions = Game_Actor.prototype.makeAutoBattleActions;
    const _BattleManager_startInput = BattleManager.startInput;

    // --- Utility: convert local sprite coords to screen coords ---
    function globalPositionOf(sprite) {
        let x = sprite.x || 0;
        let y = sprite.y || 0;
        let p = sprite.parent;
        while (p) {
            x += p.x || 0;
            y += p.y || 0;
            p = p.parent;
        }
        return { x: x, y: y };
    }

    // --- Unified update (fast-forward + FAB animations + cooldown + top-layer enforcement) ---
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);

        if (_touchCooldown > 0) _touchCooldown--;

        // Ensure FAB container stays on top (re-add if some plugin moved it)
        if (this._fabContainer && this._fabContainer.parent !== this) {
            if (this._fabContainer.parent) this._fabContainer.parent.removeChild(this._fabContainer);
            this.addChild(this._fabContainer);
        } else if (this._fabContainer) {
            if (this.children && this.children.length > 0 && this.children[this.children.length - 1] !== this._fabContainer) {
                this.removeChild(this._fabContainer);
                this.addChild(this._fabContainer);
            }
        }

        // FAB background animation
        if (this._fabBg && this._fabBg.visible) {
            const target = _isMenuOpen ? 1.0 : 0.0;
            this._fabBg.scale.x += (target - this._fabBg.scale.x) * OPEN_ANIM_SPEED;
            this._fabBg.scale.y = 1.0;
            if (!_isMenuOpen && this._fabBg.scale.x < 0.06) this._fabBg.visible = false;
        }

        // Sub-buttons animation
        if (this._subButtons && this._subButtons.length) {
            this._subButtons.forEach((btn, i) => {
                if (!btn) return;
                const target = _isMenuOpen ? 1.0 : 0.0;
                btn.scale.x += (target - btn.scale.x) * SUB_ANIM_SPEED;
                btn.scale.y = btn.scale.x;
                const targetX = _isMenuOpen ? -(i + 1) * SUB_BUTTON_SPACING : 0;
                btn.x += (targetX - btn.x) * SUB_ANIM_SPEED;
                btn.visible = (_isMenuOpen || btn.scale.x > 0.05);
            });
        }

        // Manual global touch detection: runs before relying on Sprite_Button internals.
        if (TouchInput.isTriggered() && _touchCooldown === 0 && this._fabContainer) {
            // check main FAB first
            if (this._mainFab) {
                const gp = globalPositionOf(this._mainFab);
                const mx = TouchInput.x;
                const my = TouchInput.y;
                const dx = mx - gp.x;
                const dy = my - gp.y;
                const distSq = dx * dx + dy * dy;
                const radius = MAIN_FAB_SIZE / 2;
                if (distSq <= (radius * radius)) {
                    _touchCooldown = TOUCH_COOLDOWN_FRAMES;
                    this.toggleFabMenu();
                    return;
                }
            }

            // check sub-buttons
            if (this._subButtons && this._subButtons.length) {
                for (let i = 0; i < this._subButtons.length; i++) {
                    const btn = this._subButtons[i];
                    if (!btn || !btn.visible) continue;
                    const gp = globalPositionOf(btn);
                    const mx = TouchInput.x;
                    const my = TouchInput.y;
                    const dx = mx - gp.x;
                    const dy = my - gp.y;
                    const distSq = dx * dx + dy * dy;
                    const radius = HITBOX_SIZE / 2;
                    if (distSq <= (radius * radius)) {
                        if (btn._manualHandler && typeof btn._manualHandler === 'function') {
                            _touchCooldown = TOUCH_COOLDOWN_FRAMES;
                            try {
                                btn._manualHandler();
                            } catch (e) {
                                // swallow handler errors to avoid breaking battle flow
                                console.error('FAB sub-button handler error:', e);
                            }
                            return;
                        }
                        for (let c = 0; c < btn.children.length; c++) {
                            const child = btn.children[c];
                            if (child && typeof child.setClickHandler === 'function' && child._clickHandler) {
                                _touchCooldown = TOUCH_COOLDOWN_FRAMES;
                                try {
                                    child._clickHandler();
                                } catch (e) {
                                    console.error('FAB child click handler error:', e);
                                }
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Fast-forward: call original update again to speed animations/battle
        if (_isFastForward && BattleManager && BattleManager._phase && BattleManager._phase !== 'init') {
            _Scene_Battle_update.call(this);
        }

        // Close Enemy Intel when tapping outside
        if (TouchInput.isTriggered() && this._enemyIntelWindow && this._enemyIntelWindow.isOpen()) {
            if (!this.isPointInside(TouchInput.x, TouchInput.y, this._enemyIntelWindow)) {
                this._enemyIntelWindow.close();
            }
        }
    };

    // --- Defensive Auto-battle override ---
    Game_Actor.prototype.makeAutoBattleActions = function() {
        // Defensive wrapper: if anything goes wrong, fall back to original implementation
        try {
            if (_isAutoBattle) {
                this.clearActions();
                for (let i = 0; i < this.numActions(); i++) {
                    const list = this.makeActionList();
                    if (list && list.length > 0) {
                        // Evaluate actions safely
                        try {
                            list.forEach(action => {
                                if (action && typeof action.evaluate === 'function') {
                                    action.evaluate();
                                }
                            });
                        } catch (e) {
                            // If evaluation fails, fallback to original behavior for this actor
                            console.error('Action evaluation error in makeAutoBattleActions:', e);
                            _Game_Actor_makeAutoBattleActions.call(this);
                            return;
                        }

                        // Determine best action(s)
                        const values = list.map(a => {
                            try { return a && typeof a.value === 'function' ? a.value() : -Infinity; }
                            catch (e) { return -Infinity; }
                        });
                        const maxValue = Math.max.apply(null, values);
                        if (!isFinite(maxValue)) {
                            // fallback if values invalid
                            _Game_Actor_makeAutoBattleActions.call(this);
                            return;
                        }
                        const bestActions = list.filter((a, idx) => values[idx] === maxValue);
                        if (bestActions.length > 0) {
                            const chosen = bestActions[Math.floor(Math.random() * bestActions.length)];
                            // ensure chosen is valid before setting
                            if (chosen) {
                                try {
                                    this.setAction(i, chosen);
                                } catch (e) {
                                    console.error('Error setting chosen action:', e);
                                    _Game_Actor_makeAutoBattleActions.call(this);
                                    return;
                                }
                            } else {
                                _Game_Actor_makeAutoBattleActions.call(this);
                                return;
                            }
                        } else {
                            _Game_Actor_makeAutoBattleActions.call(this);
                            return;
                        }
                    }
                }
                // set waiting state safely
                try {
                    this.setActionState('waiting');
                } catch (e) {
                    console.error('Error setting action state:', e);
                    _Game_Actor_makeAutoBattleActions.call(this);
                }
            } else {
                _Game_Actor_makeAutoBattleActions.call(this);
            }
        } catch (err) {
            console.error('makeAutoBattleActions wrapper caught error:', err);
            _Game_Actor_makeAutoBattleActions.call(this);
        }
    };

    // --- Start input: preserve original and only force auto-battle when safe ---
    BattleManager.startInput = function() {
        _BattleManager_startInput.call(this);
        try {
            // Only force auto-battle if the manager is currently accepting input
            if (_isAutoBattle && typeof this.isInputting === 'function' && this.isInputting()) {
                // Additional safety: ensure phase is 'input' or similar
                if (this._phase === 'input' || this._phase === 'turn' || this._phase === undefined) {
                    // Wrap forced auto-battle in try/catch to avoid uncaught errors
                    try {
                        this.commandForcedAutoBattle();
                    } catch (e) {
                        console.error('commandForcedAutoBattle error:', e);
                    }
                }
            }
        } catch (e) {
            console.error('BattleManager.startInput auto-battle guard error:', e);
        }
    };

    // --- Defensive forced auto-battle execution ---
    BattleManager.commandForcedAutoBattle = function() {
        // Defensive: ensure party exists and battle members are valid
        if (!$gameParty || typeof $gameParty.battleMembers !== 'function') return;
        const members = $gameParty.battleMembers();
        if (!members || !members.length) return;

        for (let i = 0; i < members.length; i++) {
            const actor = members[i];
            if (!actor) continue;
            try {
                // Call actor's auto-battle action maker; it's already wrapped defensively
                if (typeof actor.makeAutoBattleActions === 'function') {
                    actor.makeAutoBattleActions();
                }
            } catch (e) {
                // Log and continue; do not abort the whole forced auto-battle
                console.error('Error while forcing auto-battle for actor:', e);
            }
        }

        // Start turn only if BattleManager is in a valid state to start it
        try {
            if (typeof this.startTurn === 'function' && (this._phase === 'input' || this._phase === 'turn' || this._phase === undefined)) {
                this.startTurn();
            } else if (typeof this.startTurn === 'function' && this._phase === null) {
                // fallback: still try to start turn if phase is null
                this.startTurn();
            }
        } catch (e) {
            console.error('Error calling startTurn in commandForcedAutoBattle:', e);
        }
    };

    // --- Enemy Intel Window ---
    function Window_EnemyIntel() { this.initialize.apply(this, arguments); }
    Window_EnemyIntel.prototype = Object.create(Window_Base.prototype);
    Window_EnemyIntel.prototype.constructor = Window_EnemyIntel;
    Window_EnemyIntel.prototype.initialize = function() {
        const w = Math.min(460, Graphics.boxWidth - 40);
        const h = Math.min(360, Graphics.boxHeight - 100);
        Window_Base.prototype.initialize.call(this, (Graphics.boxWidth - w) / 2, (Graphics.boxHeight - h) / 2, w, h);
        this.openness = 0;
    };
    Window_EnemyIntel.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        this.changeTextColor(this.systemColor());
        this.drawText("Enemy Intelligence", 0, 0, this.contentsWidth(), 'center');
        this.contents.fillRect(0, 35, this.contentsWidth(), 2, this.normalColor());
        let y = 50;
        $gameTroop.members().forEach(enemy => {
            if (enemy && enemy.isAlive() && y + 80 < this.contentsHeight()) {
                this.changeTextColor(this.hpColor(enemy));
                this.drawText(enemy.name(), 0, y, 150);
                this.drawActorHp(enemy, 160, y, this.contentsWidth() - 170);
                let skillY = y + 35;
                let actions = enemy.enemy().actions;
                this.contents.fontSize = 16;
                this.changeTextColor(this.systemColor());
                this.drawText("Skills:", 10, skillY, 80);
                this.changeTextColor(this.normalColor());
                let disp = 0;
                for (let i = 0; i < actions.length; i++) {
                    let sk = $dataSkills[actions[i].skillId];
                    if (sk && disp < 2) {
                        this.drawItemName(sk, 90 + (disp * 140), skillY, 130);
                        disp++;
                    }
                }
                this.contents.fontSize = 28;
                y += 85;
            }
        });
    };

    // --- Create windows + FAB ---
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);

        this._enemyIntelWindow = new Window_EnemyIntel();
        this.addChild(this._enemyIntelWindow);

        this.createFABMenu();

        // Ensure FAB is top-most
        if (this._fabContainer) {
            if (this._fabContainer.parent) this._fabContainer.parent.removeChild(this._fabContainer);
            this.addChild(this._fabContainer);
        }
    };

    Scene_Battle.prototype.createFABMenu = function() {
        // container anchored to top-right
        this._fabContainer = new Sprite();
        this._fabContainer.x = Graphics.boxWidth - SAFE_OFFSET - (MAIN_FAB_SIZE / 2);
        this._fabContainer.y = SAFE_OFFSET + (MAIN_FAB_SIZE / 2);
        this._fabContainer.z = 9999;

        // background panel
        this._fabBg = new Window_Base(-MENU_WIDTH + 30, -MENU_HEIGHT / 2, MENU_WIDTH, MENU_HEIGHT);
        this._fabBg.opacity = 220;
        this._fabBg.visible = false;
        this._fabBg.scale.x = 0;
        this._fabBg.scale.y = 1.0;
        this._fabContainer.addChild(this._fabBg);

        this._subButtons = [];

        // helper to create sub buttons with consistent visuals and manual handler
        const addSub = (iconIndex, handler, activeCheck) => {
            const btn = this.createResponsiveButton(iconIndex, handler, activeCheck);
            btn.x = 0;
            btn.y = 0;
            btn.scale.x = btn.scale.y = 0;
            btn._manualHandler = handler;
            this._subButtons.push(btn);
            this._fabContainer.addChild(btn);
        };

        // Enemy Intel
        addSub(84, () => {
            if (this._enemyIntelWindow) {
                if (this._enemyIntelWindow.isOpen()) this._enemyIntelWindow.close();
                else { this._enemyIntelWindow.refresh(); this._enemyIntelWindow.open(); }
            }
        });

        // Auto-battle toggle
        addSub(81, () => {
            _isAutoBattle = !_isAutoBattle;
            SoundManager.playOk();
            // Only attempt to force auto-battle if BattleManager is in a safe input state
            try {
                if (_isAutoBattle && BattleManager && typeof BattleManager.isInputting === 'function' && BattleManager.isInputting()) {
                    if (BattleManager._phase === 'input' || BattleManager._phase === 'turn' || BattleManager._phase === undefined) {
                        try {
                            BattleManager.commandForcedAutoBattle();
                        } catch (e) {
                            console.error('Error forcing auto-battle on toggle:', e);
                        }
                    }
                }
            } catch (e) {
                console.error('Auto-battle toggle guard error:', e);
            }
        }, () => _isAutoBattle);

        // Fast-forward toggle
        addSub(72, () => {
            _isFastForward = !_isFastForward;
            SoundManager.playOk();
        }, () => _isFastForward);

        // Main FAB (circular) - centered icon
        const mainContainer = new Sprite();
        mainContainer.x = 0;
        mainContainer.y = 0;
        mainContainer.scale.x = mainContainer.scale.y = 1.0;

        const mainBmp = new Bitmap(MAIN_FAB_SIZE, MAIN_FAB_SIZE);
        if (mainBmp._context) {
            const ctx = mainBmp._context;
            const cx = MAIN_FAB_SIZE / 2;
            const cy = MAIN_FAB_SIZE / 2;
            const r = (MAIN_FAB_SIZE / 2) - 2;
            ctx.clearRect(0, 0, MAIN_FAB_SIZE, MAIN_FAB_SIZE);
            ctx.fillStyle = '#2b8cff';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            mainBmp._setDirty();
        } else {
            mainBmp.fillRect(0, 0, MAIN_FAB_SIZE, MAIN_FAB_SIZE, '#2b8cff');
        }

        const mainBg = new Sprite(mainBmp);
        mainBg.anchor.x = 0.5;
        mainBg.anchor.y = 0.5;
        mainBg.x = 0;
        mainBg.y = 0;
        mainContainer.addChild(mainBg);

        const mainIcon = new Sprite();
        mainIcon.bitmap = ImageManager.loadSystem('IconSet');
        const mainIconIndex = 224;
        const ix = (mainIconIndex % 16) * 32;
        const iy = Math.floor(mainIconIndex / 16) * 32;
        mainIcon.setFrame(ix, iy, 32, 32);
        mainIcon.anchor.x = 0.5;
        mainIcon.anchor.y = 0.5;
        mainIcon.x = 0;
        mainIcon.y = 0;
        mainIcon.scale.x = mainIcon.scale.y = Math.min(1.0, (MAIN_FAB_SIZE - 16) / 32);
        mainContainer.addChild(mainIcon);

        const mainHit = new Sprite_Button();
        mainHit.bitmap = new Bitmap(MAIN_FAB_SIZE, MAIN_FAB_SIZE);
        mainHit.bitmap.fillRect(0, 0, MAIN_FAB_SIZE, MAIN_FAB_SIZE, 'rgba(0,0,0,0.001)');
        mainHit.anchor.x = 0.5;
        mainHit.anchor.y = 0.5;
        mainHit.x = 0;
        mainHit.y = 0;
        mainHit.setClickHandler(() => {
            if (_touchCooldown > 0) return;
            _touchCooldown = TOUCH_COOLDOWN_FRAMES;
            this.toggleFabMenu();
        });
        mainContainer.addChild(mainHit);

        this._fabContainer.addChild(mainContainer);
        this._mainFab = mainContainer;
    };

    // create a sub-button (icon only)
    Scene_Battle.prototype.createResponsiveButton = function(iconIndex, handler, activeCheck) {
        const container = new Sprite();
        container.x = 0;
        container.y = 0;

        const size = MAIN_FAB_SIZE - 8;
        const bg = new Sprite(new Bitmap(size, size));
        if (bg.bitmap._context) {
            const c = bg.bitmap._context;
            const cx = size / 2;
            const cy = size / 2;
            const r = (size / 2) - 1;
            c.fillStyle = '#ffffff';
            c.globalAlpha = 0.06;
            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.fill();
            bg.bitmap._setDirty();
        }
        bg.anchor.x = 0.5;
        bg.anchor.y = 0.5;
        container.addChild(bg);

        const icon = new Sprite();
        icon.bitmap = ImageManager.loadSystem('IconSet');
        const ix = (iconIndex % 16) * 32;
        const iy = Math.floor(iconIndex / 16) * 32;
        icon.setFrame(ix, iy, 32, 32);
        icon.x = 0;
        icon.y = 0;
        icon.anchor.x = 0.5;
        icon.anchor.y = 0.5;
        container.addChild(icon);

        const hitbox = new Sprite_Button();
        hitbox.bitmap = new Bitmap(HITBOX_SIZE, HITBOX_SIZE);
        hitbox.bitmap.fillRect(0, 0, HITBOX_SIZE, HITBOX_SIZE, 'rgba(0,0,0,0.001)');
        hitbox.anchor.x = 0.5;
        hitbox.anchor.y = 0.5;
        hitbox.x = 0;
        hitbox.y = 0;
        hitbox.setClickHandler(() => {
            if (_touchCooldown > 0) return;
            _touchCooldown = TOUCH_COOLDOWN_FRAMES;
            try {
                handler();
            } catch (e) {
                console.error('FAB hitbox handler error:', e);
            }
        });
        container.addChild(hitbox);

        // per-frame visual update
        container.update = function() {
            Sprite.prototype.update.call(this);
            if (activeCheck && activeCheck()) {
                icon.opacity = 255;
                icon.scale.x = icon.scale.y = 1.25;
            } else {
                icon.opacity = 200;
                icon.scale.x = icon.scale.y = 1.0;
            }
            if (hitbox && typeof hitbox.isPressed === 'function' && hitbox.isPressed()) {
                icon.scale.x = icon.scale.y = 0.85;
            }
        };

        return container;
    };

    Scene_Battle.prototype.toggleFabMenu = function() {
        _isMenuOpen = !_isMenuOpen;
        SoundManager.playCursor();
        if (this._fabBg) this._fabBg.visible = true;
        if (this._subButtons && this._subButtons.length) {
            this._subButtons.forEach((btn, i) => {
                if (!btn) return;
                btn.visible = true;
                if (_isMenuOpen) {
                    btn.x = 0;
                    btn.scale.x = btn.scale.y = 0;
                }
            });
        }
    };

    Scene_Battle.prototype.isPointInside = function(x, y, win) {
        return win && x >= win.x && x < win.x + win.width && y >= win.y && y < win.y + win.height;
    };

    Scene_Battle.prototype.terminate = function() {
        _Scene_Battle_terminate.call(this);
        _isAutoBattle = _isFastForward = _isMenuOpen = false;
        _touchCooldown = 0;
    };

})();
