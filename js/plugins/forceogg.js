//=============================================================================
// ForceOgg.js
//=============================================================================

(function() {
    // This tells the engine: "Don't worry about being a mobile device, just use OGG."
    AudioManager.shouldUseHtml5Audio = function() {
        return true;
    };

    // This forces the file extension to always be .ogg
    AudioManager.audioFileExt = function() {
        return '.ogg';
    };

    // Bonus: This prevents the game from 'muting' when the app loses focus
    WebAudio.prototype._shouldMuteOnHide = function() {
        return false;
    };
})();