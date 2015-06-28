var util    = require('util'),
	fs      = require('fs'),
	path    = require('path'),
	config  = require('../config.js').config,
	command = require('commander');

command
  .option('-l, --legacy', 'Legacyモードを使う')
  .option('-r, --release', 'Releaseモードを使う')
  .parse(process.argv);

var Tag = function(){
	this.name = undefined;
	this.args = {};
	this.lineNumber = undefined;
	this.charNumber = undefined;
	this.callbackArgs = [];
	this.isOpen = false;
	this.isClose = false;
	this.isDependency = false;
}

Tag.prototype.toJSON = function(){
	var result = []; // {}にすると体積が増えるので
	result[config.scriptTagNameKey] = this.name;
	if(Object.keys(this.args).length){
		result[config.scriptTagArgsKey] = this.args;
	}else{
		result[config.scriptTagArgsKey] = 0;
	}
	result[config.scriptTagDependencyKey] = this.isDependency? 1 : 0;
	if( !command.release || // 開発モードはlineNumberとcharNumberを入れる必要があるので、argsなくてもとりあえず0を入れる	
		this.isOpen ){
		result[config.scriptTagCallbackArgsKey] = this.isOpen? this.callbackArgs : 0;
	}
	if( !command.release ){
		result[config.scriptTagLineKey] = this.lineNumber;
		result[config.scriptTagCharKey] = this.charNumber;
	}
	if( this.isClose ){
		result[config.scriptTagNameKey] = "/";
	}
	for (var i = result.length - 1; i >= 0; i--) {
		var thisValue = result[i];
		if( thisValue === 0 || thisValue == null ){
			result.splice(i,1)
		} else {
			break;
		}
	}
	return result;
}

