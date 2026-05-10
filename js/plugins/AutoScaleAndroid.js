/*:
 * @plugindesc Auto-scale and center RPG Maker MV game on Android devices (fit to screen).
 * @author ChatGPT
 * @help Place this file in js/plugins and enable it in Plugin Manager.
 *
 * Options:
 *  - useDevicePixelRatio: set to true to multiply renderer resolution by devicePixelRatio (may affect performance)
 */

(function() {
    var pluginName = 'AutoScaleAndroid';
    var useDevicePixelRatio = true; // set false if performance issues on low-end devices

    function isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    var AutoScaleAndroid = {
        fit: function() {
            try {
                var vw = window.innerWidth;
                var vh = window.innerHeight;
                var baseW = Graphics.width;
                var baseH = Graphics.height;
                var scale = Math.min(vw / baseW, vh / baseH);
                if (scale <= 0) scale = 1;

                var newW = Math.round(baseW * scale);
                var newH = Math.round(baseH * scale);

                var canvas = Graphics._renderer && Graphics._renderer.view ? Graphics._renderer.view : document.querySelector('canvas');
                if (!canvas) return;

                // Optionally adjust renderer resolution for sharper pixels
                if (useDevicePixelRatio && Graphics._renderer && Graphics._renderer.resolution !== undefined) {
                    var dpr = window.devicePixelRatio || 1;
                    Graphics._renderer.resolution = dpr;
                    Graphics._renderer.resize(baseW * dpr, baseH * dpr);
                }

                canvas.style.width = newW + 'px';
                canvas.style.height = newH + 'px';
                canvas.style.position = 'absolute';
                canvas.style.left = Math.round((vw - newW) / 2) + 'px';
                canvas.style.top = Math.round((vh - newH) / 2) + 'px';
                canvas.style.imageRendering = 'pixelated';

                var gameDiv = document.getElementById('GameCanvas') || document.body;
                gameDiv.style.backgroundColor = 'black';
                gameDiv.style.width = vw + 'px';
                gameDiv.style.height = vh + 'px';
                gameDiv.style.overflow = 'hidden';
            } catch (e) {
                console.error('AutoScaleAndroid error:', e);
            }
        }
    };

    var _SceneManager_init = SceneManager.init;
    SceneManager.init = function() {
        _SceneManager_init.call(this);
        if (isAndroid()) {
            AutoScaleAndroid.fit();
            window.addEventListener('resize', function() {
                // small timeout to allow soft-keybar/orientation to settle
                setTimeout(AutoScaleAndroid.fit, 80);
            });
        }
    };
})();
