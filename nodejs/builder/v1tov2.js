var util    = require('util'),
	path    = require('path'),
	fs      = require('fs'),
	config  = require('../config.js').config,
	command = require('commander');

command
  .option('-k, --kag [value]', 'KAGを出力する', './')
  .parse(process.argv);

exports = function( original ){
	var result = {};

	result.config = original.mkf;

	result.soundlist = original.soundlist;
	result.imagelist = original.imagelist;
	result.videolist = original.videolist;

	var scripts = {},
		currentScriptFileName = '',
		firstScriptName = undefined;

	for( var i = 0; i < original.script.length; i++ ){
		var _tag = original.script[i];
		var thisTag = [];

		if( _tag.name == "label" ){
			if( _tag.vars.name && _tag.vars.name.val ){
				var labelVal = _tag.vars.name.val.split("__");

				if( labelVal[2] == "" ){
					//this is a new file
					currentScriptFileName = labelVal[1];
					if( !firstScriptName ){
						firstScriptName = currentScriptFileName;
					}
				}
			}
		}

		if( !scripts[currentScriptFileName] ){
			scripts[currentScriptFileName] = [];
		}

		thisTag[ config.scriptTagNameKey ] = _tag.name; //name
		var thisArgs = {};      //args

		for( var key in _tag.vars ){
			var _var = _tag.vars[key];

			switch( _var.type ){
				case 'entity':
					thisArgs[ key ] = '&'+_var.val;
					break;
				case 'var':
					thisArgs[ key ] = '%'+_var.val;
					if( _var['default'] ){
						thisArgs[ key ] += "|"+ _var['default'];
					}
					break;
				default:
					thisArgs[ key ] = _var.val;
			}

			if( key === "*" ){
				thisArgs[ '*' ] = 1;
			}
		}

		switch( thisTag[ config.scriptTagNameKey ] ){
			case 'label':
				var nameVal = thisArgs.name.split('__');
				if( nameVal[2] == "" ){
					continue;
				}
				nameVal.splice(0,2)
				thisArgs.name = nameVal.join("__")
				break;

			case 'button':
			case 'call':
			case 'click':
			case 'jump':
			case 'rclick':
			case 'return':
				if( !thisArgs.storage && thisArgs.target ){
					thisArgs.storage = thisArgs._file;
				}
				delete thisArgs._file;
				break;

			case 'move':
				var rename = {
					afx: 'o2_orx',
					afy: 'o2_ory',
					affine: 'o2_path'
				}
				for( var key in rename ){
					if( key in thisArgs ){
						thisArgs[rename[key]] = thisArgs[key];
						delete thisArgs[key];
					}
				}
				break;
		}

		thisTag[ config.scriptTagArgsKey ] = thisArgs;

		scripts[currentScriptFileName].push( thisTag );
	}

	result.scripts = scripts;

	if( !scripts['first.ks'] ){
		var jumpTag = [];
		jumpTag[ config.scriptTagNameKey ] = "jump";
		jumpTag[ config.scriptTagArgsKey ] = {
			storage: firstScriptName
		}
		result.scripts['first.ks'] = [ jumpTag ];
	}

	return result;
}

//commonjs用のfunction
exports.main = function commonjsMain(args) {
	if ( !args[0] ) {
        console.log('ファイルが必要です：Usage: v1tov2.js FILE');
        process.exit(1);
    }
    var file = args[0];
    var text = fs.readFileSync(path.normalize(file), "utf8");
    var obj = JSON.parse( text );

    var v2Obj = exports( obj );

    if( !command.kag ){
		return JSON.stringify( v2Obj );
	}

	fs.writeFile( path.join( command.kag, 'config.json' ), JSON.stringify( v2Obj.config ) );
	for( var filename in v2Obj.scripts ){
		fs.writeFile( path.join( command.kag, filename), jsonFileToKagFile( v2Obj.scripts[filename] ) );
	}
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

function jsonFileToKagFile( json ){
	var result = "";

	for( var i = 0; i < json.length; i++ ){

		var thisTag = json[i],
			thisTagName = thisTag[ config.scriptTagNameKey ],
			thisTagArgs = thisTag[ config.scriptTagArgsKey ];

		switch( thisTagName ){
			case 'text':
				result += thisTagArgs.text;
				break;

			case 'label':
				result += "\n*"+thisTagArgs.name+"\n";
				break;
			default:
				result+="["+thisTagName;

				if( Object.keys(thisTagArgs).length ){
					for( var argName in thisTagArgs ){
						result+=" "+argName+"=\""+thisTagArgs[argName]+"\"";
					}
				}
				result+="]";

				if( thisTagName === "endmacro" ){
					result += "\n";
				}
		}

		result+="\n";
	}

	return result;
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