var TagBuilder = function(tagArray){

	var INPUT_MODE_NONE              = 0,
		INPUT_MODE_NAME              = 1,
		INPUT_MODE_ATTR_NAME         = 2,
		INPUT_MODE_ATTR_VALUE        = 3,
		INPUT_MODE_CALLBACK_ARGS     = 4,
		INPUT_MODE_CALLBACK_ARGS_END = 5;

	this.currentTag = undefined;

	var inputMode = INPUT_MODE_NONE,
		attrNameBuffer = undefined,
		attrValueBuffer = undefined,
		currentStack = [];

	this.startTag = function(lineNumber,charNumber){
		if(this.currentTag != undefined){
			throw 'すでにタグ定義中です。';
		}
		this.currentTag = new Tag();
		this.currentTag.lineNumber = lineNumber;
		this.currentTag.charNumber = charNumber;
		inputMode = INPUT_MODE_NONE;
	}

	this.appendTagName = function(string){
		if( !this.currentTag ){
			throw 'タグの外でタグ名前を登録しようとしてる'
		}
		if( inputMode > INPUT_MODE_NAME ){
			throw '今はタグ名を指定できない。';
		}
		inputMode = INPUT_MODE_NAME;

		if( this.currentTag.name === undefined ){
			this.currentTag.name = string;
		}else{
			this.currentTag.name += string;
		}
	}

	this.appendAttrName = function(string){
		if( !this.currentTag ){
			throw 'タグ外で属性名を登録しようとしています';
		}
		if( this.currentTag.isClose ){
			throw '閉じタグに属性を入れてはいけません。';
		}
		if( inputMode === INPUT_MODE_ATTR_VALUE ){

			if( !attrValueBuffer ){
				//もし今はvalueを指定していれば、つまり：
				//[aa bb cc=dd] みたいな感じで、bbはvalueなしな状態です。
				//ですからbbをendAttrValueをして、ccの登録を始まります。
				this.endAttrValue();
			}else{
				throw '属性の値を入れた後に属性名を変えようとしています';
			}
		}
		inputMode = INPUT_MODE_ATTR_NAME;

		if( !attrNameBuffer ){
			attrNameBuffer = "";
		}
		attrNameBuffer += string;
	}
	this.endAttrName = function(){
		inputMode = INPUT_MODE_ATTR_VALUE;
	}

	this.appendAttrValue = function(string){
		if( !this.currentTag ){
			throw 'タグ外で属性値を登録しようとしています';
		}
		inputMode = INPUT_MODE_ATTR_VALUE;
		if( !attrValueBuffer ){
			attrValueBuffer = "";
		}
		attrValueBuffer +=string;
	}
	this.endAttrValue = function(){
		if( typeof attrNameBuffer === "undefined" ){
			throw '属性名を指定していません';
		}

		// [aa bb]の時、bbの値をnullにします。closeTagの時でtrueにする。
		// true以外の値にしたい時はcloseする前に変わってください。
		// 属性の値は文字列のみですので、nullは確実にこの場合でしか使われてないので安全です。
		if( typeof attrValueBuffer === "undefined" ){
			attrValueBuffer = null;
		}
		this.currentTag.args[attrNameBuffer] = attrValueBuffer;

		attrNameBuffer = undefined;
		attrValueBuffer = undefined;
		inputMode = INPUT_MODE_NONE;
	}

	this.appendCallbackArgs = function(string){
		if( inputMode === INPUT_MODE_CALLBACK_ARGS ){
			var lastIndex = this.currentTag.callbackArgs.length-1;
			this.currentTag.callbackArgs[ lastIndex ] += string;
		} else {
			inputMode = INPUT_MODE_CALLBACK_ARGS;
			this.currentTag.callbackArgs.push(string);
		}
	}
	this.endCallbackArgs = function(){
		inputMode = INPUT_MODE_CALLBACK_ARGS_END;
	}

	this.markAsDependency = function(){
		this.currentTag.isDependency = true;
	}
	this.markAsOpenTag = function(){
		this.currentTag.isOpen = true;
	}
	this.markAsCloseTag = function(){
		this.currentTag.isClose = true;
	}

	this.closeTag = function(){
		if( !this.currentTag ){
			throw 'タグ中ではありません';
		}
		if( inputMode == INPUT_MODE_ATTR_VALUE || inputMode == INPUT_MODE_ATTR_NAME ){
			this.endAttrValue();
		}
		if( !this.currentTag.name && !this.currentTag.isClose ){  // [/]名前のないcloseTagは自動的に対応します
			throw 'タグ名がありません';
		}
		if( this.currentTag.isOpen && this.currentTag.isClose ){
			throw 'close tagにcallbackは指定できないです';
		}

		if( this.currentTag.isOpen ){
			currentStack.push( this.currentTag.name );
		} else if ( this.currentTag.isClose ){
			var nearestStack = currentStack.pop();
			if( !nearestStack ){
				throw 'ここで閉じられるタグがないです';
			}
			if( this.currentTag.name && 
				nearestStack !== this.currentTag.name ){

				throw 'ここは'+nearestStack+'を閉じるべきですが、'+this.currentTag.name+'を閉じてます';
			} else {
				this.currentTag.name = nearestStack;
			}
		}

		//[aa bb]で、bbの値をtrueにします
		for( var argName in this.currentTag.args ){
			if( this.currentTag.args[ argName ] === null ){
				this.currentTag.args[ argName ] = "true";
			}
		}

		this.currentTag.name = this.currentTag.name.toLowerCase();
		tagArray.push(this.currentTag);
		this.resetTag();
	}

	this.currentTagName = function(){
		if(!this.currentTag)return undefined;
		return this.currentTag.name;
	}

	this.resetTag = function () {
		this.currentTag = undefined;
		inputMode = INPUT_MODE_NONE;
	}
}

