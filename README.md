
Zynga's JukeBox
==============

The JukeBox is a component for playing sounds, music with the usage of sprites. It is known to run on Android 1.6+ devices and needs very few resources compared to other solutions on the web.
Its concept is called automatic stream correction. This concept follows the way that unavailable streams will be corrected when to their current time position when they are ready for playback.


Features
--------

* HTML5 audio
* Flash playback as fallback (support for Android 1.6)
* Targeted for low-end devices and mobile platforms

* Playback of Sound Sprite entries
* Codec detection
* Feature detection

* Multi-Stream ("channels") support
* Automatic work delegation of busy audio streams
* Support for platforms where only one stream can be played in parallel (IE9 / iOS)


Options
-------

JukeBox has several options that are configure per-stream, that means the JukeBox constructor itself requires an array of stream settings.


A stream setting has the following properties:

* resources = `array`
* autoplay = `spritemap-entry`
* spritemap = `object`

The stream.spritemap.entry looks like this:
(Note that "entry" is the name of the spritemap entry which is used for autoplay or stream playback)

spritemap.entry.start = `time`,
spritemap.entry.end = `time`,
spritemap.entry.loop = `false` or `true`


Setting Up a Sound Sprite
-------------------------

First, you will have to know that there are several issues with the Audio API on vendor implementations.
The Audio API will play asynchronously in the background, so you can't rely in "canplaythrough" event on mobile devices.

E.g. when you initially play back a sound sprite entry, you will get a delay up to 820ms (iPhone 4 / iOS4).

So you will have to insert gaps between the sound sprite entries.

Sound Sprite structure:
* 1 second silence
* First Entry
* 1 second silence
* Second Entry
* 1 second silence
* Third Entry
* ... and so on ...


A personal hint from me is to use the first sprite entry as the background music. So you will have the smallest delay
and it's not that important to play back a background music right after the user has clicked something.


Known Issues
------------

There's the problem with the asynchronous playback, which cant be avoided on the JavaScript-side of the implementation.
Delays were measured up to 820ms on initial playback. iOS has also a problem when falling into sleep mode, because iTunes will play back
the soundfile afterwards without stopping it.

iOS' security model will only playback sounds when the user has interacted with the browser. So you will have to use a button or similar that will
call myStreams.play('background-birds') or similar (see > Usage for more details).


Usage
-----

First, you will have to initialize the JukeBox. The JukeBox itself will return the Stream instances within an array.

```js
var myStreams = new z.JukeBox([{

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

}], function(jukeBox) {

	// This is how you can access the transparent jukeBox
	// e.g. jukeBox.features and jukeBox.codecs

});
```


After you've initialized the streams, you can use the Public API on per-stream level.
Don't worry about busy streams, they will automatically delegate the work to the next free stream.
If only one parallel stream is supported, the entry will be played instantly.


Public (per-Stream) API
-----------------------


* `play(to?)`
	* to: (float) time in seconds
	* to: (string) spritemap-entry

This function will start playback of the given spritemap entry.
You can pass through a value of a time (which is inside a sprite entry), too. It will automatically loop a background music
if it was configured to loop.

Example (dummy-code):

```js
stream.spritemap = {
	"background-music": 1.00,
	"end": 41.00,
	"loop": true
};

stream.play("background-music"); // fastest
stream.play(20.10); // slower
stream.play("1:23:45"); // also valid, but not recommended

```


* `stop()`

This function will stop the playback of a stream.
It will reset the current position of the played stream to the beginning.


* `pause()`

This function will pause the playback of a stream.
It will save the current position, so that you are able to resume playback later.


* `resume()`

This function will resume the playback of a stream.
It will start playback at the last cached position. If no position was cached before, it will start from the current position of the stream.


* `setVolume(to?)`
	* to: (float) volume (min = 0, max = 1.0)

This function will set the volume to the given value.


* `getCurrentTime()`

This function will return the current position of the stream.


* `setCurrentTime(to?)`
	* to: (float) time in seconds

This function will *try* to set the current position of the stream. It may fail if the stream is not ready for that, 
e.g. download is still in progress or background process is not ready for playback etc.

