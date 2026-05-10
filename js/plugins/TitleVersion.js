/*:
 * @plugindesc Adds a customizable version label to the Title Screen.
 * @author Gemini
 * * @param Version Text
 * @desc The text to display for the version.
 * @default v1.0.0
 * * @param Font Size
 * @type number
 * @desc Size of the version text font.
 * @default 18
 * * @param Font Color
 * @desc Hex color code for the text.
 * @default #ffffff
 * * @param Shadow Color
 * @desc Color for the text shadow/outline.
 * @default rgba(0, 0, 0, 0.8)
 * * @param Margin Right
 * @type number
 * @desc Padding from the right edge (Mobile safe area).
 * @default 20
 * * @param Margin Bottom
 * @type number
 * @desc Padding from the bottom edge (Mobile safe area).
 * @default 20
 * * @help
 * This plugin adds a simple version label to the bottom-right of the 
 * Scene_Title. It is designed to respect "safe areas" by providing 
 * margin parameters to ensure the text isn't obscured by mobile UI
 * or physical screen rounding.
 */

(function() {
    'use strict';

    const parameters = PluginManager.parameters('TitleVersion');
    const versionText = String(parameters['Version Text'] || 'v1.0.0');
    const fontSize = Number(parameters['Font Size'] || 18);
    const fontColor = String(parameters['Font Color'] || '#ffffff');
    const shadowColor = String(parameters['Shadow Color'] || 'rgba(0, 0, 0, 0.8)');
    const marginRight = Number(parameters['Margin Right'] || 20);
    const marginBottom = Number(parameters['Margin Bottom'] || 20);

    const _Scene_Title_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function() {
        _Scene_Title_create.call(this);
        this.createVersionLabel();
    };

    Scene_Title.prototype.createVersionLabel = function() {
        // Create a sprite for the version text
        this._versionSprite = new Sprite();
        this._versionSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        
        // Configure font
        this._versionSprite.bitmap.fontSize = fontSize;
        this._versionSprite.bitmap.textColor = fontColor;
        this._versionSprite.bitmap.outlineColor = shadowColor;
        this._versionSprite.bitmap.outlineWidth = 4;

        // Calculate text width to align right
        const textWidth = this._versionSprite.bitmap.measureTextWidth(versionText);
        
        // Position: Align to right and bottom with margins
        const x = Graphics.width - textWidth - marginRight;
        const y = Graphics.height - fontSize - marginBottom;

        // Draw the text
        this._versionSprite.bitmap.drawText(versionText, x, y, textWidth + 10, fontSize + 4, 'right');
        
        // Add to the foreground of the title scene
        this.addChild(this._versionSprite);
    };

    // Ensure it updates if screen is resized (e.g., orientation change)
    const _Scene_Title_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function() {
        _Scene_Title_update.call(this);
        if (this._versionSprite) {
            // Optional: Handle dynamic screen size changes if necessary
        }
    };

})();