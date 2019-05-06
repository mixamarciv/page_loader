
function fnc_my_doc_is_ready(){
    var t = document.documentElement.innerHTML;
    if(!t || t.length==0) return 0;

    if(!window.my_doc_is_ready) window.my_doc_is_ready = 0;
    if(window.my_doc_is_ready<5){
		window.my_doc_is_ready++;
		return 0;
    }
    return true;
}

fnc_my_doc_is_ready();
