/**
 * author       Mat Hopwood
 * copyright    2014 Mat Hopwood
 * More info    http://booty5.com
 */
"use strict";

/**
 * A Sound represents a sound effect object and can be used to play back audio
 *
 * Generally a sound should be added to either a {@link b5.Scene} or the global {@link b5.App}'s resources so that it can be managed by them.
 *
 * Example showing how to load and play a sound effect
 *
 *      var sound = new b5.Sound("explosion", "sounds/explosion.mp3", true);
 *      var instance = sound.play();
 *
 * For a complete overview of Resources see {@link http://booty5.com/html5-game-engine/booty5-html5-game-engine-introduction/resources-the-stuff-that-games-are-made-of/ Booty5 Resources Overview}
 *
 * @class b5.Sound
 * @constructor
 * @returns {b5.Sound}                      The created sound
 * @param name {string}                     Name of sound resource
 * @param location {string}                 The sound file location
 *
 * @property {b5.App|b5.Scene}          parent          - Parent resource manager (internal)
 * @property {object}                   snd             - Sound instance (re-usable sound only) (internal). For Web Audio stores a {source:AudioBufferSourceNode, gain:GainNode} object for auto play sounds
 * @property {object}                   buffer          - AudioBufferSourceNode containing decoded audio data (Web Audio only)
 * @property {string}                   name            - Name of this sound resource
 * @property {string}                   location        - The location of the sound file that is used to create the audio object
 * @property {boolean}                  loop            - If set to true then sound will be looped
 * @property {boolean}                  preload         - If set to true then this sound will be preloaded
 * @property {boolean}                  auto_play         - If set to true then this sound will be preloaded
 * @property {boolean}                  loaded          - If true then this resource has finished loading
 */

var loadFile = function(filename, blocking, callback, binary)
{
    var req = new XMLHttpRequest();
    req.open("GET", filename, !blocking);
    req.overrideMimeType("application/json");
    if (binary)
        req.responseType = "arraybuffer";
    if (!blocking)
    {
        req.onreadystatechange = function()
        {
            if (req.readyState === 4)
            {
                if (req.status === 200 || req.status === 0) // 0 for node-webkit
                {
                    if (binary)
                        callback(req.response);
                    else
                        callback(req.responseText);
                }
                else
                    callback(null);
            }
        };
    }
    try
    {
        req.send();
    }
    catch(e)
    {
        return false;
    }

    if (blocking)
    {
        if (req.status === 200)
        {
            if (binary)
                callback(req.response);
            else
                callback(req.responseText);
        }
        else
            callback(null);
    }

    return true;
};

b5.Sound = function(name, location)
{
    // internal variables
    this.parent = null;                 // Parent container
    this.snd = null;                    // Sound instance (re-usable sound only). For Web Audio stores a {AudioBufferSourceNode, GainNode } object for auto play sounds
    this.buffer = null;                 // AudioBufferSourceNode containing decoded audio data (Web Audio only)

    // Public variables
    this.name = name;					// The sound name
    this.location = location;			// Location of the sound
    this.loop = false;                  // If set to true the this sound will replay continuously
    this.preload = false;               // Set to true to preload sound
    this.loaded = false;                // Set to true once audio cam be played
    this.auto_play = false;             // Set to true to auto play sound when loaded
    this.load_retry = 0;
};

/**
 * AudioContext used by Web Audio API
 * @type {object}
 */
b5.Sound.context = null;
b5.Sound.muted = false;

/**
 * Initialises the sound system
 * @parm app {b5.App}   The App that will manage the audio engine
 * @returns {boolean}   true for success or false if error
 */
b5.Sound.init = function(app)
{
    if (app.use_web_audio)
    {
        try
        {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (window.AudioContext === undefined)
                return false;
            b5.Sound.context = new AudioContext();
        }
        catch(e)
        {
            return false;
        }
        return true;
    }
    return false;
};

/**
 * Loads the sound
 */
b5.Sound.prototype.load = function(force)
{
    var debug = b5.app.debug;
    //var snd;
    var that = this;
    var filename = this.location;
    var auto_play = this.auto_play;
    if (!loadFile(filename, false, function(data) {
        if (data !== null)
        {
            b5.Sound.context.decodeAudioData(data, function(buffer) {
                that.buffer = buffer;
                if (auto_play)
                    that.play(force);
            }, function(e)
            {
                console.log(e)
            });
        }
        else
        {
            that.load_retry++;
            if (that.load_retry < 3)
                that.load();
        }
    }, true))
    {
        that.load_retry++;
        if (that.load_retry < 3)
            that.load();
    }
};

/**
 * Starts playback of the sound
 * @returns {object} An Audio object representing the playing sound or a {source, gain} object if using Web Audio API
 */
b5.Sound.prototype.play = function(force)
{
    if (force != true && b5.Sound.muted)
        return null;
    if (this.buffer === null)
        return null;
    var context = b5.Sound.context;
    var source = context.createBufferSource();
    var gain = context.createGain();
    source.buffer = this.buffer;
    source.loop = this.loop;
    source.connect(gain);
    gain.connect(context.destination);
    gain.gain.value = 1;
    source.start(0);
    if (this.auto_play)
        this.snd = { source: source, gain: gain };
    return { source: source, gain: gain };
};

/**
 * Stops playback of thr sound (re-usable sound only)
 */
b5.Sound.prototype.stop = function()
{
    var snd = this.snd;
    if (snd === null || snd === undefined)
        return;
    snd = snd.source;
    snd.stop();
};



