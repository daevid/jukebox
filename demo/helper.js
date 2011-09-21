
function stopStreams(streams) {
	for (var i = 0; i < streams.length; i++) {
		streams[i].stop();
	}
}

function volumeStreams(streams, value) {
	for (var i = 0; i < streams.length; i++) {
		if (streams[i].context) {
			streams[i].setVolume(value);
		}
	}
}

// debug functionality for demo
window.setInterval(function() {

	var debug = [],
		stream;

	for (var i = 0; i < myStreams.length; i++) {
		stream = myStreams[i];
		debug.push(myStreams[i].id + ' is a ' + (stream.isLocked ? 'locked ' : ' ') + (stream.isChannel ? ('channel of ' + stream.origin) : 'stream') + ' and ' + (stream._playing ? 'playing' : 'idling') + ' at ' + stream.getCurrentTime());
	}

	document.getElementById('debug').innerHTML = debug.join('<br>');

}, 200);

