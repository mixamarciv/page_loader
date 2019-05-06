//--------------------------------------
var v = {}

var is_init = 0;
module.exports = function() {
	if(is_init++>0) return v;
	prepare_work_dir();
	return v;
}

v.data = {};    //список глобальных переменных
v.data.app_start_time = new Date();
v.data.db = {}; //список установленных подключений к бд

v.argv = require('minimist')(process.argv.slice(2));
v.os   = require('os');
v.fs   = require('fs');
v.url  = require('url');
v.util = require('util');
v.path = require('path');
v.extend = require('node.extend');

v.mixa = require('mixa_std_js_functions');

v.path.join2      = v.mixa.path.join;
v.path.norm2      = v.mixa.path.norm;
v.path.normalize2 = v.mixa.path.norm;
v.path.mkdir_path = v.mixa.path.mkdir_path;

v.time_long = time_long;


v.config = require('./config.js');
//--------------------------------------


var _wlog_prev_t = new Date();
v.wlog = wlog;
function wlog(str) {
	var newdate = new Date();
	var datetime = v.mixa.str.date_to_str_format("YMD-hms");
	//var timefromstart = v.mixa.str.time_duration_str(v.data.app_start_time,newdate);
	var timefromprevcall = v.mixa.str.time_duration_str(_wlog_prev_t,newdate); 
	_wlog_prev_t = newdate;
	str = datetime+" "+timefromprevcall.padStart(10)+" "+str;
	v.fs.writeFileSync('log', str+"\n",{flag:'a'});
	console.log(str)
}

v.wlogf = wlogf;
function wlogf() {
	var format = v.util.format;
	//wlog( format.call(arguments) );
	wlog( format.apply(format, arguments) );
}

function prepare_work_dir() {
	v.data.work_path = v.path.norm2(__dirname+'/res');
	if(!v.fs.existsSync(v.data.work_path)) v.fs.mkdirSync(v.data.work_path);
	process.chdir(v.data.work_path);
	wlog('chdir: '+v.data.work_path);
}

function time_long(time_begin,time_end) {
	if(!time_end){
		time_end = new Date();
	}
	var t = time_end.getTime() - time_begin.getTime();
	return t;
}

