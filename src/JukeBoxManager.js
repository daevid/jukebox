
if (typeof JukeBox === 'undefined') {
	throw "JukeBox Manager requires JukeBox.js to run properly";
}

/*
 * This is the transparent JukeBox Manager that runs in the background
 *
 * You shouldn't call the constructor, a JukeBox Manager instance is automatically
 * created if you create a JukeBox.
 *
 */
JukeBox.Manager = function(enforceFlash) {

	this.features = {};
	this.codecs = {};


	this.__jukeBoxes = {};
	this.__jukeBoxesLength = 0;

	this.__clones = {};
	this.__clonesLength = 0;

	this.__queue = [];

	this.__enforceFlash = enforceFlash || false;
	this.__detectFeatures();


	if (!this.__intervalId) {
		var that = this;
		this.__intervalId = window.setInterval(function() {
			that.__loop();
		}, 100);
	}

};

JukeBox.Manager.prototype = {

	__detectFeatures: function() {

		var audio = window.Audio && new Audio();

		if (audio && audio.canPlayType && !this.__enforceFlash) {

			// this is the list we will walk through to check codec support
			var mimeList = [
				// e = extension, m = mime type
				{ e: '3gp', m: [ 'audio/3gpp' ] },
				// { e: 'avi', m: 'video/x-msvideo' }, // avi container allows pretty everything, impossible to detect -.-
				{ e: 'aac', m: [ 'audio/aac', 'audio/aacp' ] },
				{ e: 'amr', m: [ 'audio/amr' ] },
				{ e: 'm4a', m: [ 'audio/mp4', 'audio/mp4; codecs="mp4a.40.2,avc1.42E01E"', 'audio/mpeg4', 'audio/mpeg4-generic', 'audio/mp4a-latm', 'audio/MP4A-LATM', 'audio/x-m4a' ] },
				{ e: 'mp3', m: [ 'audio/mp3', 'audio/mpeg', 'audio/mpeg; codecs="mp3"', 'audio/MPA', 'audio/mpa-robust' ] }, // mpeg was name for mp2 and mp3! avi container was mp4/m4a
				{ e: 'mpga', m: [ 'audio/MPA', 'audio/mpa-robust', 'audio/mpeg', 'video/mpeg' ] },
				{ e: 'mp4', m: [ 'audio/mp4', 'video/mp4' ] },
				{ e: 'ogg', m: [ 'application/ogg', 'audio/ogg', 'audio/ogg; codecs="theora, vorbis"', 'video/ogg', 'video/ogg; codecs="theora, vorbis"' ] },
				{ e: 'wav', m: [ 'audio/wave', 'audio/wav', 'audio/wav; codecs="1"', 'audio/x-wav', 'audio/x-pn-wav' ] },
				{ e: 'webm', m: [ 'audio/webm', 'audio/webm; codecs="vorbis"', 'video/webm' ] }
			];

			var mime, extension;
			for (var m = 0, l = mimeList.length; m < l; m++) {

				extension = mimeList[m].e;

				if (mimeList[m].m.length && typeof mimeList[m].m === 'object') {

					for (var mm = 0, mml = mimeList[m].m.length; mm < mml; mm++) {

						mime = mimeList[m].m[mm];

						// Supported Codec was found for Extension, so skip redundant checks
						if (audio.canPlayType(mime) !== "") {
							this.codecs[extension] = mime;
							break;

						// Flag the unsupported extension (that it is also not supported for Flash Fallback)
						} else if (!this.codecs[extension]) {
							this.codecs[extension] = false;
						}

					}

				}

				// Go, GC, Go for it!
				mime = null;
				extension = null;

			}

			// Browser supports HTML5 Audio API theoretically, but support depends on Codec Implementations
			this.features.html5audio = !!(this.codecs.mp3 || this.codecs.ogg || this.codecs.webm || this.codecs.wav);

			// Default Channel Amount is 8, known to work with all Browsers
			this.features.channels = 8;

			// Detect Volume support
			audio.volume = 0.1;
			this.features.volume = !!audio.volume.toString().match(/^0\.1/);



			// FIXME: HACK, but there's no way to detect these crappy implementations
			if (navigator.userAgent.match(/MSIE 9\.0/) || navigator.userAgent.match(/iPhone|iPod|iPad/i)) {
				this.features.channels = 1;
			}

		}



		// All Android devices support Flash. Stunning!
		this.features.flashaudio = !!navigator.mimeTypes['application/x-shockwave-flash'] || !!navigator.plugins['Shockwave Flash'] || false;

		// Internet Explorer
		if (window.ActiveXObject){
			try {
				var flash = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.10');
				this.features.flashaudio = true;
			} catch(e) {
				// Throws an error if the version isn't available
			}
		}

		// Allow enforce of Flash Usage
		if (this.__enforceFlash) {
			this.features.flashaudio = true;
		}

		if (this.features.flashaudio) {

			// Overwrite cocedcs only if there's no html5audio support
			if (!this.features.html5audio) {

				// Known to work with every Flash Implementation
				this.codecs.mp3 = 'audio/mp3';
				this.codecs.mpga = 'audio/mpeg';
				this.codecs.mp4 = 'audio/mp4';
				this.codecs.m4a = 'audio/mp4';


				// Flash Runtime on Android also supports GSM codecs, but impossible to detect
				this.codecs['3gp'] = 'audio/3gpp';
				this.codecs.amr = 'audio/amr';


				// TODO: Multi-Channel support on ActionScript-side
				this.features.volume = true;
				this.features.channels = 1;

			}

		}

	},

	__loop: function() {

		// Nothing to do
		if (this.__jukeBoxLength === 0) {
			return;
		}


		// Queue functionality
		if (
			this.__queue.length
			&& this.__jukeBoxesLength + this.__clonesLength < this.features.channels
		) {

			var originJukeBox = this.__getJukeBoxById(this.__queue[0].origin);

			if (originJukeBox) {
				var freeClone = this.__getClone(this.__queue[0].origin, originJukeBox.settings);

				// Use free clone for playback
				if (freeClone !== null) {
					this.addJukeBox(freeClone);
					freeClone.play(this.__queue[0].pointer, true);
				}
			}

			// Remove Queue Entry. It's corrupt if nothing happened.
			this.__queue.splice(0, 1);

			return;

		}


		for (var id in this.__jukeBoxes) {

			var jukeBox = this.__jukeBoxes[id],
				jukeBoxPosition = jukeBox.getCurrentTime() || 0;


			// Correction
			if (jukeBox.isPlaying && jukeBox.wasReady === false) {

				jukeBox.wasReady = jukeBox.setCurrentTime(jukeBox.isPlaying.start);


			// Reset / Stop
			} else if (jukeBox.isPlaying && jukeBox.wasReady){

				if (jukeBoxPosition > jukeBox.isPlaying.end) {

					if (jukeBox.isPlaying.loop === true) {
						jukeBox.play(jukeBox.isPlaying.start, true);
					} else {
						jukeBox.stop();
					}

				}


			// Remove Idling Clones
			} else if (jukeBox.isClone && jukeBox.isPlaying === null) {
				this.removeJukeBox(jukeBox);
				continue;


			// Background Music for Single-Channel Environment
			} else if (jukeBox.__backgroundMusic !== undefined && jukeBox.isPlaying === null) {

				if (jukeBoxPosition > jukeBox.__backgroundMusic.end) {
					jukeBox.__backgroundHackForiOS();
				}

			}

		}


	},

	__getJukeBoxById: function(id) {

		if (this.__jukeBoxes && this.__jukeBoxes[id] !== undefined) {
			return this.__jukeBoxes[id];
		}

		return null;

	},

	__getClone: function(origin, settings) {

		// Search for a free clone
		for (var cloneId in this.__clones) {

			var clone = this.__clones[cloneId];
			if (
				clone.isPlaying === null
				&& clone.origin === origin
			) {
				return clone;
			}
		}


		// Create a new clone
		if (Object.prototype.toString.call(settings) === '[object Object]') {

			var cloneSettings = {};
			for (var s in settings) {
				cloneSettings[s] = settings[s];
			}

			// Clones just don't autoplay. Just don't :)
			cloneSettings.autoplay = false;

			var newClone = new JukeBox(cloneSettings, origin);
			newClone.isClone = true;
			newClone.wasReady = false;

			this.__clones[newClone.id] = newClone;

			return newClone;

		}

		return null;

	},



	/*
	 * PUBLIC API
	 */

	/*
	 * This will check an array for playable resources, depending on the previously
	 * detected codecs and features.
	 *
	 * @param {Array} resources The array of resources (e.g. [ "first/file.ogg", "./second/file.mp3" ])
	 * @returns {String|Null} resource The playable resource. If no resource was found, null is returned.
	 */
	getPlayableResource: function(resources) {

		if (Object.prototype.toString.call(resources) !== '[object Array]') {
			resources = [ resources ];
		}


		for (var r = 0, l = resources.length; r < l; r++) {
			var resource = resources[r],
				extension = resource.match(/\.([^\.]*)$/)[1];

			// Yay! We found a supported resource!
			if (extension && !!this.codecs[extension]) {
				return resource;
			}

		}

		return null;

	},

	/*
	 * This function adds a JukeBox to the JukeBoxManager's loop
	 * @params {JukeBox Instance}
	 */
	addJukeBox: function(jukeBox) {

		if (
			jukeBox instanceof JukeBox
			// Object.prototype.toString.call(jukeBox) === '[object Object]'
			&& this.__jukeBoxes[jukeBox.id] === undefined
		) {
			this.__jukeBoxesLength++;
			this.__jukeBoxes[jukeBox.id] = jukeBox;
			return true;
		}

		return false;

	},

	/*
	 * This function removes a JukeBox from the JukeBoxManager's loop
	 * @params {JukeBox Instance} jukeBox
	 */
	removeJukeBox: function(jukeBox) {

		if (
			jukeBox instanceof JukeBox
			&& this.__jukeBoxes[jukeBox.id] !== undefined
		) {
			this.__jukeBoxesLength--;
			delete this.__jukeBoxes[jukeBox.id];
			return true;
		}

		return false;

	},

	/*
	 * This function is kindof public, but only used for Queue Delegation
	 *
	 * DON'T USE IT.
	 */
	addQueueEntry: function(pointer, streamId) {

		this.__queue.push({
			pointer: pointer,
			origin: streamId
		});

	}

};

