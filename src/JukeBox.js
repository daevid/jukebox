
/*
 * This will construct a JukeBox instance.
 * The JukeBox Manager itself is transparent and irrelevant for usage.
 * @param {Object} settings The settings object (look defaults for more details)
 * @param {Number} [id] The optional id of the JukeBox (automatically managed if not given)
 */
var JukeBox = function(settings, id) {

	this.id = id || ++JukeBox.__streamId;

	this.settings = {};

	for (var d in this.defaults) {
		this.settings[d] = this.defaults[d];
	}

	for (var s in settings) {
		this.settings[s] = settings[s];
	}


 	// The JukeBox Manager itself is transparent
	if (!JukeBox.__manager) {
		JukeBox.__manager = new JukeBox.Manager(this.settings.enforceFlash);
	}

	this.resource = JukeBox.__manager.getPlayableResource(this.settings.resources);

	if (this.resource) {
		this.__init();
	} else {
		// ARGHS DAMN IT BROWSER! =D
		throw "No playable resource found.";
	}

	return this;

};



// The Stream Counter
JukeBox.__streamId = 0;

JukeBox.prototype = {

	defaults: {
		resources: [], // The resources array containing the audio file urls
		autoplay: false, // Autoplay is deactivated by default
		spritemap: {}, // The spritemap object per-stream
		loop: false, // Loop the complete stream again when last entry was played?
		flashMediaElement: './swf/FlashMediaElement.swf',
		enforceFlash: false,
		canplaythroughTimeout: 1000, // timeout if EventListener fails
	},

	__addToManager: function(event) {

		if (!this.__wasAddedToManager) {
			JukeBox.__manager.__streams.push(this);
			this.__wasAddedToManager = true;
		}

	},

	/*
	__log: function(title, desc) {

		if (!this.__logElement) {
			this.__logElement = document.createElement('ul');
			document.body.appendChild(this.__logElement);
		}

		var that = this;
		window.setTimeout(function() {
			var item = document.createElement('li');
			item.innerHTML = '<b>' + title + '</b>: ' + (desc ? desc : '');
			that.__logElement.appendChild(item);
		}, 0);

	},

	__updateBuffered: function(event) {

		var buffer = this.context.buffered;

		if (buffer) {

			for (var b = 0; b < buffer.length; b++) {
				this.__log(event.type, buffer.start(b).toString() + ' / ' + buffer.end(b).toString());
			}

		}

	},
	*/

	__init: function() {

		var that = this,
			settings = this.settings,
			features = JukeBox.__manager.features || {};

		if (features.html5audio) {

			this.context = new Audio();
			this.context.src = this.resource;


			// This will add the stream to the manager's stream cache,
			// there's a fallback timeout if the canplaythrough event wasn't fired
			var addFunc = function(event){ that.__addToManager(event); };
			this.context.addEventListener('canplaythrough', addFunc, true);

			// Uh, Oh, What is it good for? Uh, Oh ...
			/*
				var bufferFunc = function(event) { that.__updateBuffered(event); };
				this.context.addEventListener('loadedmetadata', bufferFunc, true);
				this.context.addEventListener('progress', bufferFunc, true);
			*/

			// This is the timeout, we will penetrate the stream anyways
			window.setTimeout(function(){
				that.context.removeEventListener('canplaythrough', addFunc, true);
				addFunc('timeout');
			}, settings.canplaythroughTimeout);


			// old WebKit
			this.context.autobuffer = true;

			// new WebKit
			this.context.preload = true;

			// FIXME: This is the hacky API, but got no more generic idea for now =/
			for (var api in this.HTML5API) {
				this[api] = this.HTML5API[api];
			}

			if (features.channels > 1) {

				if (settings.autoplay === true) {
					this.context.autoplay = true;
				} else if (settings.spritemap[settings.autoplay]) {
					this.play(settings.autoplay);
				}

			} else if (features.channels === 1 && settings.spritemap[settings.autoplay]) {
				this.__backgroundMusic = settings.spritemap[settings.autoplay];
			}

		} else if (features.flashaudio) {

			// FIXME: This is the hacky API, but got no more generic idea for now =/
			for (var api in this.FLASHAPI) {
				this[api] = this.FLASHAPI[api];
			}

			var flashVars = [
				'id=jukebox-flashstream-' + this.id,
				'autoplay=' + settings.autoplay,
				'file=' + window.encodeURIComponent(this.resource)
			];

			// Too much crappy code, have this in a crappy function instead.
			this.__initFlashContext(flashVars);

			if (settings.autoplay === true) {
				this.play(0);
			} else if (settings.spritemap[settings.autoplay]) {
				this.play(settings.autoplay);
			}

		} else {

			throw "Your Browser does not support Flash Audio or HTML5 Audio.";

		}

	},

	/*
	 * This is not that simple, better code structure with a helper function
	 */
	__initFlashContext: function(flashVars) {

		var context,
			url = this.settings.flashMediaElement;

		var params = {
			'flashvars': flashVars.join('&'),
			'quality': 'high',
			'bgcolor': '#000000',
			'wmode': 'transparent',
			'allowscriptaccess': 'always',
			'allowfullscreen': 'true'
		};

		/*
		 * I Can Haz Flash? So I've got to be a stupidz IE user =D
		 */
		if (navigator.userAgent.match(/MSIE/)) {

			context = document.createElement('div');

			// outerHTML only works in IE when context is already in DOM
			document.getElementsByTagName('body')[0].appendChild(context);


			var object = document.createElement('object');

			object.id = 'jukebox-flashstream-' + this.id;
			object.setAttribute('type', 'application/x-shockwave-flash');
			object.setAttribute('classid', 'clsid:d27cdb6e-ae6d-11cf-96b8-444553540000');
			object.setAttribute('width', '0');
			object.setAttribute('height', '0');


			// IE specific params
			params.movie = url + '?x=' + (Date.now ? Date.now() : +new Date());
			params.flashvars = flashVars.join('&amp;');



			for (var p in params) {

				var element = document.createElement('param');
				element.setAttribute('name', p);
				element.setAttribute('value', params[p]);
				object.appendChild(element);

			}

			context.outerHTML = object.outerHTML;

			this.context = document.getElementById('jukebox-flashstream-' + this.id);

		} else {

			context = document.createElement('embed');
			context.id = 'jukebox-flashstream-' + this.id;
			context.setAttribute('type', 'application/x-shockwave-flash');
			context.setAttribute('width', '100');
			context.setAttribute('height', '100');

			params.play = false;
			params.loop = false;
			params.src = url + '?x=' + (Date.now ? Date.now() : +new Date());

			for (var p in params) {
				context.setAttribute(p, params[p]);
			}

			document.getElementsByTagName('body')[0].appendChild(context);

			this.context = context;

		}

	},

	/*
	 * This is the background hack for iOS and other single-channel systems
	 * It allows playback of a background music, which will be overwritten by playbacks
	 * of other sprite entries. After these entries, background music continues.
	 *
	 * This allows us to trick out the iOS Security Model after initial playback =)
	 */
	__backgroundHackForiOS: function() {

		if (this.__backgroundMusic === undefined) {
			return;
		}

		if (this.__backgroundMusic.started === undefined) {
			this.__backgroundMusic.started = Date.now ? Date.now() : +new Date();
			this.setCurrentTime(this.__backgroundMusic.start);
		} else {
			var now = Date.now ? Date.now() : +new Date();
			this.__backgroundMusic.__lastPointer = (( now - this.__backgroundMusic.started) / 1000) % (this.__backgroundMusic.end - this.__backgroundMusic.start) + this.__backgroundMusic.start;
			this.play(this.__backgroundMusic.__lastPointer);
		}

	},

	/*
	 * PUBLIC API
	 */

	/*
	 * This will play a given position on the stream.
	 * Optional argument is the enforce flag that will avoid queueing and will
	 * directly start the stream playback at the position.
	 *
	 * @param {Number} pointer The pointer (Float) in Seconds.
	 * @param {Boolean} [enforce] The enforce flag for direct playback
	 */
	play: function(pointer, enforce) {

		if (this.isPlaying && enforce !== true && !this.__backgroundMusic) {
			JukeBox.__manager.addQueueEntry(pointer, this.id);
			return;
		}

		var spritemap = this.settings.spritemap,
			newPosition;

		// Spritemap Entry Playback
		if (spritemap[pointer] !== undefined) {

			newPosition = spritemap[pointer].start;

		// Seconds-Position Playback (find out matching spritemap entry)
		} else if (typeof pointer === 'number') {

			newPosition = pointer;

			for (var s in spritemap) {

				if (newPosition >= spritemap[s].start && newPosition <= spritemap[s].end) {
					pointer = s;
					break;
				}

			}

		}

		if (newPosition !== undefined && Object.prototype.toString.call(spritemap[pointer]) === '[object Object]') {

			this.isPlaying = this.settings.spritemap[pointer];

			// Start Playback, Stream will be corrected within the soundloop of the JukeBox.Manager
			this.context.play && this.context.play();

			// Locking due to slow Implementation on Mobile Devices
			this.wasReady = this.setCurrentTime(newPosition);

		}

	},

	/*
	 * This will stop the current playback and reset the pointer.
	 * Automatically starts the backgroundMusic again for Single-Channel (iOS) mode.
	 */
	stop: function() {

		this.__lastPosition = 0; // reset pointer
		this.isPlaying = undefined;

		// Was a Background Music played already?
		if (this.__backgroundMusic) {
			this.__backgroundHackForiOS();
		} else {
			this.context.pause();
		}

	},

	/*
	 * This will pause the current playback and cache the pointer position.
	 */
	pause: function() {
		this.__lastPosition = this.getCurrentTime();
		this.context.pause();
	},

	/*
	 * This will resume playback.
	 */
	resume: function() {

		if (this.__lastPosition !== undefined) {
			this.play(this.__lastPosition);
			this.__lastPosition = undefined;
		} else {
			this.context.play();
		}

	},



	/*
	 * HTML5 Audio API abstraction layer
	 */
	HTML5API: {

		/*
		 * This will set the volume to a given value
		 * @param {Number} value The float value (0 - 1.0)
		 */
		setVolume: function(value) {
			this.context.volume = value;
		},

		/*
		 * This will return the current pointer position
		 * @returns {Number} pointer position (currentTime)
		 */
		getCurrentTime: function() {
			return this.context.currentTime || 0;
		},

		/*
		 * This will set the pointer position to a given value
		 * @param {Number} pointer position (Float)
		 * @returns {Boolean} Returns true if it was successfully set.
		 */
		setCurrentTime: function(value) {

			try {
				// DOM Exceptions are fired when Audio Element isn't ready yet.
				this.context.currentTime = value;
				return true;
			} catch(e) {
				return false;
			}

		}

	},



	/*
	 * Flash Audio API abstraction layer
	 */
	FLASHAPI: {

		/*
		 * This will set the volume to a given value
		 * @param {Number} value The float value (0 - 1.0)
		 */
		setVolume: function(value) {
			this.context.setVolume(value);
		},

		/*
		 * This will return the current pointer position
		 * @returns {Number} pointer position (currentTime)
		 */
		getCurrentTime: function() {

			// Avoid stupid exceptions, wait for JavaScript API to be ready
			if (this.context && typeof this.context.getCurrentTime === 'function') {
				return this.context.getCurrentTime();
			}

			return 0;

		},

		/*
		 * This will set the pointer position to a given value
		 * @param {Number} pointer position (Float)
		 * @returns {Boolean} Returns true if it was successfully set.
		 */
		setCurrentTime: function(value) {

			// Avoid stupid exceptions, wait for JavaScript API to be ready
			if (this.context && typeof this.context.setCurrentTime === 'function') {
				return this.context.setCurrentTime(value);
			}

			return false;

		}


	}

};





































