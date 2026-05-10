//=============================================================================
// VaultTerms.js
//=============================================================================
/*:
 * @plugindesc v1.0.1 - Mobile-friendly Terms of Service and local storage info gateway.
 * @author Gemini
 *
 * @param TermsTitle
 * @type string
 * @default DATA PRIVACY & TERMS
 *
 * @param AccentColor
 * @type string
 * @default #3498db
 *
 * @param TermsText
 * @type note
 * @default "Welcome to the Vault Save System.\n\n1. LOCAL STORAGE: This game uses an internal local storage system to manage accounts. NO DATA is sent to an external server.\n\n2. SECURITY: Your account data (username/password) is stored locally on this device's browser cache or app data. If you clear your browser data, your accounts and save files will be lost.\n\n3. RESPONSIBILITY: You are responsible for remembering your credentials. Since there is no server, there is no 'Forgot Password' recovery via email, You can always download your data on My Account Menu in title screen and put it somewhere safe.\n\n4. CONSENT: By clicking 'I AGREE', you consent to the storage of this data on your device. If you disagree, the game will close."
 *
 * @param AgreeText
 * @type string
 * @default I AGREE
 *
 * @param DisagreeText
 * @type string
 * @default DISAGREE
 */

var VaultTerms = VaultTerms || {};