// Tagモード
var TAG_MODE_NONE     = 0, //タグの外
	TAG_MODE_BRACKET  = 1, //タグの中、[]スタイル
	TAG_MODE_AT       = 2, //タグの中、@スタイル
	TAG_MODE_TEXT     = 3, //タグの中、テキストタグ
	TAG_MODE_LABEL    = 4; //タグの中、*ラベル

// 属性モード
var ATTR_MODE_NONE        = 0, //属性検出してない
	ATTR_MODE_TAG_NAME    = 1,
	ATTR_MODE_NAME        = 2, //属性名を検出している
	ATTR_MODE_NAME_END    = 3, //属性名を検出するの終わったが、「=」がまだない場合
	ATTR_MODE_VALUE_START = 4, //属性名を検出した、「=」を見つかったが、valueはまだない場合
	ATTR_MODE_NO_QUOTE    = 5, //属性内容を検出している、「"」なし	
	ATTR_MODE_QUOTE       = 6, //属性内容を検出している、「"」あり
	ATTR_MODE_CALLBACK    = 7,
	ATTR_MODE_CALLBACK_ARG= 8;

// 文法モード
var SYNTAX_MODE_STANDARD = 0,
	SYNTAX_MODE_LEGACY   = 1;


var syntaxMode = SYNTAX_MODE_STANDARD;
if(command.legacy){
	syntaxMode = SYNTAX_MODE_LEGACY;
}

var warnings = [];
var lastLabelName = undefined;
var lastLabelEmptyCount = undefined;

/**
 * @param script {String}  KAGの文字列
 * @param filename {String}
 *
 * @return result.scripts {Tag[]}
 *         result.warnings {String[]}
 */

