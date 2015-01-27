exports.error = function(msg) {
	console.log('[err] ' + msg);
	process.exit();
}

exports.warn = function(msg) {
	console.log('[wrn] ' + msg);
}

exports.message = function(msg) {
	console.log('[msg] ' + msg);
}

exports.end = function(msg) {
	console.log('[end] ' + msg);
	process.exit();
}