(function($) {
    "use strict";

    var params     = PluginManager.parameters('VaultTerms');
    $.title        = String(params['TermsTitle']    || "DATA PRIVACY");
    $.accent       = String(params['AccentColor']   || "#3498db");
    $.content      = JSON.parse(params['TermsText'] || '""');
    $.agreeText    = String(params['AgreeText']     || "I AGREE");
    $.disagreeText = String(params['DisagreeText']  || "DISAGREE");

    var STORAGE_KEY = 'VaultSave_TermsAgreed';

    //=========================================================================
    // HOTFIX: TouchInput Blocker
    // Store originals once so we can null-check safely even if VaultSave.js
    // patched them first (load-order resilient).
    //=========================================================================
    function isTermsOpen() {
        return !!document.getElementById('vault-terms-overlay');
    }

    // Only install patch if VaultSave.js has NOT already installed its own
    // (VaultSave checks 'vault-overlay'; we check 'vault-terms-overlay' separately).
    if (typeof VaultSave === 'undefined') {
        // VaultSave is absent — install a standalone blocker for the terms overlay.
        var _origTS = TouchInput._onTouchStart ? TouchInput._onTouchStart.bind(TouchInput) : null;
        var _origTM = TouchInput._onTouchMove  ? TouchInput._onTouchMove.bind(TouchInput)  : null;
        var _origTE = TouchInput._onTouchEnd   ? TouchInput._onTouchEnd.bind(TouchInput)   : null;
        var _origMD = TouchInput._onMouseDown  ? TouchInput._onMouseDown.bind(TouchInput)  : null;
        var _origMM = TouchInput._onMouseMove  ? TouchInput._onMouseMove.bind(TouchInput)  : null;
        var _origMU = TouchInput._onMouseUp    ? TouchInput._onMouseUp.bind(TouchInput)    : null;

        TouchInput._onTouchStart = function(e) { if (isTermsOpen()) return; if (_origTS) _origTS(e); };
        TouchInput._onTouchMove  = function(e) { if (isTermsOpen()) return; if (_origTM) _origTM(e); };
        TouchInput._onTouchEnd   = function(e) { if (isTermsOpen()) return; if (_origTE) _origTE(e); };
        TouchInput._onMouseDown  = function(e) { if (isTermsOpen()) return; if (_origMD) _origMD(e); };
        TouchInput._onMouseMove  = function(e) { if (isTermsOpen()) return; if (_origMM) _origMM(e); };
        TouchInput._onMouseUp    = function(e) { if (isTermsOpen()) return; if (_origMU) _origMU(e); };
    } else {
        // VaultSave IS present — extend its isVaultOpen guard to cover terms overlay too.
        // We do this by wrapping the already-patched handlers with an extra check.
        ['_onTouchStart','_onTouchMove','_onTouchEnd','_onMouseDown','_onMouseMove','_onMouseUp'].forEach(function(fn) {
            var prev = TouchInput[fn] ? TouchInput[fn].bind(TouchInput) : null;
            TouchInput[fn] = function(e) {
                if (isTermsOpen()) return;
                if (prev) prev(e);
            };
        });
    }

    //=========================================================================
    // Helper: unified tap handler (touch + click, no ghost clicks)
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
        element.addEventListener('click', function() {
            if (touched) return;
            handler();
        });
    }

    //=========================================================================
    // CSS Injection
    //=========================================================================
    var injectTermsStyles = function() {
        if (document.getElementById('vault-terms-css')) return;
        var css = [
            '#vault-terms-overlay {',
            '    position:fixed; top:0; left:0; width:100%; height:100%;',
            '    background:rgba(0,0,0,0.9); display:flex; align-items:center;',
            '    justify-content:center; z-index:20000; font-family:sans-serif;',
            '    padding:20px; box-sizing:border-box;',
            '    touch-action:auto; pointer-events:auto;',      /* HOTFIX */
            '}',
            '.terms-card {',
            '    background:#1a1a1a; width:100%; max-width:400px;',
            '    max-height:85vh; border-radius:15px; border:1px solid #333;',
            '    display:flex; flex-direction:column; overflow:hidden;',
            '    animation:termsPop 0.3s ease-out;',
            '    touch-action:auto;',                           /* HOTFIX */
            '}',
            '@keyframes termsPop { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }',
            '.terms-header { padding:20px; border-bottom:1px solid #333; text-align:center; }',
            '.terms-header h2 { color:#fff; margin:0; font-size:18px; letter-spacing:1px; }',
            '.terms-body {',
            '    padding:20px; color:#bbb; font-size:14px; line-height:1.6;',
            '    overflow-y:auto; flex-grow:1; white-space:pre-wrap;',
            '    -webkit-overflow-scrolling:touch;',            /* HOTFIX: smooth scroll on iOS */
            '    background:#121212;',
            '    touch-action:pan-y;',                         /* HOTFIX: allow vertical scroll only */
            '    pointer-events:auto;',                        /* HOTFIX */
            '}',
            '.terms-footer {',
            '    padding:15px; display:flex; gap:10px; border-top:1px solid #333;',
            '    touch-action:auto;',                          /* HOTFIX */
            '}',
            '.terms-btn {',
            '    flex:1; height:45px; border-radius:8px; border:none;',
            '    font-weight:bold; cursor:pointer; font-size:14px;',
            '    transition:opacity 0.2s;',
            '    touch-action:manipulation;',                  /* HOTFIX: remove 300ms delay */
            '    pointer-events:auto;',                        /* HOTFIX */
            '    -webkit-tap-highlight-color:transparent;',    /* HOTFIX: remove grey flash */
            '    -webkit-user-select:none; user-select:none;',
            '}',
            '.terms-btn:active { opacity:0.7; }',
            '.btn-agree    { background:' + $.accent + '; color:#fff; }',
            '.btn-disagree { background:#333; color:#888; }'
        ].join('\n');

        var style = document.createElement('style');
        style.id = 'vault-terms-css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    };

    //=========================================================================
    // Logic Gate
    //=========================================================================
    var _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        this.checkVaultTerms();
    };

    Scene_Title.prototype.checkVaultTerms = function() {
        var agreed = localStorage.getItem(STORAGE_KEY);
        if (!agreed) {
            this._commandWindow.deactivate();
            this.showVaultTermsUI();
        }
    };

    Scene_Title.prototype.showVaultTermsUI = function() {
        injectTermsStyles();
        var self    = this;
        var overlay = document.createElement('div');
        overlay.id  = 'vault-terms-overlay';

        // HOTFIX: block ALL touch/pointer events from reaching the canvas/game
        ['touchstart','touchmove','touchend','mousedown','mousemove','mouseup'].forEach(function(evt) {
            overlay.addEventListener(evt, function(e) { e.stopPropagation(); }, { passive: false });
        });

        overlay.innerHTML = [
            '<div class="terms-card">',
            '    <div class="terms-header"><h2>' + $.title + '</h2></div>',
            '    <div class="terms-body">'  + $.content + '</div>',
            '    <div class="terms-footer">',
            '        <button id="terms-no"  class="terms-btn btn-disagree">' + $.disagreeText + '</button>',
            '        <button id="terms-yes" class="terms-btn btn-agree">'    + $.agreeText    + '</button>',
            '    </div>',
            '</div>'
        ].join('\n');

        document.body.appendChild(overlay);

        onTap(document.getElementById('terms-yes'), function() {
            localStorage.setItem(STORAGE_KEY, 'true');
            overlay.remove();
            self._commandWindow.activate();
        });

        onTap(document.getElementById('terms-no'), function() {
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp(); // Cordova / mobile wrapper
            } else {
                window.close();
                // Fallback for browsers that block window.close
                document.body.innerHTML = [
                    "<div style='color:white;text-align:center;margin-top:20%;",
                    "font-family:sans-serif;'>",
                    "<h1>Access Denied</h1>",
                    "<p>You must agree to the terms to play.</p>",
                    "</div>"
                ].join('');
            }
        });
    };

})(VaultTerms);