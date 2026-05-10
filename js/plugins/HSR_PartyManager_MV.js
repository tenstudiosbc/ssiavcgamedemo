//=============================================================================
// HSR_PartyManager_MV.js
// HSR Style Party Manager for RPG Maker MV
// Mobile Optimized | Touch Gestures | Deploy Button | Modern Animated UI
//=============================================================================
/*:
 * @plugindesc HSR Style Party Manager - Mobile Optimized & Animated
 * Swipe gestures, responsive sidebar, glassmorphism UI, and Deploy button.
 * @author TSBC Games (Modified)
 *
 * @param UseWalkingSprites
 * @text Use Walking Sprites
 * @desc true = walking sprites, false = Graphics/Pictures
 * @type boolean
 * @default true
 *
 * @param SpriteScale
 * @text Sprite Scale (Walking)
 * @desc Scale multiplier for walking sprites
 * @type number
 * @decimals 1
 * @default 2.5
 *
 * @param PicturePrefix
 * @text Picture Prefix
 * @desc Prefix of picture filename (e.g. "Actor")
 * @default Actor
 *
 * @param PictureSuffix
 * @text Picture Suffix
 * @desc Suffix of picture filename (e.g. "_Stand")
 * @default _Stand
 *
 * @param MaxTeams
 * @text Max Teams
 * @type number
 * @default 16
 *
 * @param MaxPartySize
 * @text Max Party Size
 * @type number
 * @default 4
 *
 * @help
 * ============================================================
 * PLUGIN COMMANDS
 * ============================================================
 * OpenPartyManager
 * Opens the Party Manager scene.
 *
 * ============================================================
 * ACTOR-VARIABLE MAPPING
 * ============================================================
 * Edit HSR_PartyManager.ACTOR_VAR_MAP inside the plugin to set
 * which actors are unlocked based on game variable values.
 * Format: { actorId: variableId, ... }
 *
 * ============================================================
 * TOUCH GESTURES & CONTROLS
 * ============================================================
 * Swipe Left/Right on Team Header -> Switch teams
 * Open Roster Button              -> Opens Character list on Mobile
 * Tap Roster Row                  -> Add actor to party (Auto-closes on Mobile)
 * Tap Party Slot (filled)         -> Remove actor from party
 * Deploy Button                   -> Apply team to game party
 * Back Button                     -> Return without applying
 */

var HSR_PartyManager = HSR_PartyManager || {};

//=============================================================================
// CONFIGURATION
//=============================================================================
HSR_PartyManager.Params = PluginManager.parameters('HSR_PartyManager_MV');

HSR_PartyManager.Config = {
    USE_WALKING_SPRITES : (HSR_PartyManager.Params['UseWalkingSprites'] !== 'false'),
    SPRITE_SCALE        : parseFloat(HSR_PartyManager.Params['SpriteScale'] || 2.5),
    PICTURE_PREFIX      : HSR_PartyManager.Params['PicturePrefix'] || 'Actor',
    PICTURE_SUFFIX      : HSR_PartyManager.Params['PictureSuffix'] || '_Stand',
    MAX_TEAMS           : parseInt(HSR_PartyManager.Params['MaxTeams']     || 16),
    MAX_PARTY_SIZE      : parseInt(HSR_PartyManager.Params['MaxPartySize'] || 4)
};

// ============================================================
// ACTOR -> VARIABLE UNLOCK MAP
// Add / remove entries to match your game's actors and variables
// ============================================================
HSR_PartyManager.ACTOR_VAR_MAP = {
     1: 56,
     3: 76,
     4: 73,
     5: 75,
     6: 79,
     7: 74,
     8: 78,
     9: 77,
    10: 88,
    11: 80,
    12: 87,
    13: 89,
    14: 90,
    15: 91,
    16: 92,
    17: 94
};

//=============================================================================
// PLUGIN COMMAND
//=============================================================================
var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === 'OpenPartyManager') {
        SceneManager.push(Scene_HSR_Party);
    }
};

//=============================================================================
// GAME_SYSTEM - Persistence for teams
//=============================================================================
var _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this.ensureHSRData();
};

