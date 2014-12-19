var util    = require('util'),
	path    = require('path'),
	fs      = require('fs');

exports = function( text ){
	var result = {};

	// 改行コードがWindows(CR+LF)の場合はUNIX(LF)に置換
	text = text.replace(/\r\n/g, '\n');

	text.split('\n').forEach(function(thisRow){
		var thisPair = thisRow.split('=');
		if( thisPair.length >= 2 ){
			if (thisPair[0] == 'messageLayerColor' || thisPair[0] == 'messageLayerDefaultFontColor' || thisPair[0] == 'defaultLinkColor' || thisPair[0] == 'historyLayerFontColor' || thisPair[0] == 'historyLayerColor' || thisPair[0] == 'backgroundColor') {
				result[thisPair[0]]=thisPair[1].replace(/#/g, '0x');
			} else if (thisPair[0] == 'messageLayerOpacity' || thisPair[0] == 'historyLayerOpacity') {
				result[thisPair[0]]=(function(){
						var num = Number(thisPair[1]) * 256;
						if (typeof num != 'number') {
							return String(0);
						} else if (num > 256) {
							return String(256);
						} else if (num < 0) {
							return String(0);
						} else {
							return String(num);
						}
					})();
			} else {
				result[thisPair[0]]=thisPair[1];
			}
		}
	});

	return result;
}

//commonjs用のfunction
exports.main = function commonjsMain(args) {
	if ( !args[0] ) {
        console.log('ファイルが必要です：Usage: makefileToConfig.js FILE');
        process.exit(1);
    }
    var file = args[0];
    var text = fs.readFileSync(path.normalize(file), "utf8");
	return JSON.stringify(exports(text));
}

//Util
String.prototype.isOneOf = function(strings){
	if(typeof strings === "string"){
		strings = [strings];
	}
	for(var i = 0; i < strings.length; i++ ){
		if(this == strings[i]){
			return true;
		}
	}
	return false;
}

if (typeof module !== 'undefined' && require.main === module) {

	//コマンドラインから直接呼ばれた時
	try{
		var result = exports.main([process.argv[2]]);
		util.print(result);
	}catch(e){
		console.error(e);
	}
}