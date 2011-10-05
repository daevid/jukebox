
Zynga's JukeBox
==============

The JukeBox is a component for playing sounds and music with the usage of sprites with a special
focus on performance and cross-device deployment. It is known to run even on Android 1.6+ devices
and needs very few resources compared to other solutions on the web.


Features
--------

* HTML5 audio
* Flash playback as fallback (support for Android 1.6)
* Targeted at low-end devices and mobile platforms
* Playback of Sound Sprite entries
* Codec detection
* Feature detection
* Multi-Stream and Multi-Channel support
* Automatic work delegation of busy audio streams
* Automatic stream correction
* Support for multiple JukeBox instances
* Support for platforms where only one stream can be played in parallel (IE9 / iOS)


Known Bugs / Future Improvements
--------------------------------

* JukeBox Volume is not inherited on created Channels


Options
-------

These are the supported JukeBox settings you can pass through its constructor:

* resources = *array of urls to sound sprites*
* autoplay = 'spritemap-entry'
* spritemap = 'object'

These are optional settings for the Flash Fallback:

* flashMediaElement = 'url/to/FlashMediaElement.swf' (default is ./swf/FlashMediaElement.swf)
* enforceFlash = 'boolean' will enforce flash usage of instead using html5 as default audio api.

An example spritemap.entry looks like this: ("entry" is the name of the spritemap entry which is used for autoplay or stream playback)

* spritemap.entry.start = *time*
* spritemap.entry.end = *time*
* spritemap.entry.loop = *Boolean*


```js
var mySettings = {
	// ...
	spritemap: {

		"background-music": {
			"start": 1.00,
			"end": 20.00,
			"loop": false
		},

		"test-entry": {
			"start": 21.00,
			"end": 25.00
		}
	}
	// ...
};
```



Setting Up a Sound Sprite
-------------------------

As there are several issues with playing individual files through the HTML5 audio API, we try to prevent some of them by using sound sprites. Since the timer resolution of today's browsers, especially mobile ones, isn't great, it's important to leave a silence gap between every actual sound in the sprite.

Example for a sound sprite structure:

* 1 second silence
* First sound
* 1 second silence
* Second sound
* 1 second silence
* Third sound

Known Issues
------------

There's the problem with asynchronous playback, which can't be avoided on the JavaScript-side of the implementation. Delays were measured up to 820ms on initial playback. iOS has also a problem when falling into sleep mode, as iTunes will play back the sound file afterwards without stopping it.

Additionally, iOS' security model prevents a website from playing sounds without prior user interaction. Thus, you will have to use a button or similar that will call myStreams.play('background-birds') or similar (see > Usage for more details).


Usage
-----

First, you will have to know that there can be several JukeBox instances in parallel.
There's a transparent JukeBox Manager running in the background that will manage work delegation and stream corrections.

This JukeBox Manager will automatically create more JukeBox instances for playback (if your system supports it) and
handles work delegation. For example if you are calling a busy JukeBox to play a spritemap entry (and you aren't enforcing
playback with the optional second argument) it will create a new JukeBox that will do the work.

So background music is possible to be played at the first JukeBox and you can play another spritemap entry of it in parallel - without having to pause Background Music.

This code example shows you how to create a single instance of a JukeBox.
(Note that you won't see anything of the transparent JukeBox Manager)

```js
var myJukeBox = new JukeBox({

	"resources": [
		"./url/to/spritemap.mp3",
		"./url/to/spritemap.ac3",
		"./url/to/spritemap.ogg",
		"./url/to/spritemap.amr", // 3gp / amr codec is supported on most devices. Crappy codec, but cool fallback! =)
	],

	"autoplay": "background-birds",

	"spritemap": {
	
		"background-birds": {
			"start": 1.00,
			"end": 41.00,
			"loop": true
		},

		"cricket-chirp": {
			"start": 42.00,
			"end": 44.75
		}
	
	}

});

// Example call of the JukeBox API
// Note that this is a looping background
myJukeBox.play('background-birds');

window.setTimeout(function() {
	myJukeBox.play('cricket-chirp');
	// will delegate the work to the internal next free channel,
	// because the origin JukeBox is busy
}, 1000);

window.setTimeout(function() {
	myJukeBox.play('cricket-chirp', true);
	// will enforce playback and result will be instant playback and no background music afterwards
}, 5000);
```


Public (per-JukeBox) API
-----------------------

Example of a JukeBox API Call:

```js
// Note that myJukeBox was initialized already like in the previous example (see > Usage)

myJukeBox.play("background-music"); // fastest
myJukeBox.play(20.10); // slower, will search for matching spritemap entry
```


* `play(to)`
	* to: (float) time in seconds
	* to: (string) spritemap-entry

This function will start playback of the given spritemap entry.
You can pass through a value of a time (which is inside a sprite entry), too. It will automatically loop a background music
if it was configured to loop.


* `stop()`

This function will stop the playback of a stream.
It will reset the current position of the played stream to the beginning.


* `pause()`

This function will pause the playback of a stream.
It will save the current position, so that you are able to resume playback later.


* `resume()`

This function will resume the playback of a stream.
It will start playback at the last cached position. If no position was cached before, it will start from the current position of the stream.


* `setVolume(to)`
	* to: (float) volume (min = 0, max = 1.0)

This function will set the volume to the given value.


* `getCurrentTime()`

This function will return the current position of the stream.


* `setCurrentTime(to)`
	* to: (float) time in seconds

This function will *try* to set the current position of the stream. It may fail if the stream is not ready for that, 
e.g. download is still in progress or background process is not ready for playback etc.