Game_System.prototype.ensureHSRData = function() {
    if (!this._hsrTeams) {
        var maxTeams = HSR_PartyManager.Config.MAX_TEAMS;
        this._hsrTeams = [];
        for (var i = 0; i < maxTeams; i++) {
            this._hsrTeams.push([]);
        }
    }
    if (this._hsrCurrentTeamIdx === undefined || this._hsrCurrentTeamIdx === null) {
        this._hsrCurrentTeamIdx = 0;
    }
};

Object.defineProperty(Game_System.prototype, 'hsrTeams', {
    get: function() { this.ensureHSRData(); return this._hsrTeams; },
    set: function(v) { this._hsrTeams = v; }
});

Object.defineProperty(Game_System.prototype, 'hsrCurrentTeamIdx', {
    get: function() { this.ensureHSRData(); return this._hsrCurrentTeamIdx; },
    set: function(v) { this._hsrCurrentTeamIdx = v; }
});

//=============================================================================
// SCENE_HSR_PARTY - Main Scene
//=============================================================================
function Scene_HSR_Party() {
    this.initialize.apply(this, arguments);
}

Scene_HSR_Party.prototype = Object.create(Scene_MenuBase.prototype);
Scene_HSR_Party.prototype.constructor = Scene_HSR_Party;

Scene_HSR_Party.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
    this._swipeStartX   = null;
    this._swipeStartY   = null;
    this._isSwiping     = false;
    this._deploying     = false;
    this._sidebarOpen   = false;
    this._ui            = null;
    this._injectedStyle = null;
};

//-----------------------------------------------------------------------------
// Create
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    $gameSystem.ensureHSRData();

    // Seed current team from $gameParty on first visit
    var team = $gameSystem.hsrTeams[$gameSystem.hsrCurrentTeamIdx];
    if (team.length === 0 && $gameParty.members().length > 0) {
        $gameParty.members().forEach(function(m) { team.push(m.actorId()); });
    }

    this._createBackground();
    this._createHtml();
    this.refreshAll();
};

Scene_HSR_Party.prototype._createBackground = function() {
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
    this.addChild(this._backgroundSprite);

    var overlay = new Sprite();
    overlay.bitmap = new Bitmap(Graphics.width, Graphics.height);
    // Darker baseline to help the glassmorphism pop
    overlay.bitmap.fillAll('rgba(5, 8, 15, 0.75)');
    this.addChild(overlay);
};

