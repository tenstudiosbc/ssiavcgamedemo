//=============================================================================
// UpdateLog.js
//=============================================================================

/*:
 * @plugindesc Mobile-responsive update log popup for RPG Maker MV.
 * @author Gemini (Simplified)
 * 
 * @param Version
 * @desc Change this to force the popup to show again.
 * @default 1.0.0
 * 
 * @param Title
 * @desc Title at the top of the popup.
 * @default Version Update
 * 
 * @param Message
 * @type note
 * @desc Update notes (use \n for new lines).
 * @default "• Added new features.\n• Fixed bugs.\n• Optimized mobile."
 * 
 * @param Button Text
 * @desc The button label.
 * @default ACCEPT
 * 
 * @param Show On Title
 * @type boolean
 * @desc Show popup on title screen?
 * @default true
 * 
 * @param Show On Map
 * @type boolean
 * @desc Show popup when starting a game?
 * @default true
 * 
 * --- COLORS ---
 * 
 * @param Background Color
 * @desc Background RGBA (e.g. rgba(20,20,20,0.95))
 * @default rgba(20, 20, 20, 0.95)
 * 
 * @param Text Color
 * @desc Text color (e.g. #ffffff)
 * @default #ffffff
 * 
 * @param Accent Color
 * @desc Border and button color (e.g. #ffcc00)
 * @default #ffcc00
 * 
 * @param Button Hover Color
 * @desc Button color on hover/touch (e.g. #ddaa00)
 * @default #ddaa00
 * 
 * --- SIZING ---
 * 
 * @param Window Width Percent
 * @type number
 * @min 50
 * @max 100
 * @desc Window width as % of screen (50-100).
 * @default 85
 * 
 * @param Max Width
 * @type number
 * @desc Maximum width in pixels (e.g. 450).
 * @default 450
 * 
 * @param Max Height Percent
 * @type number
 * @min 40
 * @max 95
 * @desc Max height as % of viewport (40-95).
 * @default 80
 * 
 * @param Padding
 * @type number
 * @desc Padding inside window (pixels).
 * @default 20
 * 
 * --- FONTS ---
 * 
 * @param Title Font Size
 * @type number
 * @desc Title text size (pixels).
 * @default 22
 * 
 * @param Content Font Size
 * @type number
 * @desc Message text size (pixels).
 * @default 15
 * 
 * @param Button Font Size
 * @type number
 * @desc Button text size (pixels).
 * @default 18
 * 
 * @param Font Family
 * @desc Font name (e.g. Arial, Verdana).
 * @default Arial, sans-serif
 * 
 * --- ANIMATION ---
 * 
 * @param Animation Speed
 * @type number
 * @min 100
 * @max 1000
 * @desc Pop-in animation duration (milliseconds).
 * @default 300
 * 
 * @param Border Width
 * @type number
 * @desc Border thickness (pixels).
 * @default 2
 * 
 * @param Border Radius
 * @type number
 * @desc Corner rounding (pixels).
 * @default 10
 * 
 * --- MOBILE ---
 * 
 * @param Mobile Padding
 * @type number
 * @desc Extra padding on mobile (pixels).
 * @default 15
 * 
 * @param Touch Feedback
 * @type boolean
 * @desc Show color change when touching button?
 * @default true
 * 
 * @help
 * SETUP:
 * 1. Place this file in js/plugins/
 * 2. Add to your game's Plugin Manager
 * 3. Configure all parameters in Plugin Manager
 * 4. Change "Version" parameter to update popup for all players
 * 
 * MULTILINE NOTES:
 * In the Message parameter, use \n for new lines.
 * Use • or - to create bullet points.
 * 
 * STORAGE:
 * The plugin uses browser localStorage to track seen versions.
 * Players won't see the popup twice for the same version.
 */

