//=============================================================================
// TSBCSettings.js
//=============================================================================
/*:
 * @plugindesc v2.2.1 - Central Hub for Graphics (TASystem), Controls (Joystick), and Account (VaultSave)
 * @author TSBC Development Team
 *
 * @param ════ UI DESIGN ════
 * @default ════════════════════════════════
 *
 * @param PanelBackColor
 * @text Panel Background Color
 * @parent ════ UI DESIGN ════
 * @type string
 * @default rgba(15, 20, 30, 0.95)
 * @desc HSR-style glass panel color (RGBA format).
 *
 * @param AccentColor
 * @text Accent Color
 * @parent ════ UI DESIGN ════
 * @type string
 * @default #00d4ff
 * @desc Highlight and accent color (Hex format).
 *
 * @param BlurIntensity
 * @text Background Blur
 * @parent ════ UI DESIGN ════
 * @type string
 * @default 15px
 * @desc Intensity of the glass blur effect.
 *
 * @help
 * ============================================================================
 * TSBCSettings.js - Integrated Edition
 * ============================================================================
 * Fixed: Variable mismatches with VaultSave.js
 * 1. VaultSave.currentUser -> VaultSave.currentAccount
 * 2. VaultSave.saveGlobalData -> VaultSave.saveAllAccounts
 * ============================================================================
 */

var Imported = Imported || {};
Imported.TSBCSettings = true;

var TSBCSettings = {};
var Scene_TSBCSettings;

