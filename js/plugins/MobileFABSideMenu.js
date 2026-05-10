/*:
 * @target MV
 * @plugindesc [v2.3] Mobile Side Panel FAB Menu with Grid/List Toggle.
 * @author Gemini
 *
 * @param MenuLayout
 * @text Menu Layout
 * @type select
 * @option List
 * @option Grid
 * @desc Choose between a vertical list or a grid layout for the side panel.
 * @default Grid
 *
 * @param GridColumns
 * @text Grid Columns
 * @type number
 * @min 1
 * @max 4
 * @desc Number of columns if using Grid layout.
 * @default 2
 *
 * @help
 * This plugin adds a Floating Action Button (FAB) that opens a sleek
 * side menu drawer.
 *
 * NEW in v2.3:
 * - Added Plugin Parameters for Layout (Grid vs List).
 * - Grid System: Icons are neatly arranged in tiles.
 * - Auto-scaling: Buttons adjust size based on the chosen column count.
 */

(function() {
    'use strict';

    // --- Parameter Handling ---
    const parameters = PluginManager.parameters('MobileFABSideMenu');
    const MENU_LAYOUT = String(parameters['MenuLayout'] || 'Grid');
    const GRID_COLS = Number(parameters['GridColumns'] || 2);

    // --- Configuration ---
    const FAB_SIZE = 70;
    const PANEL_WIDTH = 280;
    const LIST_ITEM_HEIGHT = 75; 
    const ANIM_SPEED = 0.2; 
    const ACCENT_COLOR = '#3498db';
    const PANEL_BG = 'rgba(15, 15, 15, 0.98)';
    const MARGIN = 20;

    function Sprite_FABSideMenu() {
        this.initialize.apply(this, arguments);
    }

    Sprite_FABSideMenu.prototype = Object.create(Sprite.prototype);
    Sprite_FABSideMenu.prototype.constructor = Sprite_FABSideMenu;

    Sprite_FABSideMenu.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this._isOpen = false;
        this._animationProgress = 0;
        this.createBackgroundOverlay();
        this.createSidePanel();
        this.createMainButton();
    };

    Sprite_FABSideMenu.prototype.createBackgroundOverlay = function() {
        this._overlay = new Sprite(new Bitmap(Graphics.boxWidth, Graphics.boxHeight));
        this._overlay.bitmap.fillAll('rgba(0, 0, 0, 0.6)');
        this._overlay.opacity = 0;
        this.addChild(this._overlay);
    };

    Sprite_FABSideMenu.prototype.createSidePanel = function() {
        this._panel = new Sprite(new Bitmap(PANEL_WIDTH, Graphics.boxHeight));
        this._panel.bitmap.fillAll(PANEL_BG);
        this._panel.x = -PANEL_WIDTH;
        
        // Visual indicator on the edge
        this._panel.bitmap.fillRect(PANEL_WIDTH - 5, 0, 5, Graphics.boxHeight, ACCENT_COLOR);
        
        this.addChild(this._panel);
        this.createCommands();
    };

    Sprite_FABSideMenu.prototype.createCommands = function() {
        this._commandButtons = [];
        const commands = [
            { icon: 1,   name: 'Items',   action: () => SceneManager.push(Scene_Item) },
            { icon: 76,  name: 'Skills',  action: () => SceneManager.push(Scene_Skill) },
            { icon: 77,  name: 'Equip',   action: () => SceneManager.push(Scene_Equip) },
            { icon: 210, name: 'Concedation',   action: () => {
                if (typeof Scene_ModernGacha !== 'undefined') SceneManager.push(Scene_ModernGacha);
                else SceneManager.push(Scene_Error);
            }},
            { icon: 84,  name: 'Status',  action: () => SceneManager.push(Scene_Status) },
            { icon: 75,  name: 'Party',   action: () => {
                if (typeof Scene_HSR_Party !== 'undefined') SceneManager.push(Scene_HSR_Party);
                else SceneManager.push(Scene_Error);
            }},
            { icon: 82,  name: 'Save',    action: () => SceneManager.push(Scene_Save) },
            { icon: 75,  name: 'Camera',   action: () => {
                if (typeof Scene_PhotoMode !== 'undefined') SceneManager.push(Scene_PhotoMode);
                else SceneManager.push(Scene_Error);
            }},
            { icon: 83,  name: 'Settings',   action: () => {
                if (typeof Scene_TSBCSettings !== 'undefined') SceneManager.push(Scene_TSBCSettings);
                else SceneManager.push(Scene_Error);
            }},
            { icon: 160, name: 'Exit To Title',    action: () => SceneManager.goto(Scene_Title) }
        ];

        if (MENU_LAYOUT === 'Grid') {
            this.setupGridLayout(commands);
        } else {
            this.setupListLayout(commands);
        }
    };

    Sprite_FABSideMenu.prototype.setupListLayout = function(commands) {
        const startY = 100;
        commands.forEach((cmd, i) => {
            const btn = new Sprite(new Bitmap(PANEL_WIDTH, LIST_ITEM_HEIGHT));
            btn.y = startY + (i * LIST_ITEM_HEIGHT);
            btn._action = cmd.action;
            btn.bitmap.outlineWidth = 3;
            btn.bitmap.fontSize = 24;
            btn.bitmap.drawText(cmd.name, 80, 0, PANEL_WIDTH - 100, LIST_ITEM_HEIGHT, 'left');
            this.drawIcon(btn.bitmap, cmd.icon, 25, (LIST_ITEM_HEIGHT - 32) / 2);
            this._panel.addChild(btn);
            this._commandButtons.push(btn);
        });
    };

    Sprite_FABSideMenu.prototype.setupGridLayout = function(commands) {
        const startY = 120;
        const padding = 15;
        const gridWidth = (PANEL_WIDTH - 10) - (padding * (GRID_COLS + 1));
        const cellW = gridWidth / GRID_COLS;
        const cellH = cellW * 1.1; // Slightly taller than wide

        commands.forEach((cmd, i) => {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            
            const btn = new Sprite(new Bitmap(cellW, cellH));
            btn.x = padding + col * (cellW + padding);
            btn.y = startY + row * (cellH + padding);
            btn._action = cmd.action;
            
            // Draw background tile for the grid item
            btn.bitmap.fillRect(0, 0, cellW, cellH, 'rgba(255,255,255,0.05)');
            
            // Icon centered
            this.drawIcon(btn.bitmap, cmd.icon, (cellW - 32) / 2, 15);
            
            // Text centered below icon
            btn.bitmap.fontSize = 16;
            btn.bitmap.drawText(cmd.name, 0, cellH - 30, cellW, 25, 'center');
            
            this._panel.addChild(btn);
            this._commandButtons.push(btn);
        });
    };

    Sprite_FABSideMenu.prototype.createMainButton = function() {
        this._mainButton = new Sprite(new Bitmap(FAB_SIZE, FAB_SIZE));
        this._mainButton.anchor.x = 0.5;
        this._mainButton.anchor.y = 0.5;
        this._mainButton.x = (FAB_SIZE / 2) + MARGIN;
        this._mainButton.y = Graphics.boxHeight - (FAB_SIZE / 2) - MARGIN;
        this.addChild(this._mainButton);
        this.refreshMainButton();
    };

    Sprite_FABSideMenu.prototype.refreshMainButton = function() {
        const b = this._mainButton.bitmap;
        b.clear();
        const ctx = b.context;
        ctx.beginPath();
        ctx.arc(FAB_SIZE / 2, FAB_SIZE / 2, (FAB_SIZE / 2) - 4, 0, Math.PI * 2);
        ctx.fillStyle = this._isOpen ? '#e74c3c' : ACCENT_COLOR;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();
        const iconIndex = this._isOpen ? 16 : 160; 
        this.drawIcon(b, iconIndex, (FAB_SIZE - 32) / 2, (FAB_SIZE - 32) / 2);
    };

    Sprite_FABSideMenu.prototype.drawIcon = function(bitmap, iconIndex, x, y) {
        const iconSet = ImageManager.loadSystem('IconSet');
        const pw = Window_Base._iconWidth || 32;
        const ph = Window_Base._iconHeight || 32;
        const sx = iconIndex % 16 * pw;
        const sy = Math.floor(iconIndex / 16) * ph;
        bitmap.blt(iconSet, sx, sy, pw, ph, x, y);
    };

    Sprite_FABSideMenu.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this.updateAnimation();
        this.processTouch();
    };

    Sprite_FABSideMenu.prototype.updateAnimation = function() {
        if (this._isOpen && this._animationProgress < 1) {
            this._animationProgress = Math.min(1, this._animationProgress + ANIM_SPEED);
        } else if (!this._isOpen && this._animationProgress > 0) {
            this._animationProgress = Math.max(0, this._animationProgress - ANIM_SPEED);
        }
        const ease = this._animationProgress * (2 - this._animationProgress);
        this._panel.x = -PANEL_WIDTH + (PANEL_WIDTH * ease);
        this._overlay.opacity = 255 * ease;
        this._mainButton.rotation = (Math.PI / 2) * ease;
        this._mainButton.x = ((FAB_SIZE / 2) + MARGIN) + (40 * ease);
    };

    Sprite_FABSideMenu.prototype.processTouch = function() {
        if (!TouchInput.isTriggered()) return;
        const tx = TouchInput.x;
        const ty = TouchInput.y;

        const dist = Math.sqrt(Math.pow(tx - this._mainButton.x, 2) + Math.pow(ty - this._mainButton.y, 2));
        if (dist < (FAB_SIZE / 2) + 10) {
            this.toggleMenu();
            TouchInput.clear();
            return;
        }

        if (this._isOpen) {
            if (tx > PANEL_WIDTH) {
                this.toggleMenu();
                TouchInput.clear();
                return;
            }
            this._commandButtons.forEach((btn) => {
                const lx = tx - this._panel.x;
                const ly = ty - this._panel.y;
                if (lx >= btn.x && lx < btn.x + btn.width && ly >= btn.y && ly < btn.y + btn.height) {
                    SoundManager.playOk();
                    btn._action();
                    this.toggleMenu();
                    TouchInput.clear();
                }
            });
            TouchInput.clear();
        }
    };

    Sprite_FABSideMenu.prototype.toggleMenu = function() {
        this._isOpen = !this._isOpen;
        if (this._isOpen) SoundManager.playCursor();
        else SoundManager.playCancel();
        this.refreshMainButton();
    };

    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);
        if (!this._fabContainer) {
            this._fabContainer = new Sprite_FABSideMenu();
            this.addChild(this._fabContainer);
        }
    };

    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (this._fabContainer) {
            const dist = Math.sqrt(Math.pow(TouchInput.x - this._fabContainer._mainButton.x, 2) + 
                                   Math.pow(TouchInput.y - this._fabContainer._mainButton.y, 2));
            if (this._fabContainer._isOpen || dist < (FAB_SIZE / 2) + MARGIN) return;
        }
        _Scene_Map_processMapTouch.call(this);
    };

})();