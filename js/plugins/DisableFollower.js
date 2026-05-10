//=============================================================================
// FollowerControl.js
//=============================================================================

/*:
 * @plugindesc Controls whether party followers are visible by default.
 * @author Gemini
 *
 * @param Default Followers
 * @type boolean
 * @on Show
 * @off Hide
 * @desc Should followers be visible by default when starting a game?
 * @default false
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin allows you to set the default state of party followers (the 
 * characters trailing behind the leader).
 *
 * By default in RPG Maker MV, followers are ON. This plugin allows you to 
 * start with them OFF via the Plugin Manager parameters.
 *
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * You can still change this setting during gameplay using the standard 
 * event command: 
 * Tab 2 -> Character -> Change Player Followers
 *
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * Free for use in both non-commercial and commercial projects.
 */

(function() {
    'use strict';

    var parameters = PluginManager.parameters('FollowerControl');
    var defaultFollowers = String(parameters['Default Followers'] || 'false') === 'true';

    // Extend the setup function for Game_System
    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        // We store the setting in Game_System so it persists in save files
        this._showFollowers = defaultFollowers;
    };

    // Override the check for whether followers are visible
    // This ensures the initial state respects our parameter
    var _Game_Followers_initialize = Game_Followers.prototype.initialize;
    Game_Followers.prototype.initialize = function() {
        _Game_Followers_initialize.call(this);
        this._visible = defaultFollowers;
    };

    // Hook into DataManager to ensure new games start with the correct state
    var _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _DataManager_setupNewGame.call(this);
        // Fix: Use the correct internal variable for MV
        $gamePlayer.followers()._visible = defaultFollowers;
        $gamePlayer.refresh();
    };

})();