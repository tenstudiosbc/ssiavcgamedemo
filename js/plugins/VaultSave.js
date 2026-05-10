//=============================================================================
// VaultSave.js
//=============================================================================
/*:
 * @plugindesc v2.0.3 — Advanced Login with Encryption, Toast Notifications & Account Management.
 * @author Claude
 *
 * @param --- Core Settings ---
 * @param MaxAccounts
 * @type number
 * @default 10
 * @desc Total accounts allowed on one device.
 *
 * @param SaveSlotsPerUser
 * @type number
 * @default 3
 * @desc Save slots allocated per authenticated user.
 *
 * @param GuestSaveSlots
 * @type number
 * @default 1
 * @desc Save slots available in guest mode (limited).
 *
 * @param GuestAllowed
 * @type boolean
 * @default true
 * @desc Allow players to play as guest (limited functionality).
 *
 * @param SessionTimeout
 * @type number
 * @default 0
 * @desc Session timeout in minutes (0 = no timeout).
 *
 * @param --- Security & Encryption ---
 * @param EnablePasswordHash
 * @type boolean
 * @default true
 * @desc Hash passwords with client-side encryption before storage.
 *
 * @param EnableDataEncryption
 * @type boolean
 * @default true
 * @desc Encrypt account data in local storage.
 *
 * @param MinUserLength
 * @type number
 * @default 3
 * @desc Minimum characters for username.
 *
 * @param MaxUserLength
 * @type number
 * @default 12
 * @desc Maximum characters for username.
 *
 * @param MinPassLength
 * @type number
 * @default 4
 * @desc Minimum characters for password.
 *
 * @param MaxPassLength
 * @type number
 * @default 16
 * @desc Maximum characters for password.
 *
 * @param --- Visuals ---
 * @param SystemTitle
 * @type string
 * @default VAULT SAVE
 *
 * @param AccentColor
 * @type string
 * @default #3498db
 * @desc The main color for buttons and highlights (Hex code).
 *
 * @param ForgotPasswordText
 * @type string
 * @default Please contact the administrator or clear local storage to reset your account.
 * @desc The message shown when "Forgot Password" is clicked.
 *
 * @param MyAccountCommand
 * @type string
 * @default My Account
 * @desc The text shown in the Title Menu for account management.
 *
 * @param --- Toast Notifications ---
 * @param EnableToastNotifications
 * @type boolean
 * @default true
 * @desc Show toast notifications for login/logout events.
 *
 * @param ToastPosition
 * @type select
 * @option top-left
 * @option top-center
 * @option top-right
 * @option bottom-left
 * @option bottom-center
 * @option bottom-right
 * @default bottom-right
 * @desc Position of toast notifications on screen.
 *
 * @param ToastDuration
 * @type number
 * @default 3000
 * @desc Duration of toast notification in milliseconds.
 *
 * @param ToastBackgroundColor
 * @type string
 * @default #1a1a1a
 * @desc Background color of toast notifications (Hex code).
 *
 * @param ToastTextColor
 * @type string
 * @default #ffffff
 * @desc Text color of toast notifications (Hex code).
 *
 * @param --- Guest Mode ---
 * @param GuestModeWarning
 * @type boolean
 * @default true
 * @desc Show warning that saves are temporary in guest mode.
 *
 * @param GuestAutoSaveDisabled
 * @type boolean
 * @default true
 * @desc Disable auto-save in guest mode.
 */

var VaultSave = VaultSave || {};

