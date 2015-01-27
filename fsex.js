(function(){

var fs = require('fs');
var path = require('path');

exports.readdirRSync = function(dirPath){

	var walk = function(dir){
	    var results = [];
	    var list = fs.readdirSync(dir);
	    list.forEach(function(file) {
			file = dir + '/' + file
			var stat = fs.statSync(file)
			if ( stat && stat.isDirectory() ){
				results = results.concat(walk(file));
			} else {
				results.push(file);
			}
	    });
	    return results;
	};

	return walk(dirPath);

};

exports.copy = function(srcPath, destPath, callback){
	fs.readFile(srcPath, function(err, data){
		fs.writeFile(destPath, data, callback);
	});
};

exports.copySync = function(srcPath, destPath){
	try {
		fs.writeFileSync(destPath, fs.readFileSync(srcPath));
	} catch(e) {
		throw e;
	}
};

exports.copyRSync = function(srcPath, destPath){

	var walk = function(src, dest){
		var exists = fs.existsSync(src);
		var stats = exists && fs.statSync(src);
		var isDirectory = exists && stats.isDirectory();
		if (exists && isDirectory) {
			fs.mkdirSync(dest);
			fs.readdirSync(src).forEach(function(childItemName) {
				walk(path.join(src, childItemName), path.join(dest, childItemName));
			});
		} else {
			exports.copySync(src, dest);
		}
	};

	return walk(srcPath, destPath);
};

exports.rmdirRSync = function(dirPath){

	var walk = function(dir){
		var list = fs.readdirSync(dir);
		for( var i = 0; i < list.length; i++ ) {
			var filename = path.join(dir, list[i]);
			var stat = fs.statSync(filename);
			
			if(filename == "." || filename == "..") {
				// do nothing
			} else if(stat.isDirectory()) {
				walk(filename);
			} else {
				try {
					fs.unlinkSync(filename);
				} catch(e) {
					throw e;
				}
			}
		}
		try {
			fs.rmdirSync(dir);
		} catch(e) {
			throw e;
		}
	};

	return walk(dirPath);

};

})();