/*
 * This is the transparent JukeBox Manager that runs in the background
 */
JukeBox.Manager = function(enforceFlash) {

	this.features = {};
	this.codecs = {};

	this.__streams = [];
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

				// Prevent iteration mistakes
				mime = undefined;
				extension = undefined;

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
		if (!this.__streams.length) {
			return;
		}

		// Yay, we got free streams that will do our work!
		if (this.__streams.length < this.features.channels && this.__queue.length) {

			var stream = this.__getStreamById(this.__queue[0].origin);

			if (stream) {

				var settings = stream.settings;
				this.__createChannel(settings, this.__queue[0].origin);

			} else {

				// Queue Entry is corrupt, so delete it
				this.__queue.splice(0, 1);

			}

			return;

		}


		for (var s = 0, l = this.__streams.length; s < l; s++) {

			var stream = this.__streams[s],
				streamPosition = stream.getCurrentTime() || 0;


			// Stream Correction
			if (stream.isPlaying && stream.wasReady === false) {

				stream.wasReady = stream.setCurrentTime(stream.isPlaying.start);

			// Stream Reset / Stop
			} else if (stream.isPlaying && stream.wasReady){

				if (streamPosition > stream.isPlaying.end) {

					if (stream.isPlaying.loop === true) {
						stream.play(stream.isPlaying.start, true);
					} else {
						stream.stop();
					}

				}

			// Queue Functionality
			} else if (!stream.isPlaying && stream.wasReady === true && this.__queue.length && this.__queue[0].origin === stream.id) {

				var queueEntry = this.__queue[0];
				this.__queue.splice(0, 1);
				stream.play(queueEntry.pointer, true);

			// Nothing to do, so repeat backgroundMusic for Single-Channel Mode
			} else if (stream.__backgroundMusic && !stream.isPlaying) {
				if (streamPosition > stream.__backgroundMusic.end) {
					stream.__backgroundHackForiOS();
				}
			}

		}


	},

	__getStreamById: function(id) {

		for (var s = 0, l = this.__streams.length; s < l; s++) {

			var stream = this.__streams[s];
			if (stream.id === id) {
				return stream;
			}

		}

		return null;

	},

	__createChannel: function(settings, origin) {

		var newSettings = {};
		for (var s in settings) {
			newSettings[s] = settings[s];
		}
		newSettings.autoplay = false;

		var newStream = new JukeBox(newSettings, origin);
		newStream.isChannel = true;
		newStream.wasReady = true;

		this.__streams.push(newStream);

	},


	/*
	 * PUBLIC API
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

	},

	addQueueEntry: function(pointer, streamId) {

		this.__queue.push({
			pointer: pointer,
			origin: streamId
		});

	}


};