exports.parse = function(script,filename){
	script = script.replace(/\r\n|\r/g, "\n");
	script += '\n'; //最後の改行を追加、これで最後のタグがちゃんと終わります

	var tagMode = TAG_MODE_NONE,
		attrMode = ATTR_MODE_NONE,

		parsedTags = [],
		tagBuilder = new TagBuilder(parsedTags),

		lineNumber = 1,
		charNumber = 1;

	warnings = [];

	function calculateLocation(original,toIndex){
		//original+1は、この文字は\nである場合、それはすでに数えられましたので、スキップします
		for(var j = original+1; j <= toIndex; j++){
			var thisChar = script.charAt(j);
			if( thisChar == '\n'){
				lineNumber++;
				charNumber = 0;
			}else{
				charNumber++;
			}
		}
	}

	try {
		for( var i = 0; i < script.length; i++ ){
			//文字を一つ一つチェックします

			if( script.charCodeAt(i) == 65279 )continue;

			var currentChar = script.charAt(i);
			var nextChar = script.charAt(i+1);

			if( currentChar == "〜" ){ //mac version
				currentChar = "～";    // window version  Ref #30
			}

			charNumber ++;
			if( currentChar == '\n' ){
				lineNumber++;
				charNumber = 0;
			}

			/*
			 * iscript対策
	 		 * タグが閉じる時、名前がiscriptであれば反応します。
			 * 複数行のコメントをiscript扱い。
			 */
			var currentTagName = tagBuilder.currentTagName();
			if( //まずはタグが閉じる時のみ反応する
				(attrMode != ATTR_MODE_QUOTE &&                                          //"属性をくくってない
				(tagMode == TAG_MODE_AT && currentChar === '\n' ||                       //@スタイルで改行
				 tagMode == TAG_MODE_BRACKET && currentChar === ']') &&                  //[]スタイルで]がある時
				currentTagName && currentTagName.isOneOf(['iscript','o2_iscript'])) ||   //iscriptタグの場合
				//あるいは /* コメントの時も反応する
				(attrMode != ATTR_MODE_QUOTE && currentChar == '/' && nextChar == '*') ){         // /*の場合

				tagBuilder.resetTag();
				tagMode = TAG_MODE_NONE;
				tagMode = ATTR_MODE_NONE;

				var scriptLeft = script.substr(i);

				var targetRegex;
				var missingCloseMessage;
				switch( currentTagName ){
					case 'iscript':
						targetRegex = /[@|\[][\t|\s]*endscript[\t|\s]*]?/;
						missingCloseMessage = '[ERROR100] iscriptタグに対応するendscriptタグが見つかりません';
						break;
					case 'o2_iscript':
						targetRegex = /[@|\[][\t|\s]*o2_endscript[\t|\s]*]?/;
						missingCloseMessage = '[ERROR101] o2_iscriptに対応するo2_endscriptが見つかりません';

						break;
					default:
						targetRegex = /\*\//;
						missingCloseMessage = '[ERROR102] 複数行コメントが閉じられていません';
						break;
				}

				var matches = scriptLeft.match(targetRegex);

				if( !matches || !matches.length ){
					throw missingCloseMessage;
				}

				if( currentTagName == 'o2_iscript' ){
					//スキップしたテキストをevalタグにします
					var skippedText = script.substring(i+1,matches.index+i);

					tagBuilder.startTag( lineNumber, charNumber );
					tagBuilder.appendTagName('o2_iscript');
					tagBuilder.appendAttrName('o2_exp');
					tagBuilder.appendAttrValue(skippedText);
					tagBuilder.closeTag();
				}

				var matchString = matches[0];

				//+=はscriptLeftの長さはsubstrで、scriptの長さの違うだからです
				var targetLocation = i + matches.index + matchString.length -1;
				calculateLocation(i,targetLocation);
				i = targetLocation;

				continue;
			}

			/*
			 * コメント
			 *
			 * コメントにあったら、行末までスキップ。
			 *
			 * コメントが成立する条件：
			 *   legacyモード：
			 *     行末から;は全部tab
			 *   standardモード：
			 *     quote以外のところ
			 */
			if( currentChar === ';' ){
				var isComment = (function(){
					if( syntaxMode == SYNTAX_MODE_LEGACY ){
						//legacyモード
						if( i==0 ){
							return true;
						}
						for(var j = i-1 ; j >= 0; j--){
							var thisChar = script.charAt(j);
							if( thisChar == '\n'){
								return true;
							}
							if( thisChar != '\t' ){
								return false;
							}
						}
					}else{
						//standardモード
						if( attrMode != ATTR_MODE_QUOTE ){
							return true;
						}
					}
					return false;
				})();
				if( isComment ){
					var targetIndex = (function(){
						for( var j = i; j < script.length; j++ ){
							if( script.charAt(j) == '\n' ){
								return j;
							}
						}
						return -1;
					})();
					if( targetIndex != -1 ){
						//forループが+1をするから
						calculateLocation( i, targetIndex-1 );
						i = targetIndex-1;

						continue;
					}
				}
			}

			/*
			 * タグ解析始まります
			 */

			if( tagMode === TAG_MODE_NONE ){

				if( currentChar === '@' ){
					tagMode = TAG_MODE_AT;
					tagBuilder.startTag( lineNumber, charNumber );
					continue;

				}else if( currentChar === '[' ){

					//KAGは [[ABC[[]]を入力すると、[ABC[]]が出力します。
					//どうやら[[が[になります。
					//その場合はcontinueせず、そのまま実行する。
					//そうするとtextタグと見なされます。そこで処理します。
					if( nextChar != '[' ){
						tagMode = TAG_MODE_BRACKET;
						tagBuilder.startTag( lineNumber, charNumber );
						continue;
					}

				}else if( currentChar === '*' ){
					tagBuilder.startTag( lineNumber, charNumber );
					tagMode = TAG_MODE_LABEL;
						
					tagBuilder.appendTagName('label');
					tagBuilder.appendAttrName('name');
					continue;

				}
				if( !currentChar.isOneOf(['\t','\n']) ||
					(currentChar == '[' && nextChar == '[') ){ //半角スペースとtab
					tagMode = TAG_MODE_TEXT;

					tagBuilder.startTag( lineNumber, charNumber );
					tagBuilder.appendTagName('text');
					tagBuilder.appendAttrName('text');
					tagBuilder.endAttrName();
					tagBuilder.appendAttrValue(currentChar);

					//KAGは [[ABC[[]]を入力すると、[ABC[]]が出力します。
					//どうやら[[が[になります。
					//ここで先１charをスキップして、[[が[になる。
					if(currentChar == '[' && nextChar == '['){
						i++;
					}
				}

			}else{
				//タグの中

				/*
				 * 特別な書き方
				 */

				//textタグのスペシャル処理
				if( tagMode === TAG_MODE_TEXT ){

					var nextNextChar = script.charAt(i+2);

					if( currentChar == '[' ){

						if( nextChar == '['){
							//KAGは [[ABC[[]]を入力すると、[ABC[]]が出力します。
							//どうやら[[が[になります。
							//ここで先１charをスキップして、[[が[になる。
							i++;
							tagBuilder.appendAttrValue(currentChar);

						}else{
							// text[abc] の場合
							tagBuilder.closeTag();
							tagMode = TAG_MODE_NONE;
							attrMode = ATTR_MODE_NONE;

							//もう一回同じ文字、つまり「[」をチェックします。
							//そうすると新しいタグが開きます。
							i--;
						}
					}else if( currentChar == '\n' || nextChar =='\t'){

						tagBuilder.closeTag();
						tagMode = TAG_MODE_NONE;
						attrMode = ATTR_MODE_NONE

					}else{
						tagBuilder.appendAttrValue(currentChar);
					}
					continue;
				}

				//labelタグのスペシャル処理
				if( tagMode === TAG_MODE_LABEL ){

					if( currentChar == '\n' ){

						tagBuilder.endAttrValue();
						
						if( tagBuilder.currentTag.args.name === null ){

							if( lastLabelEmptyCount === undefined ){
								throw 'シナリオの最初のラベルは名前が必要です。';
							}
							lastLabelEmptyCount++;
							tagBuilder.currentTag.args.name = lastLabelName+":"+lastLabelEmptyCount;
						}else{

							lastLabelEmptyCount = 1;
							lastLabelName = tagBuilder.currentTag.args.name;
						}
						if( tagBuilder.currentTag.args.caption === null ){
							tagBuilder.currentTag.args.caption = "";
						}

						tagBuilder.closeTag();
						tagMode = TAG_MODE_NONE;

					}else if( currentChar == '|' ){

						tagBuilder.endAttrValue();
						tagBuilder.appendAttrName('caption');

					}else{
						tagBuilder.appendAttrValue(currentChar);
					}
					continue;
				}

				/*
				 * タグの終わりを検出
				 */
				if( attrMode != ATTR_MODE_QUOTE &&                         //"属性をくくってない
					(tagMode == TAG_MODE_AT && currentChar === '\n' ||     //@スタイルで改行
					 tagMode == TAG_MODE_BRACKET && currentChar === ']')){ //[]スタイルで]が来た

					tagBuilder.closeTag();

					tagMode = TAG_MODE_NONE;
					attrMode = ATTR_MODE_NONE;
				}

				/*
				 * Legacyモードではタグの中改行できないので、これでエラーを吐く
				 */
				else if( syntaxMode == SYNTAX_MODE_LEGACY && currentChar == '\n' ){
					if( attrMode == ATTR_MODE_QUOTE ){
						throw '[ERROR201] KAG3互換文法モードではタグや値の中で改行することはできません';
					}else{
						throw '[ERROR200] KAG3互換文法モードではタグの中で改行することはできません';
					}
				}
				/*
				 * callbackを閉じるタグの/を処理する
				 * [/foreach]  @/foreach みたいな感じ
				 *  ^           ^
				 */
				else if( attrMode === ATTR_MODE_NONE &&
					!tagBuilder.currentTagName() &&
					currentChar === "/" ){

					tagBuilder.markAsCloseTag();
				}
				/**
				 * dependency文法
				 * [image]
				 * [> pimage]
				 */
				else if( attrMode === ATTR_MODE_NONE &&
					!tagBuilder.currentTag.name &&
					currentChar === ">" ){
					tagBuilder.markAsDependency();
				}
				/* 
				 * タグ名
				 */
				//タグの始まりから名前登録へ
				else if( attrMode === ATTR_MODE_NONE &&
					!tagBuilder.currentTag.name &&
					!currentChar.isOneOf([' ','\t','\n'])){ //半角スペースとtab

					attrMode = ATTR_MODE_TAG_NAME;
					tagBuilder.appendTagName(currentChar);
					
				}
				//タグ名を登録途中
				else if( attrMode === ATTR_MODE_TAG_NAME ){ 

					//スペースであれば登録解除
					if( currentChar.isOneOf([' ','\t','\n']) ){
						//タグ名登録解除
						attrMode = ATTR_MODE_NONE;
					}else{
						tagBuilder.appendTagName(currentChar);
					}
				}

				/*
				 * 属性名を読み込む
				 */

				 // 読み込んでない状態から読み込む状態へ
				else if( attrMode === ATTR_MODE_NONE &&
					!currentChar.isOneOf([' ','\t','\n','(','-'])){ //空白とタブ、callback argumentでもない場合

					attrMode = ATTR_MODE_NAME;
					tagBuilder.appendAttrName(currentChar);
				}
				// すでに読み込んでる状態で、さらに読み込む
				else if( attrMode === ATTR_MODE_NAME ){

					if(currentChar.isOneOf([' ','\t','\n'])){
						// [aa bb = cc]
						//       ^この空白である場合
						attrMode = ATTR_MODE_NAME_END;
					}else if( currentChar === '=' ){
						// [aa bb=cc]　の場合
						attrMode = ATTR_MODE_VALUE_START;
					}else{
						tagBuilder.appendAttrName(currentChar);
					}
				}
				else if( attrMode === ATTR_MODE_NAME_END ){

					// [aa bb = cc]
					//        ^この「=」である場合
					if( currentChar === '=' ){
						attrMode = ATTR_MODE_VALUE_START;

					// [aa bb cc = dd]
					//        ^この場合、bbの値をtrueにするべき
					}else if( !currentChar.isOneOf(['\t',' ','\n']) ){
						tagBuilder.endAttrValue();
						attrMode = ATTR_MODE_NONE;
						//属性の名前を登録するため、前の文字に戻る
						i--;
					}
				}

				/*
				 * 属性値を読み込む
				 */

				// 属性値を読み始まる
				else if( attrMode === ATTR_MODE_VALUE_START &&
					!currentChar.isOneOf([' ','　','\n'])){

					if( currentChar === '"'){
						// [aa bb="cc"]の場合
						attrMode = ATTR_MODE_QUOTE;
						//appendしないと、valueがないと見なされ、自動的にtrueになります
						tagBuilder.appendAttrValue("");
					}else{
						// [aa bb=cc]の場合
						attrMode = ATTR_MODE_NO_QUOTE;
						tagBuilder.appendAttrValue(currentChar);
					}
				}

				else if( attrMode === ATTR_MODE_QUOTE ){
					
					// ` があったらエスケープします	
					if (currentChar.isOneOf(['`'])) {
						tagBuilder.appendAttrValue(nextChar);
						i += 1;

					//"以外は全部読む
					} else if(currentChar.isOneOf(['"'])){
						attrMode = ATTR_MODE_NONE;
						tagBuilder.endAttrValue();

					}else{
						tagBuilder.appendAttrValue(currentChar);
					}
				}

				// 「"」がない場合、属性値を読み込む
				else if( attrMode === ATTR_MODE_NO_QUOTE ){
					//スペースとtab以外は全部読む
					if(currentChar.isOneOf([" ","\t","\n"])){
						attrMode = ATTR_MODE_NONE;
						tagBuilder.endAttrValue();
					}else{
						tagBuilder.appendAttrValue(currentChar);
					}
				}

				/*
				 * callbackの属性名を読み込み始まる
				 * -(aa,bb)か、(aa,bb)か
				 * ^^         ^
				 */
				else if( attrMode === ATTR_MODE_NONE && currentChar.isOneOf(['-','(']) ){

					attrMode = ATTR_MODE_CALLBACK;
				}
				/*
				 * callbackの属性名を読み込む
				 */
				else if( (attrMode === ATTR_MODE_CALLBACK || attrMode === ATTR_MODE_CALLBACK_ARG) &&
					!currentChar.isOneOf([',','(',')',' ','\n','\t','-','>']) ){

					attrMode = ATTR_MODE_CALLBACK_ARG;
					tagBuilder.appendCallbackArgs( currentChar );
				}
				/*
				 * このargsが終わります、
				 * 次のargsに移る
				 * (aa,bb)->
				 *       ^
				 */
				else if( (attrMode === ATTR_MODE_CALLBACK || attrMode === ATTR_MODE_CALLBACK_ARG) &&
					currentChar.isOneOf([',',')']) ){
					tagBuilder.endCallbackArgs();
					attrMode = ATTR_MODE_CALLBACK;
				}
				/*
				 * ->があって、これはopenTagです
				 * (aa,bb)-> (aa,bb)> -aa,bb>
				 *         ^        ^       ^
				 */
				else if( attrMode === ATTR_MODE_CALLBACK && currentChar === ">" ){
					tagBuilder.markAsOpenTag();
					attrMode = ATTR_MODE_NONE;
				}
			}
		}
		if( attrMode != ATTR_MODE_NONE ){
			throw '[ERROR103] タグ内の値が終了しないままファイルの終端に達しました';
		}
		if( tagMode != TAG_MODE_NONE ){
			throw '[ERROR104] タグが閉じないままファイルの終端に達しました';
		}
	}catch(e){
		throw filename+' Line:'+lineNumber+' Char:'+charNumber+'\n'+ e;
	}

	return {
		scripts:parsedTags,
		warnings:warnings
	};
}