//-----------------------------------------------------------------------------
// HTML Overlay UI
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._createHtml = function() {
    this._ui = document.createElement('div');
    this._ui.id = 'hsr-party-ui';

    var style = document.createElement('style');
    style.textContent = [
        /* =====================================================
         * MODERN RESPONSIVE LAYOUT & ANIMATIONS
         * Glassmorphism, CSS Grid/Flexbox, and safe areas.
         * ===================================================== */

        /* Root container */
        '#hsr-party-ui {',
        '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
        '  z-index: 9999;',
        '  font-family: "GameFont", Arial, sans-serif;',
        '  color: #fff;',
        '  display: flex; flex-direction: column;',
        '  box-sizing: border-box;',
        '  padding-top: env(safe-area-inset-top, 10px);',
        '  background: radial-gradient(circle at 50% 0%, rgba(20, 30, 60, 0.4) 0%, rgba(5, 8, 15, 0.6) 100%);',
        '  user-select: none; -webkit-user-select: none;',
        '  touch-action: pan-y;',
        '  overflow: hidden;',
        '}',

        /* Entrance Animations */
        '@keyframes fadeInSlideUp {',
        '  0% { opacity: 0; transform: translateY(15px); }',
        '  100% { opacity: 1; transform: translateY(0); }',
        '}',
        '@keyframes slideInLeft {',
        '  0% { transform: translateX(-100%); }',
        '  100% { transform: translateX(0); }',
        '}',

        /* ── HEADER ── */
        '#hsr-header {',
        '  display: flex; align-items: center; justify-content: space-between;',
        '  padding: 8px 16px;',
        '  background: rgba(255, 255, 255, 0.05);',
        '  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.1);',
        '  flex-shrink: 0; min-height: 54px;',
        '  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);',
        '}',
        '#hsr-team-nav { display: flex; align-items: center; gap: 12px; }',
        '.hsr-nav-btn {',
        '  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff;',
        '  font-size: 24px; width: 44px; height: 44px; border-radius: 12px;',
        '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
        '  -webkit-tap-highlight-color: transparent;',
        '  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);',
        '}',
        '.hsr-nav-btn:active { background: rgba(255, 255, 255, 0.3); transform: scale(0.92); }',
        '#hsr-team-label { font-size: 16px; font-weight: bold; min-width: 90px; text-align: center; letter-spacing: 1px;}',
        '#hsr-member-count { font-size: 13px; color: rgba(255, 255, 255, 0.7); background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 20px;}',

        /* ── BODY ── */
        '#hsr-body {',
        '  display: flex; flex: 1; overflow: hidden;',
        '  position: relative;',
        '}',

        /* ── LEFT SIDEBAR (Roster) ── */
        '#hsr-sidebar-overlay {',
        '  display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;',
        '  background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 10;',
        '  opacity: 0; transition: opacity 0.3s ease;',
        '}',
        '#hsr-sidebar-overlay.show { display: block; opacity: 1; }',

        '#hsr-sidebar {',
        '  width: 40%; max-width: 380px; flex-shrink: 0;',
        '  display: flex; flex-direction: column; overflow: hidden;',
        '  background: rgba(15, 20, 35, 0.6);',
        '  backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);',
        '  border-right: 1px solid rgba(255, 255, 255, 0.08);',
        '  z-index: 11;',
        '  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);',
        '}',
        '#hsr-roster-header {',
        '  display: flex; justify-content: space-between; align-items: center;',
        '  padding: 12px 16px; flex-shrink: 0;',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08);',
        '}',
        '#hsr-roster-label {',
        '  font-size: 12px; color: rgba(255, 255, 255, 0.6);',
        '  text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;',
        '}',
        '#hsr-close-sidebar {',
        '  display: none; background: none; border: none; color: #fff; font-size: 20px;',
        '  padding: 5px; cursor: pointer; line-height: 1;',
        '}',
        '#hsr-roster {',
        '  flex: 1; overflow-y: auto; overflow-x: hidden;',
        '  -webkit-overflow-scrolling: touch;',
        '  display: flex; flex-direction: column;',
        '  gap: 8px; padding: 12px;',
        '}',
        '#hsr-roster::-webkit-scrollbar { width: 4px; }',
        '#hsr-roster::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }',
        '#hsr-roster::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 4px; }',

        /* Character Card */
        '.hsr-actor-card {',
        '  display: flex; align-items: center; gap: 12px;',
        '  padding: 10px; border-radius: 12px;',
        '  background: rgba(255, 255, 255, 0.04);',
        '  border: 1px solid rgba(255, 255, 255, 0.08);',
        '  cursor: pointer; flex-shrink: 0; min-height: 56px;',
        '  -webkit-tap-highlight-color: transparent;',
        '  transition: all 0.2s ease;',
        '  position: relative; overflow: hidden;',
        '  animation: fadeInSlideUp 0.4s ease forwards;',
        '  opacity: 0;', /* Set to 0 initially for animation */
        '}',
        '.hsr-actor-card::before {',
        '  content:""; position:absolute; top:0; left:-100%; width:50%; height:100%;',
        '  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);',
        '  transition: all 0.4s ease;',
        '}',
        '.hsr-actor-card:hover::before { left: 100%; }',
        '.hsr-actor-card.in-team {',
        '  border-color: rgba(74, 222, 128, 0.4);',
        '  background: rgba(74, 222, 128, 0.1);',
        '}',
        '.hsr-actor-card:active { transform: scale(0.97); background: rgba(255,255,255,0.1); }',
        '.hsr-actor-face { width: 44px; height: 44px; image-rendering: pixelated; border-radius: 8px; flex-shrink: 0; background: rgba(0,0,0,0.3); }',
        '.hsr-actor-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }',
        '.hsr-actor-name { font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }',
        '.hsr-actor-sub { font-size: 11px; color: rgba(200, 220, 255, 0.8); white-space: nowrap; }',
        '.hsr-actor-badge {',
        '  position: absolute; right: 8px; top: 8px; font-size: 9px;',
        '  background: linear-gradient(135deg, #16a34a, #15803d); padding: 3px 6px; border-radius: 6px;',
        '  font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);',
        '}',

        /* ── RIGHT PANEL (Slots & Deploy) ── */
        '#hsr-right {',
        '  flex: 1; display: flex; flex-direction: column; overflow: hidden;',
        '}',
        '#hsr-right-content {',
        '  flex: 1; overflow-y: auto; padding: 16px;',
        '  display: flex; flex-direction: column; gap: 16px;',
        '}',

        /* Mobile Action Button (Open Roster) */
        '#hsr-btn-roster-toggle {',
        '  display: none; width: 100%; padding: 14px 0;',
        '  background: rgba(255, 255, 255, 0.1); border: 1px dashed rgba(255, 255, 255, 0.3);',
        '  color: #fff; font-size: 14px; font-weight: bold; border-radius: 12px;',
        '  cursor: pointer; text-transform: uppercase; letter-spacing: 1px;',
        '  transition: all 0.2s ease; flex-shrink: 0;',
        '}',
        '#hsr-btn-roster-toggle:active { background: rgba(255, 255, 255, 0.2); transform: scale(0.98); }',

        /* Active Party Label */
        '#hsr-slots-label {',
        '  font-size: 12px; color: rgba(255, 255, 255, 0.6);',
        '  text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;',
        '}',

        /* Slots Grid - Wrap nicely */
        '#hsr-slots-row {',
        '  display: flex; flex-wrap: wrap; gap: 10px;',
        '}',
        '.hsr-slot {',
        '  flex: 1 1 calc(50% - 10px); min-width: 120px; aspect-ratio: 0.75;',
        '  background: rgba(20, 25, 45, 0.6); border-radius: 16px;',
        '  border: 1px solid rgba(255, 255, 255, 0.08);',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
        '  cursor: pointer; position: relative; overflow: hidden; padding: 8px;',
        '  -webkit-tap-highlight-color: transparent;',
        '  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);',
        '  box-shadow: inset 0 0 20px rgba(0,0,0,0.2);',
        '  animation: fadeInSlideUp 0.4s ease forwards;',
        '}',
        '.hsr-slot:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }',
        '.hsr-slot.filled {',
        '  border-color: rgba(234, 179, 8, 0.4);', /* Gold accent */
        '  background: linear-gradient(180deg, rgba(30, 40, 70, 0.6) 0%, rgba(20, 25, 45, 0.8) 100%);',
        '}',
        '.hsr-slot.filled:active { transform: scale(0.95); border-color: rgba(239, 68, 68, 0.6); }',
        '.hsr-slot.empty { border: 1px dashed rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); }',
        '.hsr-slot.empty:active { background: rgba(255,255,255,0.05); transform: scale(0.95); }',
        
        '.hsr-slot-face { width: 70px; height: 70px; image-rendering: pixelated; border-radius: 10px; margin-bottom: 8px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); }',
        '.hsr-slot-name { font-size: 13px; font-weight: bold; text-align: center; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }',
        '.hsr-slot-level { font-size: 11px; color: #facc15; margin-top: 4px; font-weight: bold; }',
        '.hsr-slot-class { font-size: 10px; color: rgba(200, 220, 255, 0.8); text-align: center; margin-top: 2px;}',
        '.hsr-slot-remove {',
        '  position: absolute; top: 6px; right: 6px;',
        '  background: rgba(239, 68, 68, 0.8); border-radius: 50%;',
        '  width: 24px; height: 24px; font-size: 12px; font-weight: bold;',
        '  display: flex; align-items: center; justify-content: center;',
        '  box-shadow: 0 2px 5px rgba(0,0,0,0.3);',
        '}',
        '.hsr-slot-plus { font-size: 36px; color: rgba(255, 255, 255, 0.2); font-weight: 300; }',

        '.hsr-swipe-hint {',
        '  font-size: 11px; color: rgba(255, 255, 255, 0.4);',
        '  text-align: center; margin-top: 10px; flex-shrink: 0;',
        '}',

        /* ── BOTTOM BAR (Always Visible) ── */
        '#hsr-bottom-bar {',
        '  display: flex; flex-direction: column; gap: 10px;',
        '  padding: 16px;',
        '  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 16px);',
        '  background: rgba(10, 15, 25, 0.85);',
        '  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);',
        '  border-top: 1px solid rgba(255, 255, 255, 0.08);',
        '  flex-shrink: 0; box-shadow: 0 -5px 20px rgba(0,0,0,0.3);',
        '}',

        /* Deploy Button - HSR Style Gold/Amber */
        '#hsr-btn-deploy {',
        '  width: 100%; padding: 16px 0; font-size: 16px; font-weight: 800;',
        '  border: none; border-radius: 14px; cursor: pointer;',
        '  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);',
        '  color: #000; text-transform: uppercase; letter-spacing: 1.5px;',
        '  box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3);',
        '  -webkit-tap-highlight-color: transparent;',
        '  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);',
        '}',
        '#hsr-btn-deploy:active { transform: scale(0.97); filter: brightness(1.2); box-shadow: 0 2px 8px rgba(234, 179, 8, 0.4); }',

        /* Back Button */
        '#hsr-btn-back {',
        '  width: 100%; padding: 12px 0; font-size: 14px; font-weight: bold;',
        '  border: none; border-radius: 12px; cursor: pointer;',
        '  background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.8);',
        '  -webkit-tap-highlight-color: transparent;',
        '  transition: all 0.2s ease;',
        '}',
        '#hsr-btn-back:active { background: rgba(255, 255, 255, 0.15); transform: scale(0.97); }',

        /* ── TOAST ── */
        '#hsr-toast {',
        '  position: fixed; bottom: calc(env(safe-area-inset-bottom, 20px) + 120px);',
        '  left: 50%; transform: translateX(-50%) translateY(20px);',
        '  background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);',
        '  color: #fff; padding: 10px 24px;',
        '  border-radius: 30px; font-size: 13px; font-weight: bold; pointer-events: none;',
        '  opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); z-index: 10000;',
        '  border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5); white-space: nowrap;',
        '}',
        '#hsr-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }',

        /* ── MEDIA QUERIES FOR MOBILE ── */
        '@media (max-width: 768px) {',
        '  #hsr-sidebar {',
        '    position: absolute; top: 0; left: 0; height: 100%;',
        '    width: 85%; max-width: 320px;',
        '    transform: translateX(-105%);',
        '    box-shadow: 5px 0 25px rgba(0,0,0,0.5);',
        '  }',
        '  #hsr-sidebar.open { transform: translateX(0); }',
        '  #hsr-btn-roster-toggle { display: block; }',
        '  #hsr-close-sidebar { display: block; }',
        '  .hsr-slot { flex: 1 1 calc(50% - 10px); }',
        '}'
    ].join('\n');

    document.head.appendChild(style);
    this._injectedStyle = style;

    this._ui.innerHTML = [
        /* ── HEADER ── */
        '<div id="hsr-header">',
          '<div id="hsr-team-nav">',
            '<button class="hsr-nav-btn" id="hsr-prev">&#8249;</button>',
            '<div id="hsr-team-label">Team 1</div>',
            '<button class="hsr-nav-btn" id="hsr-next">&#8250;</button>',
          '</div>',
          '<div id="hsr-member-count">0 / 4</div>',
        '</div>',

        /* ── BODY ── */
        '<div id="hsr-body">',

          /* Mobile Overlay */
          '<div id="hsr-sidebar-overlay"></div>',

          /* Left Sidebar (Roster) */
          '<div id="hsr-sidebar">',
            '<div id="hsr-roster-header">',
               '<div id="hsr-roster-label">Characters</div>',
               '<button id="hsr-close-sidebar">&#10005;</button>',
            '</div>',
            '<div id="hsr-roster"></div>',
          '</div>',

          /* Right Panel */
          '<div id="hsr-right">',
            '<div id="hsr-right-content">',
               '<button id="hsr-btn-roster-toggle">+ Add Character</button>',
               '<div id="hsr-slots-label">Active Party</div>',
               '<div id="hsr-slots-row">',
                 '<div class="hsr-slot empty" data-slot="0"></div>',
                 '<div class="hsr-slot empty" data-slot="1"></div>',
                 '<div class="hsr-slot empty" data-slot="2"></div>',
                 '<div class="hsr-slot empty" data-slot="3"></div>',
               '</div>',
               '<div class="hsr-swipe-hint">&#8592; Swipe to switch teams &#8594;</div>',
            '</div>',

            /* Bottom Bar (Pinned) */
            '<div id="hsr-bottom-bar">',
              '<button id="hsr-btn-deploy">Deploy Party</button>',
              '<button id="hsr-btn-back">Cancel</button>',
            '</div>',
          '</div>',

        '</div>',

        '<div id="hsr-toast"></div>'
    ].join('');

    document.body.appendChild(this._ui);
    this._bindEvents();
};

