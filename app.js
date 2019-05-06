
var http = require('http');
var express = require('express');
var app = express();

var v = require('./app_fnc.js')();
const {wlog,wlogf} = v;

app.use(require('./routers/default.js'));


var server = http.createServer(app);

var PORT = v.argv.port || 9301;
server.listen({
	host: '127.0.0.1',
	port: PORT,
	exclusive: true
}).on('error',function(err){
	wlogf("ERROR start listener on port "+PORT+": %o",err);
}).on('listening',function(){
	wlog("server listening on port "+PORT);
	require('./app_cri.js').init();
});


