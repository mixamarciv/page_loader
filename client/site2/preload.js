$(function() {
	var _interval_call = 0;
    var _arrow_is_click = 0;
    var _sinterval = setInterval(function(){
		if(_interval_call++>3){ //проверяем может и нет такого события больше
			var p = $('.swiper-slide');
			if(p.length>0){ //значит уже нет такого события - очищаем все
				$('head').html('404');
				$('body').html('not found');
				return __my_doc_ready(_sinterval);
			}
		}
		
        var skip = 1;
        //$('.col.text.ng-binding[data-ng-bind][data-no-apply-click]').each(function() {
        $('.col.arrow').each(function() {
            if(skip-->0){ return; }
            //$( this ).html('hehehehehehe'+$( this ).html());
            $( this ).click();
            _arrow_is_click++;
        });
        if(_arrow_is_click>0) {
            return __my_doc_ready(_sinterval);
        }
    },1000);
    /*****
    var _scroll = 0;
    var _sinterval = setInterval(function(){
        if(_scroll++>3){
            $('html, body').scrollTop($(document).height());
            clearInterval(_sinterval);
        }
    },1000);
    ******/
});

function __my_doc_ready(_sinterval){
	clearInterval(_sinterval);
	setTimeout(function(){ //ждем как прогрузятся все данные
		window.my_doc_is_ready = 1;
	},1000);
}