//-----------------------------------------------------------------------------
// Event Binding
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._bindEvents = function() {
    var self = this;

    // Header Nav
    document.getElementById('hsr-prev').addEventListener('click', function() { self._changeTeam(-1); });
    document.getElementById('hsr-next').addEventListener('click', function() { self._changeTeam(1); });
    
    // Bottom Buttons
    document.getElementById('hsr-btn-deploy').addEventListener('click', function() { self._deployParty(); });
    document.getElementById('hsr-btn-back').addEventListener('click', function() { self._closeScene(false); });

    // Sidebar Toggles (Mobile)
    var btnRosterToggle = document.getElementById('hsr-btn-roster-toggle');
    var btnCloseSidebar = document.getElementById('hsr-close-sidebar');
    var sidebarOverlay  = document.getElementById('hsr-sidebar-overlay');

    btnRosterToggle.addEventListener('click', function() { self._toggleSidebar(true); });
    btnCloseSidebar.addEventListener('click', function() { self._toggleSidebar(false); });
    sidebarOverlay.addEventListener('click', function() { self._toggleSidebar(false); });

    // Swipe on slots row
    var slotsRow = document.getElementById('hsr-slots-row');
    slotsRow.addEventListener('touchstart', function(e) {
        self._swipeStartX = e.touches[0].clientX;
        self._swipeStartY = e.touches[0].clientY;
        self._isSwiping   = false;
    }, { passive: true });
    slotsRow.addEventListener('touchmove', function(e) {
        if (self._swipeStartX === null) return;
        var dx = e.touches[0].clientX - self._swipeStartX;
        var dy = e.touches[0].clientY - self._swipeStartY;
        // Only prevent default if horizontal swipe is stronger than vertical
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
            self._isSwiping = true;
            e.preventDefault();
        }
    }, { passive: false });
    slotsRow.addEventListener('touchend', function(e) {
        if (!self._isSwiping || self._swipeStartX === null) return;
        var dx = e.changedTouches[0].clientX - self._swipeStartX;
        if (Math.abs(dx) > 50) {
            self._changeTeam(dx < 0 ? 1 : -1);
        }
        self._swipeStartX = null;
        self._isSwiping   = false;
    });

    // Slots Click
    var slots = Array.prototype.slice.call(document.querySelectorAll('.hsr-slot'));
    slots.forEach(function(slot) {
        slot.addEventListener('click', function() {
            if (self._isSwiping) return;
            var idx = parseInt(slot.getAttribute('data-slot'), 10);
            self._onSlotTap(idx);
        });
    });
};

