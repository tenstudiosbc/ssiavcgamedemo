/*:
 * @plugindesc v1.1.0 - Automatically saves the game on map transfer or menu exit with a UI notification.
 * @author Gemini
 * * @param Autosave Slot
 * @desc The save slot ID used for autosaving (Default is 1).
 * @default 1
 * * @param Display Duration
 * @desc How many frames the message stays visible (60 frames = 1 second).
 * @default 600
 * * @help
 * This plugin triggers an autosave in two specific scenarios:
 * 1. When the player transfers to a new map.
 * 2. When the player closes the main menu to return to the map.
 * * Restrictions:
 * - Does not save on the Title Screen.
 * - Does not save if the game is currently in a "Save Disabled" state via eventing.
 * - Only saves if a valid game map is active.
 */

(function() {
    const params = PluginManager.parameters('AutosaveManager');
    const saveSlot = Number(params['Autosave Slot'] || 1);
    const displayDuration = Number(params['Display Duration'] || 600);

    // --- UI Component: Autosave Label ---
    
    function Window_Autosave() {
        this.initialize.apply(this, arguments);
    }

    Window_Autosave.prototype = Object.create(Window_Base.prototype);
    Window_Autosave.prototype.constructor = Window_Autosave;

    Window_Autosave.prototype.initialize = function() {
        const width = 400;
        const height = this.fittingHeight(1);
        const x = (Graphics.boxWidth - width) / 2;
        const y = 20;
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.opacity = 0; 
        this.contentsOpacity = 0;
        this._showCount = 0;
        this._text = "";
        this.refresh();
    };

    Window_Autosave.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._showCount > 0) {
            this.contentsOpacity += 16;
            this._showCount--;
        } else {
            this.contentsOpacity -= 16;
        }
    };

    Window_Autosave.prototype.showMessage = function(text) {
        this._text = text;
        this._showCount = displayDuration;
        this.refresh();
    };

    Window_Autosave.prototype.refresh = function() {
        this.contents.clear();
        this.drawText(this._text, 0, 0, this.contentsWidth(), 'center');
    };

    // --- Autosave Logic ---

    const performAutosave = function() {
        // Restriction Check: 
        // 1. Must be on a Map scene
        // 2. Game system must allow saving
        // 3. Must NOT be on the title screen ($gameMap must exist)
        if (SceneManager._scene instanceof Scene_Map && $gameSystem.isSaveEnabled() && $gameMap.mapId() > 0) {
            
            const scene = SceneManager._scene;
            if (scene._autosaveWindow) {
                scene._autosaveWindow.showMessage("Autosave in progress...");
            }

            $gameSystem.onBeforeSave();
            if (DataManager.saveGame(saveSlot)) {
                StorageManager.cleanBackup(saveSlot);
                
                // Switch message after a short "processing" delay
                setTimeout(() => {
                    // Check if we are still on the map scene before updating the text
                    if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._autosaveWindow) {
                        SceneManager._scene._autosaveWindow.showMessage("Saved in Slot " + saveSlot);
                    }
                }, 800);
            }
        }
    };

    // --- Scene Injections ---

    // Create window on Map
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._autosaveWindow = new Window_Autosave();
        this.addChild(this._autosaveWindow);
    };

    // Trigger on Map Transfer
    const _Game_Player_reserveTransfer = Game_Player.prototype.reserveTransfer;
    Game_Player.prototype.reserveTransfer = function(mapId, x, y, d, fadeType) {
        _Game_Player_reserveTransfer.call(this, mapId, x, y, d, fadeType);
        // Only trigger if we are actually moving to a valid map
        if (mapId > 0) {
            performAutosave();
        }
    };

    // Trigger on Menu Exit (specifically returning to Map)
    const _Scene_Menu_terminate = Scene_Menu.prototype.terminate;
    Scene_Menu.prototype.terminate = function() {
        _Scene_Menu_terminate.call(this);
        // Check if the next scene is definitely the Map
        if (SceneManager.isNextScene(Scene_Map)) {
            // Delay ensures the Map scene is fully ready to display the notification
            setTimeout(performAutosave, 200);
        }
    };

})();