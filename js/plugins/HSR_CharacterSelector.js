/*:
 * @plugindesc Modern Character Selection Menu for RPG Maker MV (Android/Mobile Card UI)
 * @author Gemini
 * * @param SelectionMadeVariable
 * @text Selection Tracker Variable
 * @type variable
 * @desc The ID of a variable to track if selection is done (Prevents re-triggering).
 * @default 100
 * * @param ActorOption1
 * @text Actor Option 1
 * @type actor
 * @default 1
 * * @param ActorOption2
 * @text Actor Option 2
 * @type actor
 * @default 3
 * * @param ActorOption3
 * @text Actor Option 3
 * @type actor
 * @default 4
 * * @param ActorOption4
 * @text Actor Option 4
 * @type actor
 * @default 5
 * * @param ActorOption5
 * @text Actor Option 5
 * @type actor
 * @default 6
 * * @help
 * This plugin creates a high-quality selection screen when starting a game.
 * Designed specifically for Android touch interaction.
 * * Features:
 * - Card UI with Actor Faces.
 * - Bottom "Claim" button.
 * - Triggers on New Game and Load Game (if variable is 0).
 * - Updates specific variables based on ACTOR_VAR_MAP.
 */

var HSR_PartyManager = HSR_PartyManager || {};
HSR_PartyManager.ACTOR_VAR_MAP = {
    1: 56, 3: 76, 4: 73, 5: 75, 6: 79, 7: 74, 8: 78, 9: 77,
    10: 88, 11: 80, 12: 87, 13: 89, 14: 90, 15: 91, 16: 92, 17: 94
};