(function($) {
    "use strict";

    var params = PluginManager.parameters('VaultSave');
    $.maxAccounts        = Number(params['MaxAccounts']              || 10);
    $.slotsPerUser       = Number(params['SaveSlotsPerUser']        || 3);
    $.guestSlots         = Number(params['GuestSaveSlots']          || 1);
    $.guestAllowed       = String(params['GuestAllowed'])           === 'true';
    $.sessionTimeout     = Number(params['SessionTimeout']          || 0) * 60000; // Convert to ms
    $.enableHashPassword = String(params['EnablePasswordHash'])     === 'true';
    $.enableEncryption   = String(params['EnableDataEncryption'])   === 'true';
    $.accentColor        = String(params['AccentColor']             || "#3498db");
    $.titleText          = String(params['SystemTitle']             || "VAULT SAVE");
    $.minUser            = Number(params['MinUserLength']           || 3);
    $.maxUser            = Number(params['MaxUserLength']           || 12);
    $.minPass            = Number(params['MinPassLength']           || 4);
    $.maxPass            = Number(params['MaxPassLength']           || 16);
    $.forgotMsg          = String(params['ForgotPasswordText']      || "Contact admin to reset.");
    $.myAccountText      = String(params['MyAccountCommand']        || "My Account");
    
    // Toast settings
    $.enableToast        = String(params['EnableToastNotifications']) === 'true';
    $.toastPosition      = String(params['ToastPosition']           || 'bottom-right');
    $.toastDuration      = Number(params['ToastDuration']           || 3000);
    $.toastBgColor       = String(params['ToastBackgroundColor']    || '#1a1a1a');
    $.toastTextColor     = String(params['ToastTextColor']          || '#ffffff');
    
    // Guest mode settings
    $.guestModeWarning   = String(params['GuestModeWarning'])       === 'true';
    $.guestAutoSaveDisabled = String(params['GuestAutoSaveDisabled']) === 'true';

    $.currentUser         = null;
    $.guestSession        = false;
    $.sessionStartTime    = null;
    $.isSessionValid      = true;

    //=========================================================================
    // UTILITY: Simple Client-Side Password Hashing
    //=========================================================================
    $.SimpleHash = {
        // Basic hash function - combines username for extra security
        hash: function(str, salt) {
            salt = salt || "VaultSave2024";
            var combined = str + salt;
            var hash = 0;
            for (var i = 0; i < combined.length; i++) {
                var char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        },
        
        // Encrypt by XOR with hash
        encrypt: function(data, key) {
            if (!$.enableEncryption) return data;
            try {
                var encoded = btoa(data); // Base64 encode
                var keyHash = this.hash(key);
                var result = '';
                for (var i = 0; i < encoded.length; i++) {
                    result += String.fromCharCode(
                        encoded.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length)
                    );
                }
                return btoa(result); // Encode again for storage
            } catch(e) {
                console.warn('Encryption failed, storing as plaintext');
                return data;
            }
        },
        
        // Decrypt by reverse XOR
        decrypt: function(data, key) {
            if (!$.enableEncryption) return data;
            try {
                var keyHash = this.hash(key);
                var decoded = atob(data);
                var result = '';
                for (var i = 0; i < decoded.length; i++) {
                    result += String.fromCharCode(
                        decoded.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length)
                    );
                }
                return atob(result); // Decode from Base64
            } catch(e) {
                console.warn('Decryption failed, returning original');
                return data;
            }
        }
    };

    //=========================================================================
    // TOAST NOTIFICATION SYSTEM
    //=========================================================================
    $.ToastManager = {
        show: function(message, type) {
            if (!$.enableToast) return;
            
            type = type || 'info'; // info, success, error, warning
            
            var colors = {
                info:    { bg: $.toastBgColor, text: $.toastTextColor },
                success: { bg: '#27ae60', text: '#fff' },
                error:   { bg: '#c0392b', text: '#fff' },
                warning: { bg: '#f39c12', text: '#fff' },
                guest:   { bg: '#e67e22', text: '#fff' }
            };
            
            var colorSet = colors[type] || colors.info;
            
            var toastEl = document.createElement('div');
            toastEl.className = 'vault-toast vault-toast-' + $.toastPosition;
            toastEl.innerHTML = message;
            toastEl.style.cssText = [
                'position: fixed;',
                'background-color: ' + colorSet.bg + ';',
                'color: ' + colorSet.text + ';',
                'padding: 16px 20px;',
                'border-radius: 8px;',
                'font-size: 14px;',
                'font-weight: 500;',
                'z-index: 20000;',
                'animation: vaultToastSlide 0.3s ease-out;',
                'box-shadow: 0 4px 12px rgba(0,0,0,0.3);',
                'max-width: 400px;',
                'word-wrap: break-word;'
            ].join('');
            
            // Position
            var positions = {
                'top-left':     'top:20px; left:20px;',
                'top-center':   'top:20px; left:50%; transform:translateX(-50%);',
                'top-right':    'top:20px; right:20px;',
                'bottom-left':  'bottom:20px; left:20px;',
                'bottom-center': 'bottom:20px; left:50%; transform:translateX(-50%);',
                'bottom-right': 'bottom:20px; right:20px;'
            };
            toastEl.style.cssText += positions[$.toastPosition] || positions['bottom-right'];
            
            document.body.appendChild(toastEl);
            
            setTimeout(function() {
                toastEl.style.animation = 'vaultToastSlide 0.3s ease-out reverse';
                setTimeout(function() { toastEl.remove(); }, 300);
            }, $.toastDuration);
        }
    };

    //=========================================================================
    // SESSION MANAGEMENT
    //=========================================================================
    $.SessionManager = {
        startSession: function(user) {
            $.sessionStartTime = Date.now();
            $.isSessionValid = true;
            if ($.sessionTimeout > 0) {
                setTimeout(function() {
                    if ($.currentUser === user) {
                        $.SessionManager.invalidateSession();
                    }
                }, $.sessionTimeout);
            }
        },
        
        invalidateSession: function() {
            $.isSessionValid = false;
            $.currentUser = null;
            $.guestSession = false;
            $.ToastManager.show('Session expired. Please login again.', 'warning');
            if (SceneManager._scene instanceof Scene_Title) {
                SceneManager._scene.showVaultLogin();
            }
        },
        
        isValid: function() {
            return $.isSessionValid && ($.currentUser !== null || $.guestSession);
        }
    };

    //=========================================================================
    // HOTFIX: TouchInput Blocker
    //=========================================================================
    var _origTouchStart  = TouchInput._onTouchStart  ? TouchInput._onTouchStart.bind(TouchInput)  : null;
    var _origTouchMove   = TouchInput._onTouchMove   ? TouchInput._onTouchMove.bind(TouchInput)   : null;
    var _origTouchEnd    = TouchInput._onTouchEnd    ? TouchInput._onTouchEnd.bind(TouchInput)    : null;
    var _origMouseDown   = TouchInput._onMouseDown   ? TouchInput._onMouseDown.bind(TouchInput)   : null;
    var _origMouseMove   = TouchInput._onMouseMove   ? TouchInput._onMouseMove.bind(TouchInput)   : null;
    var _origMouseUp     = TouchInput._onMouseUp     ? TouchInput._onMouseUp.bind(TouchInput)     : null;

    function isVaultOpen() {
        return !!document.getElementById('vault-overlay');
    }

    function patchTouchInput() {
        TouchInput._onTouchStart = function(e) {
            if (isVaultOpen()) return;
            if (_origTouchStart) _origTouchStart(e);
        };
        TouchInput._onTouchMove = function(e) {
            if (isVaultOpen()) return;
            if (_origTouchMove) _origTouchMove(e);
        };
        TouchInput._onTouchEnd = function(e) {
            if (isVaultOpen()) return;
            if (_origTouchEnd) _origTouchEnd(e);
        };
        TouchInput._onMouseDown = function(e) {
            if (isVaultOpen()) return;
            if (_origMouseDown) _origMouseDown(e);
        };
        TouchInput._onMouseMove = function(e) {
            if (isVaultOpen()) return;
            if (_origMouseMove) _origMouseMove(e);
        };
        TouchInput._onMouseUp = function(e) {
            if (isVaultOpen()) return;
            if (_origMouseUp) _origMouseUp(e);
        };
    }
    patchTouchInput();

    //=========================================================================
    // Helper: Touch & Click Handler
    //=========================================================================
    function onTap(element, handler) {
        var touched = false;
        element.addEventListener('touchend', function(e) {
            e.stopPropagation();
            e.preventDefault();
            touched = true;
            handler();
            setTimeout(function() { touched = false; }, 400);
        }, { passive: false });
        element.addEventListener('click', function(e) {
            if (touched) return;
            handler();
        });
    }

    //=========================================================================
    // Mobile-Optimized CSS with Toast Animations
    //=========================================================================
    var injectStyles = function() {
        if (document.getElementById('vault-css')) return;
        var css = [
            '#vault-overlay {',
            '    position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
            '    background: rgba(0,0,0,0.85); display: flex; align-items: center;',
            '    justify-content: center; z-index: 10000; font-family: \'Segoe UI\', sans-serif;',
            '    backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);',
            '    touch-action: auto; pointer-events: auto;',
            '    overflow: auto; -webkit-overflow-scrolling: touch;',
            '}',
            '.vault-card {',
            '    background: #1a1a1a; padding: 25px; border-radius: 20px;',
            '    width: 85%; max-width: 360px; box-sizing: border-box;',
            '    box-shadow: 0 15px 35px rgba(0,0,0,0.5); border: 1px solid #333;',
            '    animation: vaultFadeIn 0.3s ease-out;',
            '    touch-action: auto; margin: 20px auto;',
            '    -webkit-tap-highlight-color: transparent;',
            '}',
            '@keyframes vaultFadeIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }',
            '@keyframes vaultToastSlide {',
            '    from { opacity:0; transform:translateY(20px); }',
            '    to { opacity:1; transform:translateY(0); }',
            '}',
            '.vault-card h1 { color:#fff; margin:0 0 5px 0; font-size:22px; text-transform:uppercase; letter-spacing:1px; }',
            '.vault-subtitle { color:#888; font-size:12px; margin-bottom:20px; }',
            '.vault-info-box { background:#222; padding:15px; border-radius:12px; margin-bottom:15px; text-align:left; border:1px solid #333; }',
            '.vault-info-label { color:#666; font-size:11px; text-transform:uppercase; }',
            '.vault-info-value { color:#fff; font-size:16px; margin-bottom:8px; }',
            '.vault-info-status { display:inline-block; padding:4px 12px; border-radius:6px; font-size:11px; font-weight:bold; text-transform:uppercase; }',
            '.vault-info-status.authenticated { background:#27ae60; color:#fff; }',
            '.vault-info-status.guest { background:#e67e22; color:#fff; }',
            '.vault-warning-box { background:#c0392b; padding:12px; border-radius:10px; margin-bottom:15px; border-left:4px solid #922b21; }',
            '.vault-warning-box p { color:#fff; font-size:12px; margin:5px 0; }',
            '.vault-input {',
            '    width:100%; height:50px; margin-bottom:12px; border-radius:12px;',
            '    border:1.5px solid #333; background:#222; color:#fff;',
            '    font-size:16px; padding:0 15px; box-sizing:border-box; outline:none;',
            '    -webkit-user-select:text !important; user-select:text !important;',
            '    touch-action:manipulation; pointer-events:auto;',
            '    -webkit-appearance:none; appearance:none;',
            '    -webkit-font-smoothing: antialiased;',
            '}',
            '.vault-input::placeholder { color:#555; }',
            '.vault-input:focus { border-color:' + $.accentColor + '; background:#2a2a2a; box-shadow:0 0 8px rgba(52,152,219,0.3); }',
            '.vault-btn {',
            '    width:100%; min-height:52px; height:52px; border-radius:12px; border:none;',
            '    font-weight:bold; font-size:16px; cursor:pointer;',
            '    transition:transform 0.1s, background 0.2s; display:flex; align-items:center; justify-content:center;',
            '    touch-action:manipulation; pointer-events:auto;',
            '    -webkit-tap-highlight-color:transparent;',
            '    -webkit-user-select:none; user-select:none;',
            '    -webkit-appearance:none; appearance:none;',
            '    font-family: inherit; padding: 0;',
            '}',
            '.vault-btn:active { transform:scale(0.97); }',
            '.vault-btn:disabled { opacity:0.5; cursor:not-allowed; }',
            '.btn-primary   { background:' + $.accentColor + '; color:white; margin-top:5px; }',
            '.btn-primary:hover:not(:disabled) { background:' + $.lightenColor($.accentColor, 15) + '; }',
            '.btn-secondary { background:transparent; color:#888; border:1px solid #333; margin-top:10px; }',
            '.btn-secondary:hover:not(:disabled) { border-color:' + $.accentColor + '; color:#aaa; }',
            '.btn-danger    { background:#c0392b; color:white; margin-top:10px; }',
            '.btn-danger:hover:not(:disabled) { background:#a93226; }',
            '.btn-forgot    { background:transparent; color:' + $.accentColor + '; font-size:13px; margin-top:15px; height:auto; min-height:48px; text-decoration:underline; padding: 8px; }',
            '.vault-error   { color:#ff4757; font-size:12px; margin:8px 0; min-height:15px; font-weight:bold; }',
            '.vault-toast   { font-family: \'Segoe UI\', sans-serif; pointer-events:auto; }',
            '.hidden        { display:none !important; }',
            '',
            '/* ===== MOBILE OPTIMIZATIONS ===== */',
            '@media (max-width: 480px) {',
            '    .vault-card {',
            '        width: 90%; max-width: 100%; padding: 20px;',
            '        margin: 10px auto; border-radius: 16px;',
            '    }',
            '    .vault-card h1 { font-size: 20px; }',
            '    .vault-input {',
            '        height: 56px; font-size: 16px; padding: 0 12px;',
            '        margin-bottom: 14px; border-radius: 10px;',
            '    }',
            '    .vault-btn {',
            '        min-height: 56px; height: 56px; font-size: 15px;',
            '        margin-top: 8px; border-radius: 10px;',
            '    }',
            '    .vault-info-value { font-size: 15px; }',
            '    .vault-subtitle { font-size: 11px; }',
            '}',
            '',
            '@media (max-width: 320px) {',
            '    .vault-card { padding: 15px; }',
            '    .vault-card h1 { font-size: 18px; }',
            '    .vault-input { height: 50px; font-size: 14px; }',
            '    .vault-btn { min-height: 50px; height: 50px; }',
            '}',
            '',
            '/* Prevent keyboard from hiding input */',
            '@supports (padding: max(0px)) {',
            '    #vault-overlay {',
            '        padding-bottom: max(0px, env(safe-area-inset-bottom));',
            '    }',
            '}'
        ].join('\n');

        var style = document.createElement('style');
        style.id = 'vault-css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    };

    //=========================================================================
    // UTILITY: Color manipulation
    //=========================================================================
    $.lightenColor = function(color, percent) {
        var num = parseInt(color.replace("#",""), 16);
        var amt = Math.round(2.55 * percent);
        var R = Math.min(255, (num >> 16) + amt);
        var G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        var B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R*0x10000 + G*0x100 + B).toString(16).slice(1);
    };

    //=========================================================================
    // Account Manager with Encryption
    //=========================================================================
    $.AccountManager = {
        getAccounts: function() {
            try {
                var raw = localStorage.getItem('VaultSave_accounts') || '{}';
                var accounts = JSON.parse(raw);
                
                // Decrypt account data if encryption is enabled
                if ($.enableEncryption) {
                    var decrypted = {};
                    for (var user in accounts) {
                        if (accounts.hasOwnProperty(user)) {
                            decrypted[user] = {
                                password: $.SimpleHash.decrypt(accounts[user].password, user),
                                createdAt: accounts[user].createdAt || Date.now()
                            };
                        }
                    }
                    return decrypted;
                }
                return accounts;
            } catch(e) {
                console.warn('Failed to retrieve accounts:', e);
                return {};
            }
        },
        
        save: function(list) {
            try {
                var toStore = {};
                
                // Encrypt passwords before storage
                for (var user in list) {
                    if (list.hasOwnProperty(user)) {
                        toStore[user] = {
                            password: $.enableHashPassword ? 
                                $.SimpleHash.encrypt(list[user].password, user) : 
                                list[user].password,
                            createdAt: list[user].createdAt || Date.now()
                        };
                    }
                }
                
                localStorage.setItem('VaultSave_accounts', JSON.stringify(toStore));
            } catch(e) {
                console.error('Failed to save accounts:', e);
            }
        },
        
        login: function(user, pass) {
            var list = this.getAccounts();
            
            if (!list[user]) {
                // New account
                if (Object.keys(list).length >= $.maxAccounts) {
                    return "Maximum accounts reached.";
                }
                list[user] = { 
                    password: pass,
                    createdAt: Date.now()
                };
                this.save(list);
                $.ToastManager.show('✓ Account created successfully!', 'success');
                return true;
            }
            
            // Verify password
            var storedPass = $.enableHashPassword ? 
                $.SimpleHash.hash(pass, user) : 
                pass;
            var accountPass = $.enableHashPassword ?
                $.SimpleHash.hash(list[user].password, user) :
                list[user].password;
            
            if (accountPass === storedPass) {
                $.ToastManager.show('✓ Welcome back, ' + user + '!', 'success');
                $.SessionManager.startSession(user);
                return true;
            }
            
            $.ToastManager.show('✗ Invalid password.', 'error');
            return "Invalid password.";
        },
        
        deleteAccount: function(user) {
            var list = this.getAccounts();
            delete list[user];
            this.save(list);
            $.ToastManager.show('Account deleted.', 'warning');
        },
        
        downloadData: function(user) {
            var list = this.getAccounts();
            if (!list[user]) return;
            
            var createdDate = new Date(list[user].createdAt || Date.now()).toLocaleString();
            var content = [
                '═════════════════════════════════════',
                'VAULT SAVE - ACCOUNT DATA EXPORT',
                '═════════════════════════════════════',
                'Username: ' + user,
                'Account Created: ' + createdDate,
                'Export Date: ' + new Date().toLocaleString(),
                'Status: Authenticated User',
                '═════════════════════════════════════',
                '',
                'Keep this file safe. It contains your account information.',
                'DO NOT share your password with anyone.'
            ].join('\n');
            
            var blob = new Blob([content], { type: 'text/plain' });
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'VaultSave_' + user + '_' + Date.now() + '.txt';
            a.click();
            window.URL.revokeObjectURL(url);
            $.ToastManager.show('Account data downloaded.', 'info');
        }
    };

    //=========================================================================
    // Window_TitleCommand — inject "My Account"
    //=========================================================================
    var _makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function() {
        _makeCommandList.call(this);
        if ($.currentUser) {
            this.addCommand($.myAccountText, 'vaultAccount', true);
        }
    };

    //=========================================================================
    // Scene_Title hooking
    //=========================================================================
    var _createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        _createCommandWindow.call(this);
        this._commandWindow.setHandler('vaultAccount', this.commandVaultAccount.bind(this));
    };

    Scene_Title.prototype.commandVaultAccount = function() {
        this.showAccountManager();
    };

    var _commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function() {
        if (!$.currentUser && !$.guestSession) {
            this._pendingCommand = 'newGame';
            this.showVaultLogin();
        } else {
            _commandNewGame.call(this);
        }
    };

    var _commandContinue = Scene_Title.prototype.commandContinue;
    Scene_Title.prototype.commandContinue = function() {
        if (!$.currentUser && !$.guestSession) {
            this._pendingCommand = 'continue';
            this.showVaultLogin();
        } else {
            _commandContinue.call(this);
        }
    };

    //=========================================================================
    // UI: Login / Register with Input Focus Management
    //=========================================================================
    Scene_Title.prototype.showVaultLogin = function() {
        injectStyles();
        var self = this;
        var overlay = document.createElement('div');
        overlay.id = 'vault-overlay';

        ['touchstart','touchmove','touchend','mousedown','mousemove','mouseup'].forEach(function(evt) {
            overlay.addEventListener(evt, function(e) { e.stopPropagation(); }, { passive: false });
        });

        var guestButtonHtml = $.guestAllowed ? 
            '<button id="v-guest" class="vault-btn btn-secondary">PLAY AS GUEST (Limited)</button>' : '';

        overlay.innerHTML = [
            '<div class="vault-card">',
            '    <h1>' + $.titleText + '</h1>',
            '    <div class="vault-subtitle">Enter credentials to proceed</div>',
            '    <input type="text"     id="v-user" class="vault-input" placeholder="Username (3-12 chars)" maxlength="' + $.maxUser + '" autocomplete="username" spellcheck="false" inputmode="text">',
            '    <input type="password" id="v-pass" class="vault-input" placeholder="Password (4-16 chars)" maxlength="' + $.maxPass + '" autocomplete="current-password" inputmode="password">',
            '    <div id="v-error" class="vault-error"></div>',
            '    <button id="v-login"  class="vault-btn btn-primary">LOGIN / REGISTER</button>',
            guestButtonHtml,
            '    <button id="v-forgot" class="vault-btn btn-forgot">Forgot Password?</button>',
            '</div>'
        ].join('\n');

        document.body.appendChild(overlay);

        var userInput = document.getElementById('v-user');
        var passInput = document.getElementById('v-pass');
        var errorEl = document.getElementById('v-error');

        // Enhanced mobile keyboard handling
        var isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        [userInput, passInput].forEach(function(input) {
            // Prevent default zoom on focus for iOS
            input.addEventListener('touchstart', function(e) {
                e.stopPropagation();
            }, { passive: true });
            
            input.addEventListener('touchend', function(e) {
                e.stopPropagation();
                e.preventDefault();
                input.focus();
            }, { passive: false });
            
            input.addEventListener('focus', function() {
                input.style.borderColor = $.accentColor;
                // Scroll into view on mobile keyboard appear
                if (isMobileDevice) {
                    setTimeout(function() {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            });
            
            input.addEventListener('blur', function() {
                input.style.borderColor = '#333';
            });
            
            // Allow Enter key to submit
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    doLogin();
                }
            });
        });

        // Login handler with validation
        var doLogin = function() {
            var u = userInput.value.trim();
            var p = passInput.value.trim();
            
            errorEl.innerText = '';
            
            if (u.length === 0) {
                errorEl.innerText = 'Username required.';
                userInput.focus();
                return;
            }
            if (u.length < $.minUser) {
                errorEl.innerText = 'Username too short (Min: ' + $.minUser + ')';
                userInput.focus();
                return;
            }
            if (u.length > $.maxUser) {
                errorEl.innerText = 'Username too long (Max: ' + $.maxUser + ')';
                userInput.focus();
                return;
            }
            if (p.length === 0) {
                errorEl.innerText = 'Password required.';
                passInput.focus();
                return;
            }
            if (p.length < $.minPass) {
                errorEl.innerText = 'Password too short (Min: ' + $.minPass + ')';
                passInput.focus();
                return;
            }
            if (p.length > $.maxPass) {
                errorEl.innerText = 'Password too long (Max: ' + $.maxPass + ')';
                passInput.focus();
                return;
            }
            
            var result = $.AccountManager.login(u, p);
            if (result === true) {
                $.currentUser = u;
                self.closeVault(true);
            } else {
                errorEl.innerText = typeof result === 'string' ? result : 'Invalid password.';
                passInput.value = '';
                passInput.focus();
            }
        };

        onTap(document.getElementById('v-login'), doLogin);

        // Forgot password
        onTap(document.getElementById('v-forgot'), function() {
            errorEl.style.color = $.accentColor;
            errorEl.innerText = $.forgotMsg;
            setTimeout(function() { errorEl.style.color = '#ff4757'; }, 4000);
        });

        // Guest mode
        if ($.guestAllowed) {
            onTap(document.getElementById('v-guest'), function() {
                $.guestSession = true;
                if ($.guestModeWarning) {
                    $.ToastManager.show('⚠ Guest mode: Saves are limited to ' + $.guestSlots + ' slot(s).', 'guest');
                }
                self.closeVault(false);
            });
        }

        // Auto-focus first input
        setTimeout(function() { userInput.focus(); }, 100);
    };

    // Alias for showVault to call showVaultLogin
    Scene_Title.prototype.showVault = function() {
        this.showVaultLogin();
    };

    //=========================================================================
    // Mobile Support Initialization
    //=========================================================================
    var _Scene_Title_initialize = Scene_Title.prototype.initialize;
    Scene_Title.prototype.initialize = function() {
        _Scene_Title_initialize.call(this);
        
        // Detect mobile device
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Set viewport for better mobile compatibility
        if (isMobile && !document.querySelector('meta[name="viewport"]')) {
            var viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            document.head.appendChild(viewport);
        }
        
        // Prevent double-tap zoom on mobile buttons
        document.addEventListener('touchend', function() {}, { passive: true });
    };

    //=========================================================================
    // UI: Account Management
    //=========================================================================
    Scene_Title.prototype.showAccountManager = function() {
        injectStyles();
        var self = this;
        var overlay = document.createElement('div');
        overlay.id = 'vault-overlay';

        ['touchstart','touchmove','touchend','mousedown','mousemove','mouseup'].forEach(function(evt) {
            overlay.addEventListener(evt, function(e) { e.stopPropagation(); }, { passive: false });
        });

        var accountType = $.guestSession ? 'Guest (Limited)' : 'Authenticated User';
        var accountStatus = $.guestSession ? 
            '<span class="vault-info-status guest">GUEST</span>' : 
            '<span class="vault-info-status authenticated">VERIFIED</span>';

        overlay.innerHTML = [
            '<div class="vault-card">',
            '    <h1>Account Settings</h1>',
            '    <div class="vault-subtitle">Manage your account & data</div>',
            '    <div class="vault-info-box">',
            '        <div class="vault-info-label">Current User</div>',
            '        <div class="vault-info-value">' + ($.currentUser || 'Guest') + ' ' + accountStatus + '</div>',
            '        <div class="vault-info-label">Account Type</div>',
            '        <div class="vault-info-value">' + accountType + '</div>',
            ($.guestSession ? '<div class="vault-info-label">Save Slots Available</div><div class="vault-info-value">' + $.guestSlots + '/' + $.guestSlots + '</div>' : ''),
            '    </div>',
            ($.guestSession ? '<div class="vault-warning-box"><p>⚠ You are in guest mode with limited functionality.</p><p>Create an account to save permanently.</p></div>' : ''),
            '    ' + ($.currentUser ? '<button id="v-download" class="vault-btn btn-primary">DOWNLOAD DATA (.TXT)</button>' : ''),
            '    <button id="v-logout"   class="vault-btn btn-danger">LOGOUT</button>',
            '    <button id="v-back"     class="vault-btn btn-secondary">BACK TO MENU</button>',
            '</div>'
        ].join('\n');

        document.body.appendChild(overlay);

        if ($.currentUser) {
            onTap(document.getElementById('v-download'), function() {
                $.AccountManager.downloadData($.currentUser);
            });
        }

        onTap(document.getElementById('v-logout'), function() {
            var user = $.currentUser;
            $.currentUser = null;
            $.guestSession = false;
            $.isSessionValid = true;
            $.ToastManager.show('✓ Logged out successfully.', 'success');
            self.closeVault(true);
        });

        onTap(document.getElementById('v-back'), function() {
            self.closeVault(false);
        });
    };

    //=========================================================================
    // Close overlay & resume game (moved to Title Screen Integration below)
    //=========================================================================

    //=========================================================================
    // Save System Integration
    //=========================================================================
    DataManager.makeSavename = function(savefileId) {
        if ($.currentUser) {
            return 'vlt_' + $.currentUser + '_' + savefileId;
        } else if ($.guestSession) {
            return 'guest_' + savefileId;
        }
        return 'file' + savefileId;
    };

    DataManager.maxSavefiles = function() {
        if ($.currentUser) {
            return $.slotsPerUser;
        } else if ($.guestSession) {
            return $.guestSlots;
        }
        return 3;
    };

    //=========================================================================
    // Auto-save blocking for guest mode
    //=========================================================================
    if ($.guestAutoSaveDisabled) {
        var _autoSave = DataManager.saveGame;
        DataManager.autoSave = function(savefileId) {
            if ($.guestSession) {
                return false; // Block auto-save in guest mode
            }
            return _autoSave.call(this, savefileId);
        };
    }

    //=========================================================================
    // Title Screen Integration - Hide/Show Commands Based on Login Status
    //=========================================================================
    var _Scene_Title_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function() {
        _Scene_Title_create.call(this);
        this._isUserLoggedIn = $.currentUser !== null || $.guestSession;
    };

    var _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        _Scene_Title_createCommandWindow.call(this);
        this._commandWindow.setBackgroundType(0);
    };

    var _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function() {
        // Check if user is logged in
        var isLoggedIn = VaultSave.currentUser !== null || VaultSave.guestSession;
        
        if (!isLoggedIn) {
            // Show only "Tap To Login" when not logged in
            this.addCommand('Tap To Login', 'vault');
            // Add options command - check if method exists first
            if (typeof this.isOptionsEnabled === 'function') {
                this.addCommand(TextManager.options, 'options', this.isOptionsEnabled());
            } else {
                // Fallback for different MV versions
                this.addCommand(TextManager.options, 'options', true);
            }
        } else {
            // Show normal commands when logged in
            // Check if methods exist before calling them
            var newGameEnabled = typeof this.isNewGameEnabled === 'function' ? this.isNewGameEnabled() : true;
            var continueEnabled = typeof this.isContinueEnabled === 'function' ? this.isContinueEnabled() : true;
            
            this.addCommand(TextManager.newGame, 'newGame', newGameEnabled);
            this.addCommand(TextManager.continue_, 'continue', continueEnabled);
            
            // Show logged-in user info as a display command
            var userDisplay = '~ ' + (VaultSave.currentUser || 'Guest Mode') + ' ~';
            this.addCommand(userDisplay, 'userInfo', false);
            
            // Add options command - check if method exists first
            if (typeof this.isOptionsEnabled === 'function') {
                this.addCommand(TextManager.options, 'options', this.isOptionsEnabled());
            } else {
                // Fallback for different MV versions
                this.addCommand(TextManager.options, 'options', true);
            }
        }
    };

    // Override command window behavior for vault command
    var _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function() {
        if (VaultSave.currentUser !== null || VaultSave.guestSession) {
            _Scene_Title_commandNewGame.call(this);
        }
    };

    var _Scene_Title_commandContinue = Scene_Title.prototype.commandContinue;
    Scene_Title.prototype.commandContinue = function() {
        if (VaultSave.currentUser !== null || VaultSave.guestSession) {
            _Scene_Title_commandContinue.call(this);
        }
    };

    // Add vault login command handler
    Scene_Title.prototype.commandVault = function() {
        this.showVault();
    };

    // Add user info command (display only)
    Scene_Title.prototype.commandUserInfo = function() {
        // This is a display-only command, no action needed
    };

    // Hook into the actual command window OK handler - more reliable
    var _Window_TitleCommand_processOk = Window_TitleCommand.prototype.processOk;
    Window_TitleCommand.prototype.processOk = function() {
        var symbol = this.currentSymbol();
        
        // Handle vault command
        if (symbol === 'vault') {
            this.playOkSound();
            this.deactivate();
            
            // Get the scene - works with different MV versions
            var scene = this._scene || SceneManager._scene;
            if (scene && typeof scene.commandVault === 'function') {
                scene.commandVault();
            }
            return;
        }
        
        // Call original for other commands
        if (_Window_TitleCommand_processOk) {
            _Window_TitleCommand_processOk.call(this);
        }
    };

    //=========================================================================
    // Enhanced Login Flow - Refresh Title Commands After Login
    //=========================================================================
    var _closeVaultOriginal = Scene_Title.prototype.closeVault;
    Scene_Title.prototype.closeVault = function(refreshMenu) {
        var el = document.getElementById('vault-overlay');
        if (el) el.remove();

        if (refreshMenu) {
            // Fully recreate command list to show new game/continue
            if (this._commandWindow) {
                this._commandWindow.clearCommandList();
                this._commandWindow.makeCommandList();
                this._commandWindow.refresh();
                this._commandWindow.activate();
                // Try to select newGame command if it exists
                this._commandWindow.selectSymbol('newGame');
            }
        } else {
            if (this._commandWindow) {
                this._commandWindow.activate();
            }
        }

        if (this._pendingCommand === 'newGame') {
            this._pendingCommand = null;
            _Scene_Title_commandNewGame.call(this);
        } else if (this._pendingCommand === 'continue') {
            this._pendingCommand = null;
            _Scene_Title_commandContinue.call(this);
        }
    };

})(VaultSave);