//-----------------------------------------------------------------------------
// Sidebar Logic
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._toggleSidebar = function(forceState) {
    var sidebar = document.getElementById('hsr-sidebar');
    var overlay = document.getElementById('hsr-sidebar-overlay');
    
    this._sidebarOpen = (typeof forceState !== 'undefined') ? forceState : !this._sidebarOpen;

    if (this._sidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
};

//-----------------------------------------------------------------------------
// Data Helpers
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._currentTeam = function() {
    return $gameSystem.hsrTeams[$gameSystem.hsrCurrentTeamIdx];
};

Scene_HSR_Party.prototype._isInTeam = function(actorId) {
    return this._currentTeam().indexOf(actorId) >= 0;
};

Scene_HSR_Party.prototype._getRoster = function() {
    var map  = HSR_PartyManager.ACTOR_VAR_MAP;
    var list = [];
    Object.keys(map).forEach(function(key) {
        var actorId = parseInt(key, 10);
        var varId   = map[key];
        if ($gameVariables.value(varId) > 0) {
            var actor = $gameActors.actor(actorId);
            if (actor) list.push(actor);
        }
    });
    return list;
};

//-----------------------------------------------------------------------------
// Team Change
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._changeTeam = function(dir) {
    var max = HSR_PartyManager.Config.MAX_TEAMS;
    $gameSystem.hsrCurrentTeamIdx =
        (($gameSystem.hsrCurrentTeamIdx + dir) % max + max) % max;
    AudioManager.playSe({ name: 'Cursor1', volume: 80, pitch: 100, pan: 0 });
    this.refreshAll();
};

//-----------------------------------------------------------------------------
// Slot Tap
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._onSlotTap = function(slotIdx) {
    var team = this._currentTeam();
    if (slotIdx < team.length) {
        team.splice(slotIdx, 1);
        AudioManager.playSe({ name: 'Cancel1', volume: 80, pitch: 100, pan: 0 });
        this._showToast('Removed from party');
    } else {
        // Automatically open the sidebar on mobile to hint the user
        if (window.innerWidth <= 768) {
             this._toggleSidebar(true);
        } else {
             this._showToast('Pick a character from the roster');
        }
    }
    this.refreshAll();
};

//-----------------------------------------------------------------------------
// Roster Tap
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._onRosterTap = function(actorId) {
    var team    = this._currentTeam();
    var maxSize = HSR_PartyManager.Config.MAX_PARTY_SIZE;

    if (this._isInTeam(actorId)) {
        var idx = team.indexOf(actorId);
        team.splice(idx, 1);
        AudioManager.playSe({ name: 'Cancel1', volume: 80, pitch: 100, pan: 0 });
        this._showToast('Removed from party');
    } else if (team.length >= maxSize) {
        AudioManager.playSe({ name: 'Buzzer1', volume: 80, pitch: 100, pan: 0 });
        this._showToast('Party is full! (Max ' + maxSize + ')');
        return;
    } else {
        team.push(actorId);
        AudioManager.playSe({ name: 'Decision1', volume: 80, pitch: 100, pan: 0 });
        this._showToast('Added to party!');
        
        // Auto-close sidebar on mobile after picking
        if (window.innerWidth <= 768) {
            this._toggleSidebar(false);
        }
    }
    this.refreshAll();
};

//-----------------------------------------------------------------------------
// Deploy
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._deployParty = function() {
    if (this._deploying) return;

    var team = this._currentTeam();
    if (team.length === 0) {
        AudioManager.playSe({ name: 'Buzzer1', volume: 80, pitch: 100, pan: 0 });
        this._showToast('Add at least one member first!');
        return;
    }
    this._deploying = true;
    this._applyTeam();
    AudioManager.playSe({ name: 'Decision1', volume: 80, pitch: 120, pan: 0 });
    this._showToast('Party deployed!', 1200);
    setTimeout(function() {
        SceneManager.pop();
    }, 1000);
};

Scene_HSR_Party.prototype._applyTeam = function() {
    $gameParty.members().slice().forEach(function(actor) {
        $gameParty.removeActor(actor.actorId());
    });
    this._currentTeam().forEach(function(id) {
        $gameParty.addActor(id);
    });
};

Scene_HSR_Party.prototype._closeScene = function(deploy) {
    if (deploy) this._applyTeam();
    SceneManager.pop();
};

//-----------------------------------------------------------------------------
// Toast
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._showToast = function(msg, duration) {
    var toast = document.getElementById('hsr-toast');
    if (!toast) return;
    clearTimeout(this._toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    this._toastTimer = setTimeout(function() {
        toast.classList.remove('show');
    }, duration || 1600);
};

//-----------------------------------------------------------------------------
// Refresh
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype.refreshAll = function() {
    this._refreshHeader();
    this._refreshSlots();
    this._refreshRoster();
};

Scene_HSR_Party.prototype._refreshHeader = function() {
    var idx     = $gameSystem.hsrCurrentTeamIdx;
    var count   = this._currentTeam().length;
    var max     = HSR_PartyManager.Config.MAX_TEAMS;
    var size    = HSR_PartyManager.Config.MAX_PARTY_SIZE;
    var labelEl = document.getElementById('hsr-team-label');
    var countEl = document.getElementById('hsr-member-count');
    if (labelEl) labelEl.textContent = 'Team ' + (idx + 1);
    if (countEl) countEl.textContent = count + ' / ' + size;
};

Scene_HSR_Party.prototype._refreshSlots = function() {
    var self  = this;
    var team  = this._currentTeam();
    var slots = Array.prototype.slice.call(document.querySelectorAll('.hsr-slot'));

    slots.forEach(function(slot, i) {
        var actorId = team[i];
        // Reset animation for visual pop
        slot.style.animation = 'none';
        slot.offsetHeight; // trigger reflow
        slot.style.animation = 'fadeInSlideUp 0.3s ease forwards';
        slot.style.animationDelay = (i * 0.05) + 's';

        if (actorId !== undefined) {
            var actor = $gameActors.actor(actorId);
            if (!actor) return;
            slot.className = 'hsr-slot filled';
            slot.innerHTML = [
                '<span class="hsr-slot-remove">\u2715</span>',
                '<canvas class="hsr-slot-face" width="70" height="70" data-actor="' + actorId + '"></canvas>',
                '<div class="hsr-slot-name">'  + actor.name() + '</div>',
                '<div class="hsr-slot-level">Lv.' + actor.level + '</div>',
                '<div class="hsr-slot-class">' + actor.currentClass().name + '</div>'
            ].join('');
            
            (function(slotIdx, act) {
                setTimeout(function() {
                    var canvas = document.querySelector('.hsr-slot[data-slot="' + slotIdx + '"] canvas');
                    if (canvas) self._drawFaceToCanvas(canvas, act, 70);
                }, 0);
            })(i, actor);
        } else {
            slot.className = 'hsr-slot empty';
            slot.innerHTML = '<span class="hsr-slot-plus">+</span>';
        }
    });
};

Scene_HSR_Party.prototype._refreshRoster = function() {
    var self      = this;
    var roster    = this._getRoster();
    var container = document.getElementById('hsr-roster');
    if (!container) return;
    container.innerHTML = '';

    roster.forEach(function(actor, i) {
        var inTeam = self._isInTeam(actor.actorId());
        var card   = document.createElement('div');
        card.className = 'hsr-actor-card' + (inTeam ? ' in-team' : '');
        card.style.animationDelay = (i * 0.04) + 's'; // Staggered loading animation

        card.innerHTML = [
            '<canvas class="hsr-actor-face" width="44" height="44" data-actor="' + actor.actorId() + '"></canvas>',
            '<div class="hsr-actor-info">',
              '<div class="hsr-actor-name">' + actor.name() + '</div>',
              '<div class="hsr-actor-sub">Lv.' + actor.level + ' ' + actor.currentClass().name + '</div>',
            '</div>',
            inTeam ? '<div class="hsr-actor-badge">IN PARTY</div>' : ''
        ].join('');

        (function(aId) {
            card.addEventListener('click', function() { self._onRosterTap(aId); });
        })(actor.actorId());

        container.appendChild(card);

        (function(act) {
            setTimeout(function() {
                var canvas = card.querySelector('canvas[data-actor="' + act.actorId() + '"]');
                if (canvas) self._drawFaceToCanvas(canvas, act, 44);
            }, 0);
        })(actor);
    });
};

//-----------------------------------------------------------------------------
// Face Drawing Helper
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype._drawFaceToCanvas = function(canvas, actor, displaySize) {
    var faceName  = actor.faceName();
    var faceIndex = actor.faceIndex();
    var bitmap    = ImageManager.loadFace(faceName);

    bitmap.addLoadListener(function() {
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.width  = displaySize + 'px';
        canvas.style.height = displaySize + 'px';
        var fw = 144, fh = 144;
        var sx = (faceIndex % 4)           * fw;
        var sy = Math.floor(faceIndex / 4) * fh;
        ctx.imageSmoothingEnabled = false;
        
        var source = bitmap._canvas ||
                     bitmap._image  ||
                     (bitmap._baseTexture && bitmap._baseTexture.source) ||
                     null;
        if (source) {
            ctx.drawImage(source, sx, sy, fw, fh, 0, 0, canvas.width, canvas.height);
        }
    });
};

//-----------------------------------------------------------------------------
// Terminate - clean up HTML and injected style
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype.terminate = function() {
    Scene_MenuBase.prototype.terminate.call(this);
    if (this._ui && this._ui.parentNode) {
        this._ui.parentNode.removeChild(this._ui);
    }
    if (this._injectedStyle && this._injectedStyle.parentNode) {
        this._injectedStyle.parentNode.removeChild(this._injectedStyle);
    }
    clearTimeout(this._toastTimer);
};

//-----------------------------------------------------------------------------
// Update - keyboard support (L/R = switch teams, Escape = back, Enter = deploy)
//-----------------------------------------------------------------------------
Scene_HSR_Party.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    if (this._deploying) return;
    if (Input.isTriggered('pagedown')) this._changeTeam(1);
    if (Input.isTriggered('pageup'))   this._changeTeam(-1);
    if (Input.isTriggered('cancel')) {
        if (this._sidebarOpen) this._toggleSidebar(false);
        else this._closeScene(false);
    }
    if (Input.isTriggered('ok'))       this._deployParty();
};