/*
 * @constructor This will create a FLASH stream instance with given settings.
 * @returns {Object} The created FLASH stream instance that contains the context, a spritemap and attached playback methods.
 */
Jukebox.FlashStream = function(resource, settings, features) {

	this.id = settings.id || 'jukebox-flashstream-1337';

	var flashVars = [
		'id=' + this.id,
		'autoplay=' + (settings.autoplay === true ? 'true' : 'false'),
		'file=' + window.encodeURIComponent(resource)
	];

	// NOT the crappy IE-part
	var context;
	if (!navigator.userAgent.match(/MSIE/)) {

		context = document.createElement('embed');

		context.id = this.id;
		context.setAttribute('name', this.id);
		context.setAttribute('play', 'false');
		context.setAttribute('loop', 'false');
		context.setAttribute('quality', 'high');
		context.setAttribute('allowScriptAccess', 'always');
		context.setAttribute('type', 'application/x-shockwave-flash');
		context.setAttribute('pluginspage', 'http://get.adobe.com/flashplayer/');
		context.setAttribute('src', settings.flashPlayer ? settings.flashPlayer : './swf/FlashMediaElement.swf');

		// required on the dark side of ECMA
		context.setAttribute('flashvars', flashVars.join('&'));
		context.setAttribute('width', '0');
		context.setAttribute('height', '0');

		// maybe unnecessary, but seems to be required on old IEs
		context.setAttribute('bgcolor', '#000000');
		context.setAttribute('wmode', 'transparent');

		this.context = context;

		// Flash Player has to be appended to the site, otherwise the context won't be accessible on the good side of ECMA
		document.getElementsByTagName('body')[0].appendChild(this.context);


	// Crappy IE part
	} else {

		context = document.createElement('div');
		document.getElementsByTagName('body')[0].appendChild(context); // needs to be done this way with outerHTML on the appended element

		context.outerHTML =
		'<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ' +
		'id="' + this.id + '" width="0" height="0">' +
		'<param name="movie" value="' + (settings.flashPlayer ? settings.flashPlayer : './swf/FlashMediaElement.swf') + '?x=' + (+new Date()) + '" />' +
		'<param name="flashvars" value="' + flashVars.join('&amp;') + '" />' +
		'<param name="quality" value="high" />' +
		'<param name="bgcolor" value="#000000" />' +
		'<param name="wmode" value="transparent" />' +
		'<param name="allowScriptAccess" value="always" />' +
		'<param name="allowFullScreen" value="true" />' +
		'</object>';

		this.context = document.getElementById(this.id);

	}

	// cache the spritemap
	if (typeof settings.spritemap === 'object') {
		this.spritemap = settings.spritemap;
	}

	return this;

};



Jukebox.FlashStream.prototype = {

	/**
	 * This function plays a stream. It accepts either a spritemap entry's name or a direct seconds-based position value in the stream.
	 * @param {Number|String} to The spritemap entry or the position value in seconds
	 */
	play: function(to) {

		// No queueing support for now on the ActionScript-side

		var position;

		// skip last playback and start the new one immediately
		// FlashMediaElement is currently without multistream support!
		if (this._playing) {
			this.stop();
		}

		// play via spritemap position
		if (this.spritemap && this.spritemap[to]) {

			position = this.spritemap[to].start;

			// 1:20:10 -> 80.10
			if (typeof position === 'string' && position.match(/:/)) {

				var tmp = position.split(':');
				position = parseInt(0, 10); // integer required!

				tmp[0] = parseInt(tmp[0], 10) * 60; // minutes
				tmp[1] = parseInt(tmp[1], 10); // seconds
				tmp[2] = parseInt(tmp[2], 10) / 60; // milliseconds (-> format: s.ms)

				position += tmp[0] + tmp[1] + tmp[2];

			}

		// play via position number
		} else if (typeof to === 'number') {

			position = to;

			// find matching spritemap entry
			for (var s in this.spritemap) {
				if (position >= this.spritemap[s].start && position <= this.spritemap[s].end) {
					to = s;
					break;
				}
			}

		}

		// return if we didn't find matching spritemap entry
		if (position === undefined || !to) {
			return false;
		}

		// cache the spritemap entry's details for quicker access
		this._playing = this.spritemap[to];

		this.context.play();
		this.context.setCurrentTime(position);

		// locking the stream due to slow reaction on mobile devices
		this.locked = true;

	},

	/**
	 * This function stops the playback of a stream.
	 * It will reset the current position of the played audio stream to 0.
	 */
	stop: function() {

		this.__lastPointer = 0; // reset pointer
		this._playing = undefined;
		this.locked = false;

		// is the background started already?
		this.context.pause();

	},

	/**
	 * This function pauses the playback of a stream.
	 * It will save the current position of the played audio stream. This saved position is used by resume()
	 */
	pause: function() {

		this.__lastPointer = this.currentTime;
		this.context.pause();

	},

	/**
	 * This function resumes the playback of a stream using the last saved position of the audio stream.
	 * Depending on its value, the playback starts on its position in the stream.
	 */
	resume: function() {

		// only set play position in spritemap if we got a last pointer (set by pause())
		if (this.__lastPointer !== undefined) {
			this.play(this.__lastPointer);
			this.__lastPointer = undefined;

		} else {
			this.context.play();
		}

	},

	setVolume: function(value) {

		value = parseFloat(value);
		if (value) {
			this.context.setVolume(value);
		}

	},

	getCurrentTime: function() {
		// avoid exceptions, wait for JavaScript API to be ready
		if (typeof this.context.getCurrentTime === 'function') {
			return this.context.getCurrentTime();
		}

		return 0;
	},

	setCurrentTime: function(value) {
		// avoid exceptions, wait for JavaScript API to be ready
		if (typeof this.context.setCurrentTime === 'function') {
			return this.context.setCurrentTime(value);
		}

		return false;
	}

};
