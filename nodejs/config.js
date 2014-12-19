(function(){
	var config = {
		scriptTagNameKey:0,
		scriptTagArgsKey:1,
		scriptTagDependencyKey:2,
		scriptTagCallbackArgsKey:3,
		scriptTagLineKey:4,
		scriptTagCharKey:5
	}
	if(typeof module !== 'undefined' && module.exports){
		exports.config = config;
	}else if(window && window.o2){
		window.o2.config = config;
	}
})();