(function() {
    const params = PluginManager.parameters('HSR_CharacterSelector');
    const TRACKER_VAR = Number(params['SelectionMadeVariable'] || 100);
    const OPTIONS = [
        Number(params['ActorOption1'] || 0),
        Number(params['ActorOption2'] || 0),
        Number(params['ActorOption3'] || 0),
        Number(params['ActorOption4'] || 0),
        Number(params['ActorOption5'] || 0)
    ].filter(id => id > 0); 

    // --- Scene Logic ---

    function Scene_CharSelect() {
        this.initialize.apply(this, arguments);
    }

    Scene_CharSelect.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_CharSelect.prototype.constructor = Scene_CharSelect;

    Scene_CharSelect.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createBackground();
        this.createWindowLayer();
        this.createCardWindow();
        this.createConfirmWindow();
        this.createTitleText();
    };

    Scene_CharSelect.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        this.addChild(this._backgroundSprite);
        
        this._overlay = new ScreenSprite();
        this._overlay.setColor(0, 0, 0);
        this._overlay.opacity = 200;
        this.addChild(this._overlay);
    };

    Scene_CharSelect.prototype.createTitleText = function() {
        this._titleWindow = new Window_Help(1);
        this._titleWindow.setText("Select Free 5-Star Character You Want to Claim");
        this._titleWindow.y = 20;
        this._titleWindow.opacity = 0;
        this.addWindow(this._titleWindow);
    };

    Scene_CharSelect.prototype.createCardWindow = function() {
        const ww = Graphics.boxWidth * 0.94;
        const wh = 320;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2 - 40;
        
        this._cardWindow = new Window_HeroCards(wx, wy, ww, wh);
        this._cardWindow.setHandler('ok', this.onCardOk.bind(this));
        this.addWindow(this._cardWindow);
        this._cardWindow.activate();
    };

    Scene_CharSelect.prototype.createConfirmWindow = function() {
        const ww = 240;
        const wh = 70;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._cardWindow.y + this._cardWindow.height + 20;
        
        this._confirmButton = new Window_ClaimButton(wx, wy, ww, wh);
        this._confirmButton.setHandler('ok', this.onSelectionConfirmed.bind(this));
        this._confirmButton.setHandler('cancel', () => this._cardWindow.activate());
        this.addWindow(this._confirmButton);
        this._cardWindow.setConfirmWindow(this._confirmButton);
    };

    Scene_CharSelect.prototype.onCardOk = function() {
        this._confirmButton.activate();
        this._confirmButton.select(0);
    };

    Scene_CharSelect.prototype.onSelectionConfirmed = function() {
        const actorId = this._cardWindow.currentActorId();
        
        if (actorId) {
            // 1. Add the actor to the current party
            $gameParty.addActor(actorId);

            // 2. Lookup the Variable ID from the map and set it to 1
            const varId = HSR_PartyManager.ACTOR_VAR_MAP[actorId];
            if (varId) {
                $gameVariables.setValue(varId, 1);
            }
        }

        // 3. Set the global tracker so this menu never triggers again
        $gameVariables.setValue(TRACKER_VAR, 1);
        
        SoundManager.playOk();
        SceneManager.goto(Scene_Map);
    };

    // --- Card Window ---

    function Window_HeroCards() {
        this.initialize.apply(this, arguments);
    }

    Window_HeroCards.prototype = Object.create(Window_Selectable.prototype);
    Window_HeroCards.prototype.constructor = Window_HeroCards;

    Window_HeroCards.prototype.initialize = function(x, y, width, height) {
        this._data = OPTIONS; 
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this.opacity = 0;
        this.refresh();
        this.select(0);
    };

    Window_HeroCards.prototype.setConfirmWindow = function(win) { this._confirmWindow = win; };
    
    Window_HeroCards.prototype.maxItems = function() { 
        return this._data ? this._data.length : 0; 
    };

    Window_HeroCards.prototype.maxCols = function() { return 5; };
    Window_HeroCards.prototype.spacing = function() { return 10; };
    Window_HeroCards.prototype.itemHeight = function() { return 280; };
    Window_HeroCards.prototype.currentActorId = function() { return this._data[this.index()]; };

    Window_HeroCards.prototype.drawItem = function(index) {
        const actorId = this._data[index];
        const actor = $dataActors[actorId];
        const rect = this.itemRect(index);
        
        if (actor) {
            // Semi-transparent card background
            this.contents.fillRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, 'rgba(255, 255, 255, 0.1)');
            
            // Draw Face
            const faceName = actor.faceName;
            const faceIndex = actor.faceIndex;
            if (faceName) {
                this.drawFace(faceName, faceIndex, rect.x + (rect.width - 144) / 2, rect.y + 20);
            }
            
            this.contents.fontSize = 18;
            this.resetTextColor();
            this.drawText(actor.name, rect.x, rect.y + 180, rect.width, 'center');
        }
    };

    Window_HeroCards.prototype.select = function(index) {
        Window_Selectable.prototype.select.call(this, index);
        if (this._confirmWindow) this._confirmWindow.refresh();
    };

    // --- Claim Button Window ---

    function Window_ClaimButton() {
        this.initialize.apply(this, arguments);
    }

    Window_ClaimButton.prototype = Object.create(Window_Command.prototype);
    Window_ClaimButton.prototype.constructor = Window_ClaimButton;

    Window_ClaimButton.prototype.makeCommandList = function() {
        this.addCommand("CLAIM", 'ok');
    };

    Window_ClaimButton.prototype.windowWidth = function() { return 240; };
    Window_ClaimButton.prototype.numVisibleRows = function() { return 1; };
    Window_ClaimButton.prototype.itemTextAlign = function() { return 'center'; };

    // --- Auto Trigger Logic ---

    const _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function() {
        _Scene_Title_commandNewGame.call(this);
        SceneManager.goto(Scene_CharSelect);
    };

    const _Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function() {
        _Scene_Load_onLoadSuccess.call(this);
        // Triggers if the player hasn't selected a character yet
        if ($gameVariables && $gameVariables.value(TRACKER_VAR) === 0) {
            SceneManager.goto(Scene_CharSelect);
        }
    };

})();