/*:
 * @plugindesc Custom Scene_Error to display "Internal Server Error" style messages in-game.
 * @author Gemini
 * * @help
 * This plugin creates a custom Error Scene that mimics a web-based 500 error.
 * * How to call from another plugin:
 * SceneManager.push(Scene_Error);
 * SceneManager.prepareNextScene("Error Code 0x552", "Memory leakage in core buffer.");
 * * Or simply:
 * SceneManager.catchCustomError("Critical Logic Failure", "The game state reached an unreachable branch.");
 */

(function() {

    // Helper for easy calling
    SceneManager.catchCustomError = function(title, message) {
        this.push(Scene_Error);
        this.prepareNextScene(title, message);
    };

    //-----------------------------------------------------------------------------
    // Scene_Error
    //
    // The scene class for displaying a mock "Internal Server Error".

    function Scene_Error() {
        this.initialize.apply(this, arguments);
    }

    Scene_Error.prototype = Object.create(Scene_Base.prototype);
    Scene_Error.prototype.constructor = Scene_Error;

    Scene_Error.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._errorTitle = "INTERNAL SERVER ERROR";
        this._errorMessage = "An unexpected error occurred while processing the game logic.";
        this._requestId = (Math.random().toString(36).substring(2, 10) + "-" + Date.now()).toUpperCase();
    };

    Scene_Error.prototype.prepare = function(title, message) {
        if (title) this._errorTitle = title.toUpperCase();
        if (message) this._errorMessage = message;
    };

    Scene_Error.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createWindowLayer();
        this.createErrorText();
        this.createCommandWindow();
    };

    Scene_Error.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        // Deep corporate dark blue/black background
        this._backgroundSprite.bitmap.fillAll('#0a0a0c');
        this.addChild(this._backgroundSprite);
    };

    Scene_Error.prototype.createErrorText = function() {
        const width = Graphics.width;
        const height = Graphics.height;

        this._textContainer = new Sprite(new Bitmap(width, height));
        this.addChild(this._textContainer);

        const bitmap = this._textContainer.bitmap;
        bitmap.outlineWidth = 0;

        // Draw HTTP Status Code style
        bitmap.textColor = '#e74c3c'; // Red
        bitmap.fontSize = 72;
        bitmap.drawText("500", 0, 80, width, 80, 'center');

        // Draw Title
        bitmap.textColor = '#ffffff';
        bitmap.fontSize = 32;
        bitmap.drawText(this._errorTitle, 0, 160, width, 50, 'center');

        // Draw Divider
        bitmap.fillRect(width / 4, 220, width / 2, 2, '#333333');

        // Draw Message
        bitmap.fontSize = 18;
        bitmap.textColor = '#aaaaaa';
        bitmap.drawText(this._errorMessage, 0, 240, width, 30, 'center');

        // Technical Details (Server Simulation)
        bitmap.fontSize = 14;
        bitmap.textColor = '#555555';
        const detailsY = height - 120;
        bitmap.drawText("REQUEST_ID: " + this._requestId, 0, detailsY, width, 20, 'center');
        bitmap.drawText("REMOTE_ADDR: 127.0.0.1", 0, detailsY + 20, width, 20, 'center');
        bitmap.drawText("STATUS: TERMINATED", 0, detailsY + 40, width, 20, 'center');
    };

    Scene_Error.prototype.createCommandWindow = function() {
        this._commandWindow = new Window_ErrorCommand();
        this._commandWindow.setHandler('resume', this.commandResume.bind(this));
        this._commandWindow.setHandler('retry', this.commandRetry.bind(this));
        this._commandWindow.setHandler('quit', this.commandQuit.bind(this));
        this.addWindow(this._commandWindow);
    };

    Scene_Error.prototype.commandResume = function() {
        // Pop this scene and go back to the previous one (usually Scene_Map)
        this.popScene();
    };

    Scene_Error.prototype.commandRetry = function() {
        // Attempt to return to the Title Screen
        SceneManager.goto(Scene_Title);
    };

    Scene_Error.prototype.commandQuit = function() {
        // Close game
        SceneManager.terminate();
        window.close();
    };

    //-----------------------------------------------------------------------------
    // Window_ErrorCommand
    //
    // Invisible window for the error options to keep the web-error look.

    function Window_ErrorCommand() {
        this.initialize.apply(this, arguments);
    }

    Window_ErrorCommand.prototype = Object.create(Window_Command.prototype);
    Window_ErrorCommand.prototype.constructor = Window_ErrorCommand;

    Window_ErrorCommand.prototype.initialize = function() {
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.x = (Graphics.width - this.windowWidth()) / 2;
        this.y = 300; // Adjusted slightly higher to fit 3 buttons
        this.opacity = 0; // Make it look like web buttons
    };

    Window_ErrorCommand.prototype.windowWidth = function() {
        return 320;
    };

    Window_ErrorCommand.prototype.makeCommandList = function() {
        // Only allow "Return to Game" if we actually have a map to return to
        const canResume = !!$gameMap && !!$gamePlayer && $gameMap.mapId() > 0;
        this.addCommand("RETURN TO GAME", 'resume', canResume);
        this.addCommand("RETRY CONNECTION (TITLE)", 'retry');
        this.addCommand("TERMINATE SESSION", 'quit');
    };

    Window_ErrorCommand.prototype.drawItem = function(index) {
        const rect = this.itemRectForText(index);
        const align = this.itemTextAlign();
        const enabled = this.isCommandEnabled(index);
        
        this.resetTextColor();
        this.changePaintOpacity(enabled);
        
        // Draw modern looking button backgrounds
        const bgColor = enabled ? '#222222' : '#111111';
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, bgColor);
        
        if (!enabled) this.changeTextColor('#555555');
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    };

    window.Scene_Error = Scene_Error;

})();