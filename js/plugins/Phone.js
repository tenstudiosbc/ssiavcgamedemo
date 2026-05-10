//=============================================================================
// Phone.js
//=============================================================================

/*:
 * @plugindesc A simple phone system for RPG Maker MV with Android touch support
 * @author Your Name
 *
 * @param ---General---
 * @desc General plugin settings
 * @default
 *
 * @param Phone Width
 * @desc Width of the phone window (0 = full screen width)
 * @type number
 * @min 0
 * @default 0
 *
 * @param Phone Height
 * @desc Height of the phone window (0 = full screen height)
 * @type number
 * @min 0
 * @default 0
 *
 * @param Phone Background
 * @desc Background image for phone window
 * @type file
 * @dir img/system
 * @default Window
 *
 * @param Phone X Position
 * @desc X position of phone window (0 = center)
 * @type number
 * @default 0
 *
 * @param Phone Y Position
 * @desc Y position of phone window (0 = center)
 * @type number
 * @default 0
 *
 * @help
 * ============================================================================
 * Phone System Plugin for RPG Maker MV (Android Focused)
 * ============================================================================
 *
 * INTRODUCTION:
 * This plugin creates a simple phone/messaging system accessible in-game.
 * The system is fully touch-enabled for Android devices and prevents player
 * character movement when the phone window is open.
 *
 * ============================================================================
 * USAGE:
 * ============================================================================
 *
 * To call the phone system from script or plugin command:
 *   SceneManager.push(Scene_Phone);
 *
 * To check if phone is currently open:
 *   $gameSystem.isPhoneOpen()
 *
 * To add a message to the phone:
 *   $gameSystem.addPhoneMessage(name, message, faceIndex);
 *   - name: Character name
 *   - message: Message text
 *   - faceIndex: Face graphic index (optional)
 *
 * To clear phone messages:
 *   $gameSystem.clearPhoneMessages();
 *
 * ============================================================================
 * SCRIPT CALLS:
 * ============================================================================
 *
 * // Open the phone
 * SceneManager.push(Scene_Phone);
 *
 * // Add a message to phone
 * $gameSystem.addPhoneMessage("Alice", "Hello! How are you?", 0);
 * $gameSystem.addPhoneMessage("Bob", "I'm doing great!", 1);
 *
 * // Get all messages
 * var messages = $gameSystem.getPhoneMessages();
 *
 * ============================================================================
 * TOUCH SUPPORT:
 * ============================================================================
 * This plugin is optimized for Android touch input:
 * - Tap close button to close phone
 * - Scroll through messages with touch
 * - All UI elements are touch-friendly
 *
 * ============================================================================
 */