/**
 * @param files {String[]} array of filename
 *
 * @return result.script {Object}   {"file1.ks":["tag1","tag2"],"file2.ks": ... }
 *         result.warnings {String[]}
 */
exports.parseFiles = function(files){
	var scripts = {};
	var warnings = [];
	for(var i = 0; i < files.length; i++){
		var source = fs.readFileSync(path.normalize(files[i]), "utf8");
		var result = exports.parse(source, files[i]);

		var fileName = path.basename( files[i] );
		scripts[fileName] = result.scripts;

		for( var j=0; j<result.warnings.length; j++ ){
			warnings.push("File: "+files[i]+" "+result.warnings[j]);
		}
	}
	return {
		scripts: scripts,
		warnings: warnings
	};
}

/**
 * Configure modes
 */

exports.configure = function (options) {
	if ('legacy' in options) {
		command.legacy = !!options.legacy;
	}
	if ('release' in options ){
		command.release = !!options.release;
	}
	if(command.legacy){
		syntaxMode = SYNTAX_MODE_LEGACY;
	} else {
		syntaxMode = SYNTAX_MODE_STANDARD;
	}
}

//commonjs用のfunction
exports.main = function commonjsMain(args) {
	if (!args.length) {
        console.log('Usage: builder.js FILE1 [FILE2 ...]');
        process.exit(1);
    }
    var files = args;
	return JSON.stringify(exports.parseFiles(files));
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
		var result = exports.main(command.args);
		util.print(result);
	}catch(e){
		console.error(e);
	}
}