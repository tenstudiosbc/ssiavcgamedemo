/*:
 * @plugindesc v4.0 SSIA Vanguard Chronicles - Modern HSR Battle UI (Database Driven Ultimate, Android Optimized)
 * @author ChatGPT
 *
 * ============================================================================
 * SSIA: VANGUARD CHRONICLES - MODERN BATTLE UI
 * ============================================================================
 *
 * FEATURES:
 * ✔ Honkai Star Rail inspired UI layout
 * ✔ Fully database-driven Ultimate system (NO hardcoding)
 * ✔ Uses RPG Maker MV Skill Types per class
 * ✔ Android / Samsung M32 optimized scaling
 * ✔ Actor face + HP/MP/TP HUD
 * ✔ Attack / Skills / Ultimate only
 * ✔ Guard + Items removed
 * ✔ Clean futuristic UI styling
 *
 * ============================================================================
 *
 * ⚙️ ULTIMATE SYSTEM RULE:
 * Ultimate = LAST Skill Type assigned in actor/class database
 *
 * Example:
 * [Attack] [Skills] [Pyro Ultimate]
 *
 * ============================================================================
 */

(function(){

var pluginName = "HSR_BattleUI";
var p = PluginManager.parameters(pluginName);

//==============================================================
// UI SETTINGS
//==============================================================
var PANEL_W = Number(p["Panel Width"] || 280);
var PANEL_H = Number(p["Panel Height"] || 260);
var FACE = Number(p["Face Size"] || 96);
var BM = Number(p["Bottom Margin"] || 16);
var RM = Number(p["Right Margin"] || 16);

var ICON_ATTACK = Number(p["Attack Icon"] || 76);
var ICON_SKILL  = Number(p["Skill Icon"] || 79);
var ICON_ULT    = Number(p["Ultimate Icon"] || 64);

//==============================================================
// ANDROID FULLSCREEN FIX
//==============================================================
SceneManager._screenWidth  = window.innerWidth;
SceneManager._screenHeight = window.innerHeight;
SceneManager._boxWidth     = window.innerWidth;
SceneManager._boxHeight    = window.innerHeight;

//==============================================================
// REMOVE DEFAULT COMMANDS (NO ITEMS / GUARD)
//==============================================================
Window_ActorCommand.prototype.makeCommandList = function() {

    var actor = this._actor;
    if (!actor) return;

    this.addCommand("Attack", "attack", actor.canAttack());
    this.addCommand("Skills", "skill", true);
    this.addCommand("Ultimate", "ultimate", true);
};

Window_ActorCommand.prototype.windowWidth = function() {
    return PANEL_W;
};

Window_ActorCommand.prototype.windowHeight = function() {
    return PANEL_H;
};

Window_ActorCommand.prototype.numVisibleRows = function() {
    return 3;
};

Window_ActorCommand.prototype.itemHeight = function() {
    return 64;
};

//==============================================================
// CLEAN UI BACKGROUND (HSR STYLE GLASS PANEL)
//==============================================================
Window_ActorCommand.prototype._refreshBack = function(){};
Window_ActorCommand.prototype._refreshFrame = function(){};

//==============================================================
// DRAW MAIN UI
//==============================================================
Window_ActorCommand.prototype.drawAllItems = function() {

    this.contents.clear();

    var w = this.contentsWidth();
    var h = this.contentsHeight();

    // Dark glass panel
    this.contents.gradientFillRect(
        0, 0, w, h,
        "rgba(18,22,35,0.96)",
        "rgba(6,8,14,0.98)",
        true
    );

    // Top glow line (HSR style accent)
    this.contents.fillRect(0, 0, w, 2, "rgba(120,200,255,0.9)");

    for (var i = 0; i < this.maxItems(); i++) {
        this.drawItem(i);
    }

    this.drawActorHUD();
};

//==============================================================
// ACTOR HUD (FACE + BARS)
//==============================================================
Window_ActorCommand.prototype.drawActorHUD = function() {

    var actor = this._actor;
    if (!actor) return;

    var bmp = ImageManager.loadFace(actor.faceName());

    var pw = Window_Base._faceWidth;
    var ph = Window_Base._faceHeight;

    var sx = (actor.faceIndex() % 4) * pw;
    var sy = Math.floor(actor.faceIndex() / 4) * ph;

    this.contents.blt(bmp, sx, sy, pw, ph, 0, 0, FACE, FACE);

    var x = FACE + 12;

    this.contents.fontSize = 20;
    this.changeTextColor("#ffffff");
    this.drawText(actor.name(), x, 0, 220);

    // HP / MP / TP (HSR style bars)
    this.drawGauge(x, 28, 160, actor.hpRate(), "#4cff88", "#1a5a35");
    this.drawGauge(x, 50, 160, actor.mpRate(), "#4aa8ff", "#1d3f7a");
    this.drawGauge(x, 72, 160, actor.tpRate(), "#ffd84d", "#8a6a00");
};

//==============================================================
// COMMAND UI (MODERN BUTTON STYLE)
//==============================================================
Window_ActorCommand.prototype.drawItem = function(index) {

    var rect = this.itemRect(index);
    rect.y += 110;

    var symbol = this.commandSymbol(index);
    var enabled = this.isCommandEnabled(index);

    var icon = ICON_ATTACK;
    if (symbol === "skill") icon = ICON_SKILL;
    if (symbol === "ultimate") icon = ICON_ULT;

    var c1 = enabled ? "rgba(90,140,255,0.95)" : "rgba(60,60,60,0.8)";
    var c2 = enabled ? "rgba(30,45,120,0.95)" : "rgba(30,30,30,0.8)";

    this.contents.gradientFillRect(
        rect.x,
        rect.y,
        rect.width - 6,
        rect.height - 8,
        c1,
        c2,
        false
    );

    if (this.index() === index) {
        this.contents.fillRect(rect.x, rect.y, 4, rect.height - 8, "#7efcff");
    }

    this.drawIcon(icon, rect.x + 10, rect.y + 18);
    this.contents.fontSize = 22;
    this.changeTextColor("#ffffff");
    this.drawText(this.commandName(index), rect.x + 46, rect.y + 16, 220);
};

//==============================================================
// ULTIMATE SYSTEM (DATABASE DRIVEN - NO HARDCODE)
//==============================================================
Scene_Battle.prototype.commandUltimate = function() {

    var actor = BattleManager.actor();

    // ======================================================
    // DATABASE-DRIVEN LOGIC (MV STANDARD)
    // Ultimate = LAST skill type assigned in database
    // ======================================================

    var stypes = actor.addedSkillTypes();

    var ultimateType = stypes.length > 0 ? stypes[stypes.length - 1] : 1;

    this._skillWindow.setActor(actor);
    this._skillWindow.setStypeId(ultimateType);
    this._skillWindow.refresh();
    this._skillWindow.show();
    this._skillWindow.activate();
};

//==============================================================
// POSITIONING (ANDROID SAFE LAYOUT)
//==============================================================
Scene_Battle.prototype.startActorCommandSelection = function() {

    var actor = BattleManager.actor();

    this._statusWindow.select(actor.index());
    this._partyCommandWindow.close();

    this._actorCommandWindow.setup(actor);

    this._actorCommandWindow.x = Graphics.boxWidth - PANEL_W - RM;
    this._actorCommandWindow.y = Graphics.boxHeight - PANEL_H - BM;

    this._actorCommandWindow.open();
};

//==============================================================
// HOOK COMMAND HANDLER
//==============================================================
var _Scene_Battle_createActorCommandWindow =
Scene_Battle.prototype.createActorCommandWindow;

Scene_Battle.prototype.createActorCommandWindow = function() {

    _Scene_Battle_createActorCommandWindow.call(this);

    this._actorCommandWindow.setHandler(
        "ultimate",
        this.commandUltimate.bind(this)
    );
};

})();