(function() {
    'use strict';

    const params = PluginManager.parameters('UpdateLog');

    // Helper to parse note-type parameters
    function getParam(key) {
        const raw = params[key];
        if (!raw) return '';
        try {
            return JSON.parse(raw).replace(/\\n/g, '\n');
        } catch {
            return String(raw).replace(/\\n/g, '\n');
        }
    }

    // Load all parameters
    const CONFIG = {
        version: String(params['Version'] || '1.0.0'),
        title: String(params['Title'] || 'Update'),
        message: getParam('Message'),
        buttonText: String(params['Button Text'] || 'OK'),
        showOnTitle: params['Show On Title'] === 'true',
        showOnMap: params['Show On Map'] === 'true',
        bgColor: String(params['Background Color'] || 'rgba(20, 20, 20, 0.95)'),
        textColor: String(params['Text Color'] || '#ffffff'),
        accentColor: String(params['Accent Color'] || '#ffcc00'),
        hoverColor: String(params['Button Hover Color'] || '#ddaa00'),
        windowWidthPercent: Number(params['Window Width Percent'] || 85),
        maxWidth: Number(params['Max Width'] || 450),
        maxHeightPercent: Number(params['Max Height Percent'] || 80),
        padding: Number(params['Padding'] || 20),
        titleFontSize: Number(params['Title Font Size'] || 22),
        contentFontSize: Number(params['Content Font Size'] || 15),
        buttonFontSize: Number(params['Button Font Size'] || 18),
        fontFamily: String(params['Font Family'] || 'Arial, sans-serif'),
        animationSpeed: Number(params['Animation Speed'] || 300),
        borderWidth: Number(params['Border Width'] || 2),
        borderRadius: Number(params['Border Radius'] || 10),
        mobilePadding: Number(params['Mobile Padding'] || 15),
        touchFeedback: params['Touch Feedback'] !== 'false'
    };

    const STORAGE_KEY = 'RPG_UpdateLog_Version';

    // Hook into title screen
    if (CONFIG.showOnTitle) {
        const _Scene_Title_start = Scene_Title.prototype.start;
        Scene_Title.prototype.start = function() {
            _Scene_Title_start.call(this);
            showUpdateLog();
        };
    }

    // Hook into map start
    if (CONFIG.showOnMap) {
        const _Scene_Map_start = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            _Scene_Map_start.call(this);
            showUpdateLog();
        };
    }

    function showUpdateLog() {
        const seen = localStorage.getItem(STORAGE_KEY);
        if (seen !== CONFIG.version) {
            createPopup();
        }
    }

    function createPopup() {
        // Prevent duplicates
        if (document.getElementById('update-log-overlay')) return;

        // Inject styles
        injectStyles();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'update-log-overlay';
        setStyles(overlay, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999',
            fontFamily: CONFIG.fontFamily
        });

        // Create window
        const window_ = document.createElement('div');
        window_.className = 'update-log-window';
        setStyles(window_, {
            backgroundColor: CONFIG.bgColor,
            padding: CONFIG.padding + 'px',
            borderRadius: CONFIG.borderRadius + 'px',
            border: CONFIG.borderWidth + 'px solid ' + CONFIG.accentColor,
            width: CONFIG.windowWidthPercent + '%',
            maxWidth: CONFIG.maxWidth + 'px',
            maxHeight: CONFIG.maxHeightPercent + 'vh',
            color: CONFIG.textColor,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.9)',
            animation: 'updateLogFadeIn ' + (CONFIG.animationSpeed / 1000) + 's ease-out'
        });

        // Title
        const title = document.createElement('div');
        title.className = 'update-log-title';
        title.textContent = CONFIG.title;
        setStyles(title, {
            fontSize: CONFIG.titleFontSize + 'px',
            fontWeight: 'bold',
            color: CONFIG.accentColor,
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid ' + CONFIG.accentColor,
            flexShrink: '0'
        });

        // Content
        const content = document.createElement('div');
        content.className = 'update-log-content';
        content.textContent = CONFIG.message;
        setStyles(content, {
            fontSize: CONFIG.contentFontSize + 'px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowY: 'auto',
            flexGrow: '1',
            marginBottom: '15px',
            padding: '10px',
            textAlign: 'left'
        });

        // Button
        const button = document.createElement('button');
        button.className = 'update-log-button';
        button.textContent = CONFIG.buttonText;
        setStyles(button, {
            padding: '15px 20px',
            fontSize: CONFIG.buttonFontSize + 'px',
            backgroundColor: CONFIG.accentColor,
            color: '#000',
            border: 'none',
            borderRadius: CONFIG.borderRadius + 'px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.15s',
            flexShrink: '0'
        });

        // Button interactions
        if (CONFIG.touchFeedback) {
            button.addEventListener('mousedown', () => {
                button.style.backgroundColor = CONFIG.hoverColor;
            });
            button.addEventListener('mouseup', () => {
                button.style.backgroundColor = CONFIG.accentColor;
            });
            button.addEventListener('touchstart', () => {
                button.style.backgroundColor = CONFIG.hoverColor;
            });
            button.addEventListener('touchend', () => {
                button.style.backgroundColor = CONFIG.accentColor;
            });
        }

        // Close function
        function closePopup() {
            localStorage.setItem(STORAGE_KEY, CONFIG.version);
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        }

        button.addEventListener('click', closePopup);
        button.addEventListener('touchend', closePopup);

        // Prevent scroll on overlay (but allow scroll in content)
        overlay.addEventListener('touchmove', (e) => {
            if (e.target === content) return;
            e.preventDefault();
        }, { passive: false });

        // Assemble
        window_.appendChild(title);
        window_.appendChild(content);
        window_.appendChild(button);
        overlay.appendChild(window_);
        document.body.appendChild(overlay);
    }

    function injectStyles() {
        if (document.getElementById('update-log-styles')) return;

        const style = document.createElement('style');
        style.id = 'update-log-styles';
        style.textContent = `
            @keyframes updateLogFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .update-log-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .update-log-content::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
            }
            
            .update-log-content::-webkit-scrollbar-thumb {
                background: ` + CONFIG.accentColor + `;
                border-radius: 10px;
            }
            
            .update-log-content::-webkit-scrollbar-thumb:hover {
                background: ` + CONFIG.hoverColor + `;
            }
        `;
        document.head.appendChild(style);
    }

    function setStyles(element, styles) {
        Object.assign(element.style, styles);
    }

})();