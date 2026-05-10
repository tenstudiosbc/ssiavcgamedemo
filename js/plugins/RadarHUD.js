/*:
 * @plugindesc Modern Animated Radar for RPG Maker MV with Mobile Optimization.
 * @author Gemini
 * * @help
 * This plugin adds a modern, circular radar to the top-left of the screen.
 * It displays the map name underneath the radar using the database settings.
 * * Features:
 * - High performance (no lag on mobile).
 * - Responsive layout for different screen sizes.
 * - Animated transitions and pulse effects.
 * - Automatic "Map Name" display positioned below the radar.
 */

(function() {
    const _Scene_Map_start = Scene_Map.prototype.start;
    const _Scene_Map_update = Scene_Map.prototype.update;
    const _Scene_Map_terminate = Scene_Map.prototype.terminate;

    function Window_Radar() {
        this.initialize.apply(this, arguments);
    }

    Window_Radar.prototype = Object.create(Window_Base.prototype);
    Window_Radar.prototype.constructor = Window_Radar;

    Window_Radar.prototype.initialize = function() {
        const width = 300; // Sufficient width for map names
        const height = 200; // Increased height to accommodate text below
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this.opacity = 0;
        this._pulseFrame = 0;
        this.contentsOpacity = 0; 
    };

    Window_Radar.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        this.updateAnimation();
        this.drawRadar();
    };

    Window_Radar.prototype.updateAnimation = function() {
        if (this.contentsOpacity < 255) {
            this.contentsOpacity += 5;
        }
        this._pulseFrame = (this._pulseFrame + 1) % 120;
    };

    Window_Radar.prototype.drawRadar = function() {
        this.contents.clear();
        
        // Radar circle positioning
        const centerX = 50;
        const centerY = 50;
        const radius = 40;

        // 1. Draw Radar Background
        this.contents.paintOpacity = 160;
        this.contents.drawCircle(centerX, centerY, radius, '#000000');
        this.contents.paintOpacity = 255;
        
        // 2. Draw Animated Pulse Ring
        const pulseSize = radius + (Math.sin(this._pulseFrame * 0.05) * 5);
        const pulseOpacity = Math.max(0, 150 - (this._pulseFrame * 1.5));
        this.drawRing(centerX, centerY, pulseSize, 2, `rgba(0, 255, 255, ${pulseOpacity / 255})`);

        // 3. Draw Outer Border
        this.drawRing(centerX, centerY, radius, 3, '#00ffff');

        // 4. Draw "Blips"
        this.drawBlips(centerX, centerY, radius);

        // 5. Draw Map Name BELOW the Radar
        // x: start of circle (10), y: below circle (centerY + radius + 10)
        this.drawMapInfo(10, centerY + radius + 10);
    };

    Window_Radar.prototype.drawRing = function(x, y, radius, weight, color) {
        const context = this.contents.context;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2, false);
        context.lineWidth = weight;
        context.strokeStyle = color;
        context.stroke();
    };

    Window_Radar.prototype.drawBlips = function(cx, cy, radius) {
        if (!$gameMap) return;
        const scale = radius / 15; 

        // Draw Player
        this.contents.drawCircle(cx, cy, 3, '#ffffff');

        // Draw Events
        $gameMap.events().forEach(event => {
            const dx = (event._realX - $gamePlayer._realX) * scale;
            const dy = (event._realY - $gamePlayer._realY) * scale;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < radius - 2) {
                let color = '#ff0000';
                if (event.event().name.includes('NPC')) color = '#00ff00';
                this.contents.drawCircle(cx + dx, cy + dy, 2, color);
            }
        });
    };

    Window_Radar.prototype.drawMapInfo = function(x, y) {
        const mapName = $gameMap.displayName() || "Unknown Area";
        
        // Draw Text
        this.contents.fontSize = 20;
        this.contents.textColor = '#00ffff';
        this.contents.drawText(mapName, x, y, 250, 26, 'left');
        
        // Draw Accent Line below Name
        this.contents.fillRect(x, y + 28, 120, 2, '#00ffff');
        
        // Draw Status
        this.contents.fontSize = 11;
        this.contents.textColor = '#ffffff';
        this.contents.drawText("LOCAL SCAN ACTIVE", x, y + 32, 200, 20, 'left');
    };

    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        this._radarWindow = new Window_Radar();
        this.addChild(this._radarWindow);
    };

    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (this._radarWindow) {
            this._radarWindow.visible = !$gameMessage.isBusy();
        }
    };

    Scene_Map.prototype.terminate = function() {
        _Scene_Map_terminate.call(this);
        this.removeChild(this._radarWindow);
    };

})();