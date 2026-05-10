/*:
 * @plugindesc A modern Save/Load UI for RPG Maker MV with mobile-optimized touch controls.
 * @author Gemini (Fixed)
 *
 * @help
 * This plugin replaces the standard Save and Load screens with a custom UI.
 *
 * Features:
 * - Left/Right arrows to cycle through save slots.
 * - Displays Map Name, Player Name, and Party Faces.
 * - "Confirm" button at the bottom to execute the action.
 * - Optimized for Mobile Touch (Large hit-boxes).
 * - Compatible with existing save files.
 */

(function() {

    // =========================================================================
    // FIX 1: Proper Window_Command subclass for the Confirm Button.
    // Using Window_Command directly and calling addCommand() manually breaks
    // because refresh() internally calls makeCommandList(), wiping your list.
    // The correct pattern in MV is always to subclass and override makeCommandList.
    // =========================================================================

    function Window_ConfirmButton() {
        this.initialize.apply(this, arguments);
    }

    Window_ConfirmButton.prototype = Object.create(Window_Command.prototype);
    Window_ConfirmButton.prototype.constructor = Window_ConfirmButton;

    Window_ConfirmButton.prototype.initialize = function(x, y, label) {
        this._label = label || "Confirm";
        this._confirmEnabled = true; // FIX: store enabled state HERE, before super init
        Window_Command.prototype.initialize.call(this, x, y);
    };

    // windowWidth() is the correct MV way to control command window size.
    Window_ConfirmButton.prototype.windowWidth = function() {
        return 240;
    };

    // addCommand's 3rd argument is the enabled flag — this is the ONLY correct MV
    // way to enable/disable a command. setCommandEnabled does not exist in MV.
    Window_ConfirmButton.prototype.makeCommandList = function() {
        this.addCommand(this._label, 'confirm', this._confirmEnabled);
    };

    // Our own setter — sets the flag and rebuilds the list via refresh().
    Window_ConfirmButton.prototype.setConfirmEnabled = function(enabled) {
        if (this._confirmEnabled === enabled) return;
        this._confirmEnabled = enabled;
        this.refresh();
        this.select(0);
        this.activate();
    };


    // =========================================================================
    // Scene_File Override
    // =========================================================================

    Scene_File.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        DataManager.loadAllSavefileImages();
        this.createWindowLayer();
        this.createStatusWindow();
        this.createButtons();
    };

    Scene_File.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
        this._statusWindow.refresh();
    };

    Scene_File.prototype.savefileId = function() {
        return this._savefileId || 1;
    };

    Scene_File.prototype.createStatusWindow = function() {
        const wx = Graphics.boxWidth * 0.15;
        const wy = Graphics.boxHeight * 0.15;
        const ww = Graphics.boxWidth * 0.7;
        const wh = Graphics.boxHeight * 0.6;
        this._statusWindow = new Window_ModernSaveStatus(wx, wy, ww, wh);
        this._statusWindow.setMode(this.mode());

        this._savefileId = DataManager.latestSavefileId() || 1;

        this._statusWindow.setFileId(this._savefileId);
        this.addWindow(this._statusWindow);
    };

    Scene_File.prototype.createButtons = function() {
        // Left Arrow
        this._leftArrow = new Sprite_Button();
        this._leftArrow.bitmap = this.createArrowBitmap('left');
        this._leftArrow.x = Graphics.boxWidth * 0.02;
        this._leftArrow.y = Graphics.boxHeight / 2 - 40;
        this._leftArrow.setClickHandler(this.onPrevId.bind(this));
        this.addChild(this._leftArrow);

        // Right Arrow
        this._rightArrow = new Sprite_Button();
        this._rightArrow.bitmap = this.createArrowBitmap('right');
        this._rightArrow.x = Graphics.boxWidth * 0.98 - 80;
        this._rightArrow.y = Graphics.boxHeight / 2 - 40;
        this._rightArrow.setClickHandler(this.onNextId.bind(this));
        this.addChild(this._rightArrow);

        // Confirm Button — uses our proper subclass now
        const label = this.mode() === 'save' ? "Confirm Save" : "Confirm Load";
        const bx = (Graphics.boxWidth - 240) / 2;
        const by = Graphics.boxHeight * 0.82;
        this._confirmButton = new Window_ConfirmButton(bx, by, label);
        this._confirmButton.setHandler('confirm', this.onSavefileOk.bind(this));
        this.addWindow(this._confirmButton);

        this.updateConfirmButtonStatus();
    };

    Scene_File.prototype.createArrowBitmap = function(direction) {
        const bitmap = new Bitmap(80, 80);
        bitmap.fontSize = 60;
        const text = direction === 'left' ? '◀' : '▶';
        bitmap.drawText(text, 0, 0, 80, 80, 'center');
        return bitmap;
    };

    Scene_File.prototype.onPrevId = function() {
        this._savefileId--;
        if (this._savefileId < 1) this._savefileId = DataManager.maxSavefiles();
        this._statusWindow.setFileId(this._savefileId);
        this.updateConfirmButtonStatus();
        SoundManager.playCursor();
    };

    Scene_File.prototype.onNextId = function() {
        this._savefileId++;
        if (this._savefileId > DataManager.maxSavefiles()) this._savefileId = 1;
        this._statusWindow.setFileId(this._savefileId);
        this.updateConfirmButtonStatus();
        SoundManager.playCursor();
    };

    Scene_File.prototype.updateConfirmButtonStatus = function() {
        if (!this._confirmButton) return;
        const info = DataManager.loadSavefileInfo(this._savefileId);

        // setCommandEnabled does NOT exist in RPG Maker MV.
        // Use our own setConfirmEnabled which stores the flag and calls refresh().
        const canConfirm = !(this.mode() === 'load' && !info);
        this._confirmButton.setConfirmEnabled(canConfirm);
    };


    // =========================================================================
    // Window_ModernSaveStatus
    // =========================================================================

    function Window_ModernSaveStatus() {
        this.initialize.apply(this, arguments);
    }

    Window_ModernSaveStatus.prototype = Object.create(Window_Base.prototype);
    Window_ModernSaveStatus.prototype.constructor = Window_ModernSaveStatus;

    Window_ModernSaveStatus.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._fileId = 1;
        this._mode = 'save';
        this.refresh();
    };

    Window_ModernSaveStatus.prototype.setFileId = function(id) {
        if (this._fileId !== id) {
            this._fileId = id;
            this.refresh();
        }
    };

    Window_ModernSaveStatus.prototype.setMode = function(mode) {
        this._mode = mode;
    };

    Window_ModernSaveStatus.prototype.refresh = function() {
        this.contents.clear();
        const info = DataManager.loadSavefileInfo(this._fileId);

        this.changeTextColor(this.systemColor());
        this.drawText("File Slot " + this._fileId, 0, 0, this.contentsWidth(), 'center');
        this.resetTextColor();

        if (info) {
            this.drawSaveInfo(info);
        } else {
            this.drawEmptySlot();
        }
    };

    Window_ModernSaveStatus.prototype.drawSaveInfo = function(info) {
        const dy = 60;

        // Map Name
        this.changeTextColor(this.systemColor());
        this.drawText("Location:", 20, dy, 120);
        this.resetTextColor();
        this.drawText(info.title || "Unknown Area", 150, dy, this.contentsWidth() - 170);

        // Leader Name — info.characters is an array of [charName, charIndex]
        const characters = info.characters || [];
        const mainCharName = (characters[0] && characters[0][0]) ? characters[0][0] : "Hero";

        this.changeTextColor(this.systemColor());
        this.drawText("Leader:", 20, dy + 40, 120);
        this.resetTextColor();
        this.drawText(mainCharName, 150, dy + 40, 200);

        // Playtime (right-aligned)
        this.drawText(info.playtime, 0, dy + 40, this.contentsWidth() - 20, 'right');

        // Party walk sprites
        this.drawPartyCharacters(info, 20, dy + 100);
    };

    Window_ModernSaveStatus.prototype.drawPartyCharacters = function(info, x, y) {
        if (info.characters) {
            for (let i = 0; i < info.characters.length; i++) {
                const data = info.characters[i];
                // data[0] = character sprite sheet name, data[1] = sprite index
                this.drawCharacter(data[0], data[1], x + 48 + i * 100, y + 80);
            }
        }
    };

    Window_ModernSaveStatus.prototype.drawEmptySlot = function() {
        this.contents.drawText(
            "- Empty Slot -",
            0,
            this.contentsHeight() / 2 - 20,
            this.contentsWidth(),
            40,
            'center'
        );
    };

})();