(function() {
  'use strict';

  var parameters = PluginManager.parameters('Phone');
  var phoneWidth = Number(parameters['Phone Width']) || 0;
  var phoneHeight = Number(parameters['Phone Height']) || 0;
  var phoneBackground = String(parameters['Phone Background']) || 'Window';
  var phoneX = Number(parameters['Phone X Position']) || 0;
  var phoneY = Number(parameters['Phone Y Position']) || 0;

  // Initialize Game System
  var _Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this._phoneOpen = false;
    this._phoneMessages = [];
  };

  Game_System.prototype.isPhoneOpen = function() {
    return this._phoneOpen;
  };

  Game_System.prototype.setPhoneOpen = function(value) {
    this._phoneOpen = value;
  };

  Game_System.prototype.addPhoneMessage = function(name, message, faceIndex) {
    faceIndex = faceIndex || 0;
    this._phoneMessages.push({
      name: name,
      message: message,
      faceIndex: faceIndex
    });
  };

  Game_System.prototype.getPhoneMessages = function() {
    return this._phoneMessages;
  };

  Game_System.prototype.clearPhoneMessages = function() {
    this._phoneMessages = [];
  };

  // Prevent player movement when phone is open
  var _Scene_Map_isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
  Scene_Map.prototype.isMenuEnabled = function() {
    if ($gameSystem.isPhoneOpen()) {
      return false;
    }
    return _Scene_Map_isMenuEnabled.call(this);
  };

  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    if ($gameSystem.isPhoneOpen()) {
      this._canUpdateInput = false;
    }
  };

  // Prevent character movement by disabling input
  var _Game_Player_canMove = Game_Player.prototype.canMove;
  Game_Player.prototype.canMove = function() {
    if ($gameSystem.isPhoneOpen()) {
      return false;
    }
    return _Game_Player_canMove.call(this);
  };

  // =========================================================================
  // Scene_Phone
  // =========================================================================

  function Scene_Phone() {
    this.initialize.apply(this, arguments);
  }

  Scene_Phone.prototype = Object.create(Scene_Base.prototype);
  Scene_Phone.prototype.constructor = Scene_Phone;

  Scene_Phone.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._windowLayer = null;
    this._phoneWindow = null;
    this._closeButton = null;
    this._scrollIndex = 0;
  };

  Scene_Phone.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createWindowLayer();
    this.createPhoneWindow();
    this.createCloseButton();
    $gameSystem.setPhoneOpen(true);
  };

  Scene_Phone.prototype.createWindowLayer = function() {
    this._windowLayer = new WindowLayer();
    this._windowLayer.x = 0;
    this._windowLayer.y = 0;
    this.addChild(this._windowLayer);
  };

  Scene_Phone.prototype.createPhoneWindow = function() {
    var wx = phoneX > 0 ? phoneX : (Graphics.boxWidth - 400) / 2;
    var wy = phoneY > 0 ? phoneY : (Graphics.boxHeight - 500) / 2;
    var ww = phoneWidth > 0 ? phoneWidth : 400;
    var wh = phoneHeight > 0 ? phoneHeight : 500;

    this._phoneWindow = new Window_Phone(wx, wy, ww, wh);
    this._windowLayer.addChild(this._phoneWindow);
  };

  Scene_Phone.prototype.createCloseButton = function() {
    var bw = 100;
    var bh = 40;
    var bx = (Graphics.boxWidth - bw) / 2;
    var by = (Graphics.boxHeight - 100);

    this._closeButton = new Sprite();
    this._closeButton.bitmap = new Bitmap(bw, bh);
    this._closeButton.bitmap.fontSize = 20;
    this._closeButton.bitmap.textColor = '#ffffff';
    this._closeButton.bitmap.drawText('CLOSE', 0, 0, bw, bh, 'center');
    
    // Add background to button
    this._closeButton.bitmap.fillRect(0, 0, bw, bh, '#666666');
    this._closeButton.bitmap.outlineWidth = 4;
    this._closeButton.bitmap.outlineColor = '#ffffff';
    this._closeButton.bitmap.drawText('CLOSE', 0, 0, bw, bh, 'center');

    this._closeButton.x = bx;
    this._closeButton.y = by;
    this._closeButton.width = bw;
    this._closeButton.height = bh;
    this._closeButton.isButton = true;
    this._closeButton.touchActive = true;

    this.addChild(this._closeButton);
  };

  Scene_Phone.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    this.updatePhoneInput();
    this.updateTouchInput();
  };

  Scene_Phone.prototype.updatePhoneInput = function() {
    if (Input.isTriggered('cancel') || Input.isTriggered('ok')) {
      this.popScene();
    }
  };

  Scene_Phone.prototype.updateTouchInput = function() {
    if (TouchInput.isTriggered()) {
      var x = TouchInput.x;
      var y = TouchInput.y;

      // Check if close button is tapped
      if (x >= this._closeButton.x && x < this._closeButton.x + this._closeButton.width &&
          y >= this._closeButton.y && y < this._closeButton.y + this._closeButton.height) {
        this.popScene();
      }

      // Pass touch input to phone window
      if (this._phoneWindow && this._phoneWindow.isTouchInsideFrame()) {
        this._phoneWindow.processTouch();
      }
    }
  };

  Scene_Phone.prototype.popScene = function() {
    $gameSystem.setPhoneOpen(false);
    SceneManager.pop();
  };

  // =========================================================================
  // Window_Phone
  // =========================================================================

  function Window_Phone() {
    this.initialize.apply(this, arguments);
  }

  Window_Phone.prototype = Object.create(Window_Base.prototype);
  Window_Phone.prototype.constructor = Window_Phone;

  Window_Phone.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._scrollIndex = 0;
    this._maxScrollIndex = 0;
    this.refresh();
  };

  Window_Phone.prototype.refresh = function() {
    this.contents.clear();
    this.drawAllMessages();
    this.updateMaxScrollIndex();
  };

  Window_Phone.prototype.drawAllMessages = function() {
    var messages = $gameSystem.getPhoneMessages();
    var y = 0;
    var lineHeight = this.lineHeight();

    // Draw title
    this.changeTextColor(this.systemColor());
    this.drawText('MESSAGES', 0, y, this.contentsWidth(), 'center');
    y += lineHeight + 10;

    // Draw separator
    this.drawLine(0, y, this.contentsWidth(), y, '#cccccc');
    y += 10;

    // Draw messages
    this.changeTextColor(this.normalColor());
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      
      // Draw sender name in bold color
      this.changeTextColor(this.systemColor());
      this.drawText(msg.name, 10, y, this.contentsWidth() - 20);
      y += lineHeight;

      // Draw message text
      this.changeTextColor(this.normalColor());
      var wrappedText = this.wordWrap(msg.message, this.contentsWidth() - 20);
      var lines = wrappedText.split('\n');
      
      for (var j = 0; j < lines.length; j++) {
        this.drawText(lines[j], 10, y, this.contentsWidth() - 20);
        y += lineHeight;
      }

      // Add spacing between messages
      y += 5;

      // Stop drawing if we exceed window height
      if (y > this.contentsHeight()) {
        break;
      }
    }

    // Draw empty state
    if (messages.length === 0) {
      this.changeTextColor(this.deactivatedColor());
      this.drawText('No messages yet', 0, this.contentsHeight() / 2 - lineHeight / 2, 
                    this.contentsWidth(), 'center');
    }
  };

  Window_Phone.prototype.wordWrap = function(text, maxWidth) {
    var result = '';
    var line = '';
    var words = text.split(' ');

    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      var testLine = line + (line ? ' ' : '') + word;
      
      if (this.textWidth(testLine) > maxWidth && line) {
        result += line + '\n';
        line = word;
      } else {
        line = testLine;
      }
    }
    result += line;
    return result;
  };

  Window_Phone.prototype.textWidth = function(text) {
    return this.contents.measureTextWidth(text);
  };

  Window_Phone.prototype.drawLine = function(x1, y1, x2, y2, color) {
    var bitmap = this.contents;
    var oldColor = bitmap.textColor;
    
    // Draw a simple line
    for (var i = 0; i < Math.abs(x2 - x1); i++) {
      var px = Math.min(x1, x2) + i;
      bitmap.paintOpacity = 100;
      bitmap.fillRect(px, y1, 1, 1, color);
    }
  };

  Window_Phone.prototype.processTouch = function() {
    if (TouchInput.isRepeated()) {
      this.onTouchScroll();
    }
  };

  Window_Phone.prototype.onTouchScroll = function() {
    var lastY = TouchInput._y;
    var deltaY = TouchInput._y - TouchInput._prevY;

    if (deltaY < 0) {
      this._scrollIndex = Math.max(0, this._scrollIndex - 1);
      this.refresh();
    } else if (deltaY > 0) {
      this._scrollIndex = Math.min(this._maxScrollIndex, this._scrollIndex + 1);
      this.refresh();
    }
  };

  Window_Phone.prototype.updateMaxScrollIndex = function() {
    var messages = $gameSystem.getPhoneMessages();
    this._maxScrollIndex = Math.max(0, messages.length - 3);
  };

  Window_Phone.prototype.isTouchInsideFrame = function() {
    var x = TouchInput.x;
    var y = TouchInput.y;
    return (x >= this.x && x < this.x + this.width &&
            y >= this.y && y < this.y + this.height);
  };

  // Export to global scope for plugin access
  window.Scene_Phone = Scene_Phone;
  window.Window_Phone = Window_Phone;

})();