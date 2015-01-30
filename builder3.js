
// FIXME: constructorが長すぎるので細分化すべき
var Builder3 = function(){

	this.log;

	var fs = require('fs'),
		path = require('path'),
		util = require('util'),
		unorm = require('unorm'),
		//zipdir = require('zip-dir'), // FIXME: 不要なら削除する
		//command = require('commander'), // FIXME: 不要なら削除する
		AdmZip = require('adm-zip'),
		command,
		builder = require('./nodejs/builder/builder.js'),
		packageJson = require('./package.json'),
		//log = require('./log.js'), // FIXME: 不要なら削除する
		log,
		fsex = require('./fsex.js');

	var srcPath,
		destPath,
		enginePath,
		wrapperPath,
		engineVersion,
		wrapperVersion;

	var ENGINES_PATH = './engines',
		WRAPPERS_PATH = './wrappers',
		EXTENSIONS = {
			IMAGE: ['png', 'jpeg', 'jpg'],
			SOUND: ['ogg', 'mp4'],
			VIDEO: ['mp4', 'ogv', 'webm'],
			FONT: ['woff', 'ttf']
		};

	this.run = function(options, logger, callback){

		var isRequired = (typeof module === 'undefined' || require.main !== module);

		if( !logger ){
			// when called from command-line
			log = require('./log.js');
			command = require('commander');
			command
				.option('-s, --splitfiles', 'splitfilesモードでビルド')
				.option('-k, --kag3', 'KAG3互換文法モードでビルド')
				.option('-r, --release', 'リリースモードでビルド')
				.option('-x, --o2server', 'O₂ Serverモードでビルド')
				.option('-e, --engine [version]', '指定したバージョンのO₂ Engineでビルド')
				.option('-E, --engines [path]', 'O₂ Engineの格納されたフォルダを指定')
				.option('-V, --version', 'バージョン情報を表示')
				.option('-f, --force', 'ファイル整合性チェックを行わないでビルド')
				.option('-p, --package', 'ノベルスフィア向けにパッケージング')
				.option('-w, --wrapper [version]', '指定したバージョンのO₂ Wrapperでビルド')
				.option('-W, --wrappers [path]', 'O₂ Wrapperの格納されたフォルダを指定')
				.parse(process.argv);
		} else {
			// when required
			log = logger;
			command = options;
		}

		// コマンドの引数に問題がある場合のエラー
		if( 2 < command.args.length || command.args.length < 2 ){
			log.error('引数の数に誤りがあります');
			if( isRequired ) return;
		}

		// ビルドするパッケージが不整合な場合のエラー
		if( !command.package ){

			if( command.engines ){
				if( !fs.existsSync(command.engines) || !fs.statSync(command.engines).isDirectory() ){
					log.error('指定されたenginesフォルダがありません');
					if( isRequired ) return;
				} else {
					ENGINES_PATH = command.engines;
				}
			}

			if( !fs.existsSync(ENGINES_PATH) || !fs.statSync(ENGINES_PATH).isDirectory() ){
				log.error('enginesフォルダがありません');
				if( isRequired ) return;
			}

			if( !command.engine ){
				log.error('エンジンのバージョン指定がありません');
				if( isRequired ) return;
			} else {
				engineVersion = command.engine;
			}

			enginePath = path.join(ENGINES_PATH, engineVersion);

			if( !fs.existsSync(enginePath) || !fs.statSync(enginePath).isDirectory() ){
				log.error('指定されたバージョンのエンジンがありません');
				if( isRequired ) return;
			}

			if( command.wrapper ){
				wrapperVersion = command.wrapper;
			}
		}

		srcPath = path.normalize(command.args[0] + '/');

		// オプションに問題がある場合のエラー
		if( command.package ){
			destPath = path.normalize(command.args[1]);
		} else {
			destPath = path.normalize(command.args[1] + '/');
		}

		if( !fs.existsSync(srcPath) ){
			log.error('ビルド元フォルダがありません');
			if( isRequired ) return;
		}

		if( !fs.statSync(srcPath).isDirectory() ){
			log.error('指定されたビルド元がフォルダでありません');
			if( isRequired ) return;
		}

		if ( srcPath == destPath ){
			log.error('ビルド元とビルド先が同じフォルダです');
			if( isRequired ) return;
		}

		if ( srcPath.indexOf(destPath) != -1 ){
			log.error('ビルド元フォルダがビルド先フォルダの内部です');
			if( isRequired ) return;
		}

		if ( destPath.indexOf(srcPath) != -1 ){
			log.error('ビルド先フォルダがビルド元フォルダの内部です');
			if( isRequired ) return;
		}

		var srcPathFiles = fs.readdirSync(srcPath);
		var srcPathFilesForValidation = [];
		for( var key in srcPathFiles ){
			srcPathFilesForValidation.push(srcPathFiles[key].toLowerCase());
		}

		if( srcPathFilesForValidation.indexOf('config.json') == -1 || !fs.statSync(path.join(srcPath, 'config.json')).isFile() ){
			log.error('ビルド元フォルダにconfig.jsonがありません');
			if( isRequired ) return;
		}

		if( srcPathFilesForValidation.indexOf('data') == -1 || !fs.statSync(path.join(srcPath, 'data')).isDirectory() ){
			log.error('ビルド元フォルダにdataフォルダがありません');
			if( isRequired ) return;
		}

		if( !command.package ){
			// build

			if( fs.existsSync(destPath) ){
				if( fs.statSync(destPath).isDirectory() ){
					var destPathFiles = fs.readdirSync(destPath);
					var destPathFilesForValidation = [];
					for( var key in destPathFiles ){
						destPathFilesForValidation.push(destPathFiles[key].toLowerCase());
					}
					if( destPathFilesForValidation.indexOf('script.js') == -1 ){
						log.error('指定されたビルド先にすでに無関係なフォルダが存在します');
						if( isRequired ) return;
					}
				} else {
					log.error('指定されたビルド先にファイルが存在します');
					if( isRequired ) return;
				}
			} else {
				try {
					fs.mkdirSync(destPath);
					log.message('ビルド先フォルダを作成しました');
				} catch(e) {
					log.error('ビルド先フォルダの作成に失敗しました');
					if( isRequired ) return;
				}
			}

			var srcPathAllFiles = fsex.readdirRSync(path.join(srcPath, 'data'));
			var ksFiles = [];
			var ksRegexp = new RegExp('.*\\.\(ks\|asd\)$', 'i');

			srcPathAllFiles.filter(function(file){
				return fs.statSync(file).isFile() && ksRegexp.test(file);
			}).forEach(function(file){
				ksFiles.push(file);
			});

			var configFile = path.join(srcPath, 'config.json');
			var configContent = fs.readFileSync(configFile);

			try {
				var resultConfig = JSON.parse(configContent.toString('utf8').replace(/^\uFEFF/, '').replace(/\/\*[\s\S]+?\*\//g, '').replace(/\/\/.*/g, ''));
			} catch(e) {
				log.error('config.jsonの書式が正しくありません:\n' + e);
				if( isRequired ) return;
			}

			builder.configure({
				legacy : command.kag3 ? true : false,
				release : command.release ? true : false
			});
			try {
				var resultScript = builder.parseFiles(ksFiles);
			} catch(e) {
				log.error('スクリプトのコンパイル中にエラーが発生しました:\n' + e);
				if( isRequired ) return;
			}

			if( resultScript.warnings.length > 0 ){
				log.warn('スクリプトのコンパイル中に警告が発生しました:');
				for( var key in resultScript.warnings ){
					log.warn(resultScript.warnings[key]);
				}
			}

			var script = {'scripts': resultScript['scripts'], 'config': resultConfig};

			log.message('スクリプトのコンパイルを完了しました');

			var mkdirFolders = ['image', 'sound', 'video', 'font'];
			for( var key in mkdirFolders ){
				var mkdirFolder = path.join(destPath, mkdirFolders[key]);
				if( !fs.existsSync(mkdirFolder) ){
					try {
						fs.mkdirSync(mkdirFolder);
					} catch(e) {
						log.error('ビルド先フォルダに必要なフォルダの作成に失敗しました');
						if( isRequired ) return;
					}
				} else {
					if( fs.statSync(mkdirFolder).isFile() ){
						log.error('ビルド先フォルダの構造が予期されたものと異なります');
						if( isRequired ) return;
					}
				}
			}

			log.message('ビルド先フォルダに必要なフォルダを作成しました');

			var dataPath = path.join(srcPath, 'data');
			var safeList = [];
			setupResource(srcPath, destPath, EXTENSIONS.IMAGE, 'image', safeList, false, command.force, function(imagelist){
				setupResource(srcPath, destPath, EXTENSIONS.SOUND, 'sound', safeList, true, command.force, function(soundlist){
					setupResource(srcPath, destPath, EXTENSIONS.VIDEO, 'video', safeList, true, command.force, function(videolist){
						setupResource(srcPath, destPath, EXTENSIONS.FONT, 'font', safeList, true, command.force, function(fontlist){

							log.message('ストレージのコピーとストレージ一覧の生成が完了しました');

							var unlinkFiles = ['script.js', 'script.json', 'index.html'];
							for( var key in unlinkFiles ){
								var unlinkFile = path.join(destPath, unlinkFiles[key]);
								if( fs.existsSync(unlinkFile) && fs.statSync(unlinkFile).isFile() ){
									fs.unlinkSync(unlinkFile);
								}
							}

							log.message('ビルド先フォルダの不要ファイルを削除しました');

							var destEngineFolder = path.join(destPath, 'engine');
							var destPluginFolder = path.join(destPath, 'plugin');
							if( fs.existsSync(destEngineFolder) ){
								try {
									fsex.rmdirRSync(destEngineFolder);
									log.message('ビルド先フォルダ内の古いO₂ Engineを削除しました');
								} catch(e) {
									log.message('ビルド先フォルダ内の古いO₂ Engineの削除に失敗しました');
								}
							}
							if( fs.existsSync(destPluginFolder) ){
								try {
									fsex.rmdirRSync(destPluginFolder);
									log.message('ビルド先フォルダ内の古いプラグインを削除しました');
								} catch(e) {
									log.message('ビルド先フォルダ内の古いプラグインの削除に失敗しました');
								}
							}

							exportScript(script, {
								'imagelist': imagelist,
								'soundlist': soundlist,
								'videolist': videolist,
								'fontlist': fontlist
							}, destPath, command.o2server, command.splitfiles);

							log.message('ビルド先フォルダにスクリプトを書き出しました');

							try {
								fsex.copyRSync(enginePath, path.join(destPath, 'engine'));
								fs.renameSync(path.join(destPath, 'engine', 'index.html'), path.join(destPath, 'index.html'));
								log.message('ビルド先フォルダにO₂ Engineを設置しました');
							} catch(e) {
								log.error('ビルド先フォルダへのO₂ Engineの設置に失敗しました');
								if( isRequired ) return;
							}

							var srcPluginFolder = path.join(srcPath, 'plugin');
							if( fs.existsSync(srcPluginFolder) ){
								try {
									fsex.copyRSync(srcPluginFolder, destPluginFolder);
									log.message('ビルド先フォルダにプラグインを設置しました');
								} catch(e) {
									log.error('ビルド先フォルダへのプラグインの設置に失敗しました');
									if( isRequired ) return;
								}
							}

							log.end('ビルドを完了しました');

							if( callback ){
								callback(null);
							}

						});
					});
				});
			});

		} else {
			// package

			log.message('パッケージング中です');

			var zip = new AdmZip();
			zip.addLocalFolder(srcPath);

			var buf = zip.toBuffer(function(buf){
				log.message('ZIPファイルの書き出し中です');

				fs.writeFile(destPath, buf, function(){

					log.end('パッケージングを完了しました');

					if( callback ){
						callback(null);
					}
				});
			}, function(err){
				log.error('パッケージングに失敗しました');
				if( isRequired ) return;
			}, function(filename){
			}, function(filename){
				log.message('圧縮:' + filename);
			});

		}
	}

	this.version = function(){
		var version = packageJson.version;

		return version;
	}

	function setupResource(srcDir, destDir, extensions, type, safeList, removeExtension, isForce, cb){

		var map = {};

		var files = fsex.readdirRSync(srcDir);
		var targetFiles = [];
		var srcPathAllFiles = fsex.readdirRSync(path.join(srcDir, 'data'));
		var srcPathAllFileNames = [];
		var regexp = new RegExp('.*\\.(' + extensions.join('|') + ')$', 'i');

		files.filter(function(file){
			return fs.statSync(file).isFile() && regexp.test(file);
		}).forEach(function(file){
			targetFiles.push(file);
		});

		for( var key in srcPathAllFiles ){
			srcPathAllFileNames.push(path.basename(srcPathAllFiles[key]));
		}

		setTimeout(function(){addItems(cb);}, 0);

		return;

		function addItems(cb){
			//var exitFlg = false;

			var key = 0;
			if( key < targetFiles.length ){
				loop(key);
			} else {
				cb(map);
			}

			function loop(key){
				var storage = path.basename(targetFiles[key], path.extname(targetFiles[key]));
				var extname = path.extname(targetFiles[key]).substr(1);
				var filename = path.basename(targetFiles[key]);
				var prefix = './' + type + '/';
				//console.log('extname:'+extname+' / storage:'+storage+' / filename:'+filename);

				var flg1 = true;
				var flg2 = true;

				if( storage == '' || extname == ''){
					// files without storagename or extension will be rejected
					var flg1 = flg2 = false;
				}
				if( map[storage] ){
					var priorityOfThis = extensions.indexOf('extname');
					var priorityOfExisting = extensions.indexOf(path.extname(map[storage]));
					if( priorityOfThis > priorityOfExisting ){
						flg1 = false;
					}
				}
				if( map[filename] ){
					flg2 = false;
				}
				if( flg2 ){
					if( type == 'sound' ){
						if( extname == EXTENSIONS.SOUND[0] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.SOUND[1]) == -1 ){
								log.warn('ビルド元に' + filename + 'に対応するサウンドファイル' + storage + '.' + EXTENSIONS.SOUND[1] + 'が見つかりません');
								flg2 = false;
								exitFlg = true;
							}
						} else if( extname == EXTENSIONS.SOUND[1] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.SOUND[0]) == -1 ){
								if( srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[1]) + srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[2]) == -2 ){
									log.warn('ビルド元に' + filename + 'に対応するwebm/ogvビデオファイル ' + storage + '.' + EXTENSIONS.VIDEO[1] + ' / ' + storage + '.' + EXTENSIONS.VIDEO[2] + ' か、oggサウンドファイル' + storage + '.' + EXTENSIONS.SOUND[0] + 'が見つかりません');
									flg2 = false;
									exitFlg = true;
									safeList.push(filename);
								}
							} else {
								safeList.push(filename);
							}
						}
					} else if( type == 'video' ){
						if( extname == EXTENSIONS.VIDEO[0] ){
							if( !isForce && safeList.indexOf(filename) == -1 ){
								if( srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[1]) == -1 ){
									log.warn("ビルド元に" + filename + "に対応するogvビデオファイル" + storage + "." + EXTENSIONS.VIDEO[1] + "が見つかりません");
									flg2 = false;
									exitFlg = true;
								}
								if( srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[2]) == -1 ){
									log.warn("ビルド元に" + filename + "に対応するwebmビデオファイル" + storage + "." + EXTENSIONS.VIDEO[2] + "が見つかりません");
									flg2 = false;
									exitFlg = true;
								}
							} else {
								flg2 = false;
							}
						} else if( extname == EXTENSIONS.VIDEO[1] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[0]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するmp4ビデオファイル" + storage + "." + EXTENSIONS.VIDEO[0] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[2]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するwebmビデオファイル" + storage + "." + EXTENSIONS.VIDEO[2] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
						} else if( extname == EXTENSIONS.VIDEO[2] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[0]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するmp4ビデオファイル" + storage + "." + EXTENSIONS.VIDEO[0] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.VIDEO[1]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するwebmビデオファイル" + storage + "." + EXTENSIONS.VIDEO[1] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
						}
					} else if( type == 'font' ){
						if( extname == EXTENSIONS.FONT[0] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.FONT[1]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するttfフォントファイル" + storage + "." + EXTENSIONS.FONT[1] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
						} else if( extname == EXTENSIONS.FONT[1] ){
							if( !isForce && srcPathAllFileNames.indexOf(storage + '.' + EXTENSIONS.FONT[0]) == -1 ){
								log.warn("ビルド元に" + filename + "に対応するwoffフォントファイル" + storage + "." + EXTENSIONS.FONT[0] + "が見つかりません");
								flg2 = false;
								exitFlg = true;
							}
						}
					}
				}

				if( flg1 && type == 'image' ) {
					if( flg1 ){
						map[storage.toLowerCase()] = prefix + filename.toLowerCase();
					}
					if( flg2 ){
						map[filename.toLowerCase()] = prefix + filename.toLowerCase();
					}
				}
				if( flg2 && type == 'sound' ) {
					if( flg2 ){
						map[storage.toLowerCase()] = prefix + storage.toLowerCase();
					}
				}
				if( type == 'video' ) {
					if( flg2 ){
						map[storage.toLowerCase()] = prefix + storage.toLowerCase();
					}
				}
				if( type == 'font' ) {
					if( flg2 ){
						map[storage.toLowerCase()] = prefix + storage.toLowerCase();
					}
				}
				if( flg2 ){
					var srcFile = path.normalize(targetFiles[key]);
					var destFile = path.join(destDir, type, filename.toLowerCase());

					if( fs.existsSync(destFile) ){
						var srcMTime = util.inspect(fs.statSync(targetFiles[key])).mtime;
						var destMTime = util.inspect(fs.statSync(targetFiles[key])).mtime;

						if( srcMTime > destMTime ){
							fsex.copy(srcFile, destFile, function(){
								log.message('上書コピー:' + srcFile);
								if( key < targetFiles.length ){
									loop(key + 1);
								} else {
									cb(map);
								}
							});
						} else {
							setTimeout(function(){
								log.message('コピー省略:' + srcFile);
								if( key < targetFiles.length ){
									loop(key + 1);
								} else {
									console.log('calling...');
									cb(map);
								}
							}, 0);
						}
					} else {
						fsex.copy(srcFile, destFile, function(){
							log.message('新規コピー:' + srcFile);
							if( key < targetFiles.length ){
								loop(key + 1);
							} else {
								cb(map);
							}
						});
					}
				} else {
					// FIXME: これは必要なのか調査し修正する
					cb(map);
				}
			}

			// FIXME: なぜ利用されていないのか
			//return exitFlg;

		}
	}

	function exportScript(script, lists, exportPath, isO2ServerMode, isSplitfilesMode){

		var obj = script;

		for( var key in lists ){
			obj[key] = lists[key];
		}

		var json = unorm.nfc(JSON.stringify(obj));

		if( isO2ServerMode ){
			var contentJson = json;
			var contentJs = "$(function(){getScripts('./script.json')})";
			var filenameJson = 'script.json';
			var filenameJs = 'script.js';
			fs.writeFileSync(path.join(exportPath, filenameJson), contentJson);
			fs.writeFileSync(path.join(exportPath, filenameJs), contentJs);
		} else {
			var contentJs = "$(function(){initScripts(" + json + ")})";
			var filenameJs = 'script.js';
			try {
				fs.writeFileSync(path.join(exportPath, filenameJs), contentJs);
			} catch(e) {
				log.error('ビルド先フォルダへのスクリプトの書き出しに失敗しました');
				if( isRequired ) return;
			}
		}

	}


};

var builder3 = new Builder3();

if (typeof module !== 'undefined' && require.main === module) {
	builder3.run();
} else {
	exports.build = function(options, watcher, callback){
		var logger = {
			message: function(str){
				watcher(str, 'normal', false);
			},
			warn: function(str){
				watcher(str, 'warn', false);
			},
			error: function(str){
				watcher(str, 'error', true);
				callback(str);
			},
			end: function(str){
				watcher(str, 'normal', true);
			}
		};
		setTimeout(function(){
			builder3.run(options, logger, callback)
		}, 300);
	}

	exports.getVersion = function(){
		var str = builder3.version();
		return str;
	}

}