(function() {
    "use strict";

    var parameters = PluginManager.parameters('TSBCSettings');
    
    TSBCSettings.config = {
        panelBackColor: String(parameters['PanelBackColor']) || 'rgba(15, 20, 30, 0.95)',
        accentColor: String(parameters['AccentColor']) || '#00d4ff',
        blurIntensity: String(parameters['BlurIntensity']) || '15px'
    };

    TSBCSettings.isMobile = function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    };

    //=========================================================================
    // CSS Injection
    //=========================================================================
    TSBCSettings.injectStyles = function() {
        if (document.getElementById('tsbc-settings-styles')) return;

        const css = `
            #tsbc-settings-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center;
                align-items: center; z-index: 10000; font-family: sans-serif;
                color: white; opacity: 0; transition: opacity 0.25s ease;
                pointer-events: none; user-select: none;
            }
            #tsbc-settings-overlay.active { opacity: 1; pointer-events: auto; }
            .tsbc-container {
                width: 90%; max-width: 950px; height: 80%;
                background: ${TSBCSettings.config.panelBackColor};
                backdrop-filter: blur(${TSBCSettings.config.blurIntensity});
                -webkit-backdrop-filter: blur(${TSBCSettings.config.blurIntensity});
                border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex; flex-direction: column; overflow: hidden;
                transform: translateY(30px); transition: transform 0.3s cubic-bezier(0.2, 1, 0.3, 1);
            }
            #tsbc-settings-overlay.active .tsbc-container { transform: translateY(0); }
            
            .tsbc-header { padding: 25px 40px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); }
            .tsbc-header h1 { margin: 0; font-size: 28px; letter-spacing: 4px; color: ${TSBCSettings.config.accentColor}; font-weight: 300; }
            
            .tsbc-tabs { display: flex; background: rgba(0,0,0,0.1); }
            .tsbc-tab { padding: 18px 35px; cursor: pointer; color: #888; font-weight: bold; font-size: 14px; transition: 0.3s; position: relative; }
            .tsbc-tab.active { color: white; }
            .tsbc-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: ${TSBCSettings.config.accentColor}; }
            
            .tsbc-content { flex: 1; overflow-y: auto; padding: 20px 40px; }
            .group-label { font-size: 11px; color: ${TSBCSettings.config.accentColor}; text-transform: uppercase; margin-top: 20px; opacity: 0.7; letter-spacing: 2px; }
            .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
            .settings-label { font-size: 16px; font-weight: 400; }
            .settings-control { 
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                color: #fff; padding: 10px 25px; border-radius: 4px; cursor: pointer;
                min-width: 130px; text-align: center; transition: 0.2s;
            }
            .settings-control:hover { background: rgba(255,255,255,0.15); border-color: ${TSBCSettings.config.accentColor}; }
            
            .tsbc-footer { padding: 20px 40px; display: flex; justify-content: flex-end; }
            .btn-close { 
                background: ${TSBCSettings.config.accentColor}; color: #000; border: none;
                padding: 12px 50px; border-radius: 4px; font-weight: bold; cursor: pointer;
            }

            @media (max-width: 768px) {
                .tsbc-container { width: 98%; height: 95%; }
                .tsbc-tab { padding: 15px 15px; font-size: 12px; flex: 1; text-align: center; }
                .settings-label { font-size: 14px; }
            }
        `;
        const style = document.createElement('style');
        style.id = 'tsbc-settings-styles';
        style.innerHTML = css;
        document.head.appendChild(style);
    };

    //=========================================================================
    // Scene_TSBCSettings
    //=========================================================================
    Scene_TSBCSettings = function() { this.initialize.apply(this, arguments); };
    Scene_TSBCSettings.prototype = Object.create(Scene_Base.prototype);
    Scene_TSBCSettings.prototype.constructor = Scene_TSBCSettings;

    Scene_TSBCSettings.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        TSBCSettings.injectStyles();
        this._currentTab = 'graphics';
    };

    Scene_TSBCSettings.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createHTMLInterface();
    };

    Scene_TSBCSettings.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        this.addChild(this._backgroundSprite);
    };

    Scene_TSBCSettings.prototype.createHTMLInterface = function() {
        const overlay = document.createElement('div');
        overlay.id = 'tsbc-settings-overlay';
        overlay.innerHTML = `
            <div class="tsbc-container">
                <div class="tsbc-header"><h1>SYSTEM SETTINGS</h1></div>
                <div class="tsbc-tabs">
                    <div class="tsbc-tab active" data-tab="graphics">GRAPHICS</div>
                    <div class="tsbc-tab" data-tab="controls">CONTROLS</div>
                    <div class="tsbc-tab" data-tab="account">ACCOUNT</div>
                </div>
                <div class="tsbc-content" id="tsbc-settings-list"></div>
                <div class="tsbc-footer">
                    <button class="btn-close" id="tsbc-close-btn">CONFIRM</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;

        document.getElementById('tsbc-close-btn').onclick = () => this.popScene();
        
        overlay.querySelectorAll('.tsbc-tab').forEach(tab => {
            tab.onclick = (e) => {
                overlay.querySelectorAll('.tsbc-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.refreshTab(e.target.dataset.tab);
            };
        });

        setTimeout(() => overlay.classList.add('active'), 10);
        this.refreshTab('graphics');
    };

    Scene_TSBCSettings.prototype.refreshTab = function(tabId) {
        const container = document.getElementById('tsbc-settings-list');
        container.innerHTML = '';

        if (tabId === 'graphics') {
            this.addLabel(container, 'Cinematic Engine (TASystem)');
            
            const vfx = (typeof TASystem !== 'undefined' && TASystem._vfxEnabled) ? 'On' : 'Off';
            this.addRow(container, 'Cinematic VFX', vfx, () => {
                if (typeof TASystem !== 'undefined') {
                    TASystem._vfxEnabled = !TASystem._vfxEnabled;
                    this.refreshTab('graphics');
                }
            });

            const atmosphere = (typeof TASystem !== 'undefined' && TASystem._atmosphereEnabled) ? 'High' : 'Low';
            this.addRow(container, 'Atmospheric Lighting', atmosphere, () => {
                if (typeof TASystem !== 'undefined') {
                    TASystem._atmosphereEnabled = !TASystem._atmosphereEnabled;
                    this.refreshTab('graphics');
                }
            });

            this.addLabel(container, 'Engine Performance');
            const qualityNames = ['Low', 'Medium', 'High', 'Ultra'];
            this.addRow(container, 'Render Quality', qualityNames[$gameSystem._graphicsQuality || 0], () => {
                $gameSystem._graphicsQuality = (($gameSystem._graphicsQuality || 0) + 1) % 4;
                this.refreshTab('graphics');
            });
        }

        if (tabId === 'controls') {
            this.addLabel(container, 'Mobile Controls (Virtual Joystick)');

            const joystickEnabled = (typeof VirtualJoystick !== 'undefined' && VirtualJoystick.isEnabled()) ? 'Visible' : 'Hidden';
            this.addRow(container, 'Joystick Visibility', joystickEnabled, () => {
                if (typeof VirtualJoystick !== 'undefined') {
                    VirtualJoystick.setEnabled(!VirtualJoystick.isEnabled());
                    this.refreshTab('controls');
                }
            });

            const side = (typeof VirtualJoystick !== 'undefined' && VirtualJoystick._side === 'right') ? 'Right' : 'Left';
            this.addRow(container, 'Joystick Position', side, () => {
                if (typeof VirtualJoystick !== 'undefined') {
                    VirtualJoystick.setSide(VirtualJoystick._side === 'left' ? 'right' : 'left');
                    this.refreshTab('controls');
                }
            });
        }

        if (tabId === 'account') {
            this.addLabel(container, 'Account Management (VaultSave)');

            // FIX: VaultSave uses .currentAccount, not .currentUser
            let userDisplay = 'Guest';
            if (typeof VaultSave !== 'undefined') {
                if (VaultSave.currentAccount && VaultSave.currentAccount.username) {
                    userDisplay = VaultSave.currentAccount.username;
                }
            }
            
            this.addRow(container, 'Current User', userDisplay, () => {});

            this.addRow(container, 'Account Sync', 'Manual Sync', () => {
                if (typeof VaultSave !== 'undefined') {
                    // FIX: VaultSave uses .saveAllAccounts(), not .saveGlobalData()
                    if (typeof VaultSave.saveAllAccounts === 'function') {
                        VaultSave.saveAllAccounts();
                        // Assuming your VaultSave.js has a custom toast or alert logic
                        if (typeof VaultSave.showToast === 'function') {
                            VaultSave.showToast("Cloud Sync Complete");
                        } else {
                            alert("Account data synced to vault.");
                        }
                    }
                }
            });

            this.addRow(container, 'Log Out', 'Logout', () => {
                // Better UI for logout
                const confirmLogout = window.confirm("Log out and return to Title?");
                if (confirmLogout) {
                    if (typeof VaultSave !== 'undefined') {
                        VaultSave.currentAccount = null;
                        // Use the built-in storage clearing if available
                        if (typeof VaultSave.clearSession === 'function') VaultSave.clearSession();
                    }
                    SceneManager.goto(Scene_Title);
                }
            });
        }
    };

    Scene_TSBCSettings.prototype.addLabel = function(parent, text) {
        const div = document.createElement('div');
        div.className = 'group-label';
        div.innerText = text;
        parent.appendChild(div);
    };

    Scene_TSBCSettings.prototype.addRow = function(parent, label, value, callback) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML = `<div class="settings-label">${label}</div><div class="settings-control">${value}</div>`;
        row.querySelector('.settings-control').onclick = () => {
            SoundManager.playOk();
            callback();
        };
        parent.appendChild(row);
    };

    Scene_TSBCSettings.prototype.stop = function() {
        Scene_Base.prototype.stop.call(this);
        if (this._overlay) {
            this._overlay.classList.remove('active');
            setTimeout(() => { if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay); }, 300);
        }
    };

    // System variables
    Game_System.prototype.getGraphicsQuality = function() { return this._graphicsQuality || 0; };

    // Plugin Command
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command.toLowerCase() === 'tsbc_settings') SceneManager.push(Scene_TSBCSettings);
    };

})();