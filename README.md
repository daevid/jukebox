
Zynga's JukeBox
==============

The JukeBox is a component for playing sounds and music with the usage of sprites with a special
focus on performance and cross-device deployment. It is known to run even on Android 1.6+ devices
and needs very few resources compared to other solutions on the web.


Features
--------

* Targets low-end devices and mobile platforms
* HTML5 Audio
* Flash Audio as fallback (support for Android 1.6)
* Sound-Spritemap Entries for easier playback
* Multiple JukeBoxes for parallel playback

Important: The old IE9 beta and iOS are known to allow only one JukeBox to run, no parallel playback possible.

JukeBox Manager adds the following features:
--------------------------------------------

* Codec Detection
* Feature Detection
* Automatic Work Delegation for busy JukeBoxes
* Automatic Stream Correction (useful for slow implementations)
* Automatic Looping for Sound-Spritemap entries
* Playback of Background Music

**Using JukeBox without JukeBox Manager:**

It is not recommended to use JukeBox without the JukeBox Manager, but it's still possible.
The JukeBox Manager offers Codec and Feature detection - to determine which kind of audio codecs will playback properly in your Environment.
If you want to still use JukeBox without JukeBox Manager, you will have to set *resources* to an Array containing only one resource.


Known Bugs / Future Improvements
--------------------------------

* The JukeBox Volume is not inherited on created Clones


Options
-------

These are the supported JukeBox settings you can pass through its constructor:

* resources = *array of urls to sound files*
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

Additionally, iOS' security model prevents a website from playing sounds without prior user interaction. Thus, you will have to use a button or similar that will call myJukeBox.play('background-birds') or similar (see > Usage for more details).


Usage
-----

First, you will have to know that there can be several JukeBox instances in parallel.

The transparent JukeBox Manager allows so-called work delegation. This work delegation concept lets you use a single JukeBox. You create only one instance, but you are able to play multiple sounds in parallel with it.

For example, you can have an *autoplay* setup for a background music, but you can still play other sound spritemap entries afterwards, while the background music is still played.


**Creating a JukeBox**

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
	// will delegate the work to the internal next free clone,
	// because the origin JukeBox is busy
}, 1000);

window.setTimeout(function() {
	myJukeBox.play('cricket-chirp', true);
	// will enforce playback and result will be instant playback
	// and no background music is played afterwards
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


* `play(to, enforce)`
	* to: (float) time in seconds
	* to: (string) spritemap-entry
	* enforce: (boolean) true will disable work delegation and cause instant playback

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
Hint: Some systems like iOS have no support for modifying the volume.


* `getCurrentTime()`

This function will return the current position of the stream.


* `setCurrentTime(to)`
	* to: (float) time in seconds

This function will *try* to set the current position of the stream. It may fail if the stream is not ready for that, 
e.g. if download is still in progress or background process is not ready for playback etc.

