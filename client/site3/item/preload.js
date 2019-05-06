/****
jQuery(function() {

});
****/
document.addEventListener("DOMContentLoaded", function(event) { 
    var _sinterval = setInterval(function(){
        return __my_doc_ready(_sinterval);
    },1000);
});

function __my_doc_ready(_sinterval){
	clearInterval(_sinterval);
	setTimeout(function(){ //ждем как прогрузятся все данные
		window.my_doc_is_ready = 1;
	},1000);
}
