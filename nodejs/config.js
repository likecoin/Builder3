(function(){
	var config = {
		scriptTagNameKey:0,
		scriptTagArgsKey:1,
		scriptTagCallbackArgsKey:2,
		scriptTagLineKey:3,
		scriptTagCharKey:4
	}
	if(typeof module !== 'undefined' && module.exports){
		exports.config = config;
	}else if(window && window.o2){
		window.o2.config = config;
	}
})();