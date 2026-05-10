/*:
 * @plugindesc Generates a persistent 5-digit User ID in Variable #2 and displays a modern UI label (ID | Version) in the bottom right.
 * @author Gemini
 * * @param Variable ID
 * @desc The ID of the game variable to store the User ID.
 * @default 2
 * * @param Game Version
 * @desc The version string to display.
 * @default v1.0.0
 * * @help
 * This plugin automatically generates a 5-digit numeric User ID if one 
 * does not already exist in the specified variable.
 * * It works with:
 * 1. New Games: Generates immediately.
 * 2. Old Saves: Generates as soon as the save is loaded.
 * * The display is a modern, semi-transparent overlay at the bottom right.
 */

(function() {
    const parameters = PluginManager.parameters('UserID_VersionDisplay');
    const varId = Number(parameters['Variable ID'] || 2);
    const gameVersion = String(parameters['Game Version'] || "v1.0.0");

    // --- Logic: ID Generation ---
    
    const checkAndGenerateID = function() {
        // Only generate if the variable is 0 or null
        if ($gameVariables.value(varId) === 0) {
            // Generate a random 5-digit number (10000 to 99999)
            const newId = Math.floor(10000 + Math.random() * 90000);
            $gameVariables.setValue(varId, newId);
        }
    };

    // Hook into Game_System to ensure generation on new games and loads
    const _Game_System_onAfterLoad = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() {
        _Game_System_onAfterLoad.call(this);
        checkAndGenerateID();
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        checkAndGenerateID();
    };

    // --- UI: Modern Overlay ---

    function Window_GameInfo() {
        this.initialize.apply(this, arguments);
    }

    Window_GameInfo.prototype = Object.create(Window_Base.prototype);
    Window_GameInfo.prototype.constructor = Window_GameInfo;

    Window_GameInfo.prototype.initialize = function() {
        const width = 240;
        const height = 60;
        const x = Graphics.boxWidth - width - 10;
        const y = Graphics.boxHeight - height - 10;
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.opacity = 0; // Transparent background for modern look
        this.contentsOpacity = 180; // Subtle transparency for text
        this.refresh();
    };

    Window_GameInfo.prototype.refresh = function() {
        this.contents.clear();
        const userId = $gameVariables.value(varId);
        const text = "UserID: " + userId + " | " + gameVersion;
        
        this.contents.fontSize = 18;
        // Background Pill Shape (Optional: for better readability)
        this.contents.fillRect(0, 10, this.contentsWidth(), 30, 'rgba(0, 0, 0, 0.4)');
        
        this.changeTextColor(this.normalColor());
        this.drawText(text, 0, 0, this.contentsWidth(), 'center');
    };

    Window_GameInfo.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        // Slowly update to catch variable changes if necessary
        if (Graphics.frameCount % 60 === 0) {
            this.refresh();
        }
    };

    // Add window to the map scene
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._gameInfoWindow = new Window_GameInfo();
        this.addChild(this._gameInfoWindow);
    };

})();