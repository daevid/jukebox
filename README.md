
Zynga's Jukebox
==============

The Jukebox is a component for playing sounds and music with the usage of sprites with a special focus on performance and cross-device deployment. It is known to run even on Android 1.6+ devices and needs very few resources compared to other solutions on the web.


Features
--------

* HTML5 audio
* Flash playback as fallback (support for Android 1.6)
* Targeted at low-end devices and mobile platforms
* Playback of Sound Sprite entries
* Codec detection
* Feature detection
* Multi-Stream ("channels") support
* Automatic work delegation of busy audio streams
* Automatic stream correction
* Support for platforms where only one stream can be played in parallel (IE9 / iOS)


Options
-------

Jukebox has several options that are configured per-stream, meaning the Jukebox constructor itself requires an array of stream settings. A stream setting has the following properties:

* resources = *array of urls to sound sprites*
* autoplay = 'spritemap-entry'
* spritemap = 'object'

The stream.spritemap.entry looks like this: ("entry" is the name of the spritemap entry which is used for autoplay or stream playback)

* spritemap.entry.start = *time*
* spritemap.entry.end = *time*
* spritemap.entry.loop = *Boolean*


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

First, you will have to initialize the Jukebox. The Jukebox itself will return the Stream instances within an array.

```js
var myStreams = new Jukebox([{

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

}], function(jukebox) {

	// This is how you can access the transparent jukebox
	// e.g. jukebox.features and jukebox.codecs

});

// Example call of the Stream API
myStreams[0].play('background-birds');

window.setTimeout(function() {
	myStreams[0].play('cricket-chirp'); // will delegate the work to myStreams[1], because myStreams[0] is busy
}, 1000);
```


After you've initialized the streams, you can use the public API on a per-stream level.
Don't worry about busy streams, they will automatically delegate the work to the next free stream.
If only one parallel stream is supported, the entry will be played instantly.


Public (per-Stream) API
-----------------------

Example of a Stream API Call:

```js
// Note that myStreams was initialized already like in the previous example (see > Usage)

myStreams[0].play("background-music"); // fastest
myStreams[0].play(20.10); // slower
myStreams[0].play("1:23:45"); // also valid, but not recommended
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

