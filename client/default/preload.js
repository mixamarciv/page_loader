//тут запускаем наши скрипты на странице
// нажимаем нужные кнопки или ждем какой то реакции что бы следующий запуск checkdata.js вернул true
$(function() {
    window.my_doc_is_ready = 1;
    var _arrow_is_click = 0;
    var _sinterval = setInterval(function(){
        var skip = 1;
        $('.col.arrow').each(function() {
            if(skip-->0){ return; }
            $( this ).click();
            _arrow_is_click++;
        });
        if(_arrow_is_click>0) {
            clearInterval(_sinterval);
            window.my_doc_is_ready = 1;
            return;
        }
    },1000);
});
