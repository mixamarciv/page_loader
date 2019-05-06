//https://medium.com/@dschnr/using-headless-chrome-as-an-automated-screenshot-tool-4b07dffba79a

module.exports.loadpage = loadpage;
module.exports.init = init;

var v = require('./app_fnc.js')();
const {wlog,wlogf,config} = v;
const {fs,util,extend,time_long} = v;

const MAX_PAGECLIENTS  = v.argv.max_pageclients || 3;  // количество одновременно открытых страниц/вкладок
const MAX_WORKWAIT     = v.argv.max_workwait    || 5;  // макс.количество урл(в очереди) ожидающих открытия на страницах
//const MAX_PAGEDATAWAIT = 3;  // максимальное количество запросов на одну из октрытых страниц ожидающих обновления данных

const DEBUG_queue = 0;      
const DEBUG_cri = 1;   
const DEBUG_cri_max = 1;   

const PAGE_LIVETIME_MINUTS_MAX = v.argv.tab_live_time || 3; // максимальное время жизни страницы в минутах, - потом обновляем её

const CDP_port = v.argv.cdp_port || 9222;          // chrome remote interface port
const CDP_host = v.argv.cdp_host || '127.0.0.1';   // chrome remote interface host

const CDP = require('chrome-remote-interface');

const default_image_format = 'png';
const default_viewportWidth = 400;
const default_viewportHeight = 20000;
const default_delay = 500;
var   default_userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36";
default_userAgent = null;
	  
const loading_time = v.mixa.str.time_duration_str;

//-----------------------------------------------------------------------------
var cdp_options = {host:CDP_host, port:CDP_port};
var pageclients = []; //pageclient = {client,target,url,id,waitworks,isready,local_cdp_options:{host,port,target}}
var pageclients_free = [];
var pageclients_url = {};  //map[url] = pageclient
var waitworks = []; // options = {options,fnc_ret}

var is_init = 0;
async function init(options,fnc_ret) {
	if(is_init++>0) return; 
	if(DEBUG_cri) wlog('start init pageclients');

	if(!options){
		options = cdp_options;
	}else{
		cdp_options.host = options.host || CDP_host;
		cdp_options.port = options.port || CDP_port;
	}

	if(DEBUG_cri) wlogf('cdp_options: %j',cdp_options);

	try {
		let local_options = extend({},cdp_options);
		await close_all_tabs(local_options);

		for(let i=0;i<MAX_PAGECLIENTS;i++){
			let local_options = extend({},cdp_options);

			const target = await CDP.New(local_options);
			
			local_options.target = target;
			local_options.id = target.id;
			var client = await CDP(local_options);

			var pageclient = {client,target,url:'',id:i,isready:1};
			pageclient.cdp_options = {id:target.id,host:local_options.host,port:local_options.port};
			pageclient.waitworks = [];  //задания ожидающие обработки на этом же урл
			pageclient.check_data_errors = 0;
 
			pageclients.push(pageclient);
			pageclients_free.push(pageclient);
		}
	} catch(err) {
		wlogf('ERROR init tabs: %o',err);
		return;
	}
	wlogf('init %d pageclients',MAX_PAGECLIENTS);
}

function show_pageclients(){
	var s = '';
	s += 'pageclients:\n';
	for(let i=0;i<pageclients.length;i++){
		let p = pageclients[i];
		s += p.id + ' ready:'+p.isready+' url:'+p.url+"\n";
	}
	
	s += 'pageclients map:\n';
	for(let url in pageclients){
		let p = pageclients[url];
		s += '['+p.url+'] '+ p.id + ' ready:'+p.isready+' url:'+p.url+"\n";
	}
	return s;
}

//отправляем новое задание
function loadpage(options,fnc_ret) {
	if(is_init==0){
		var msg = 'Call init() first!';
		wlog(msg);
		return fnc_ret(new Error(msg));
	}
	set_default_options__loadpage_cri(options);
	if(DEBUG_queue) wlog('loadpage start:\n'+show_pageclients());
	
	//тут выполняем проверки не загружался ли этот урл ранее и добавляем это задание в нужную очередь на загрузку 
	const url = options.url;
	if( pageclients_url.hasOwnProperty(url) ){ //если этот урл уже обрабатывали
		var pageclient = pageclients_url[url];
		if(DEBUG_queue) wlogf('loadpage oldworker %d url: %s',pageclient.id,url);
		return pc_add_work(pageclient,options,fnc_ret);
	}
	if( pageclients_free.length > 0 ){ //если есть свободные воркеры
		var pageclient = pageclients_free.shift();
		if(DEBUG_queue) wlogf('loadpage freeworker %d url: %s',pageclient.id,url);
		return pc_add_work(pageclient,options,fnc_ret);
	}
	if( waitworks.length < MAX_WORKWAIT ){ //добавляем задание в общую очередь
		waitworks.push({options,fnc_ret});
		if(DEBUG_queue) wlogf('loadpage waitworks %d url: %s',waitworks.length,url);
	}else{
		var msg = util.format('Слишком много заданий в очереди CDP loadpage (%d >= (MAX_WORKWAIT:%d))',waitworks.length, MAX_WORKWAIT);
		wlog(msg);
		fnc_ret(new Error(msg));
	}
}

//добавляем задания обработчику
function pc_add_work(pageclient,options,fnc_ret){
	const url = options.url;
	if( pageclient.waitworks.length > 0 ){ //если на эту страницу уже есть очередь то отправляем это задание туда же
		if(DEBUG_queue) wlogf('pc_add_work %d wait+works %d url: %s',pageclient.id,pageclient.waitworks.length,url);
		return pageclient.waitworks.push({options,fnc_ret});
	}
	if( pageclient.isready == 0 ){ //если наш обработчик ещё занят
		if(DEBUG_queue) wlogf('pc_add_work %d wait0works %d url: %s',pageclient.id,pageclient.waitworks.length,url);
		return pageclient.waitworks.push({options,fnc_ret});
	}
	return pc_start_work(pageclient,options,fnc_ret);
}

//ищем след задание или освобождаем обработчика
function pc_get_next_work(pageclient){
	if(DEBUG_queue) wlog('pc_get_next_work:\n'+show_pageclients());
	if( pageclient.waitworks.length > 0 ){ //если есть задания на эту же страницу
		var work = pageclient.waitworks.shift();
		var {options,fnc_ret} = work;
		return pc_start_work(pageclient,options,fnc_ret);
	}
	if( waitworks.length > 0 ){ //если есть задания в общей очереди то выполняем их от туда
		var work = waitworks.shift();
		var {options,fnc_ret} = work;
		return pc_start_work(pageclient,options,fnc_ret);
	}
	//если нет заданий ни в каких очередях то выставляем статус этого обработчика как свободный
	pageclient.isready = 1;
	pageclients_free.push(pageclient);
}

function pc_start_work(pageclient,options,fnc_ret){
	if(DEBUG_queue) wlogf('pc_start_work %d url: %s',pageclient.id,options.url);
	const url = options.url;
	pageclient.isready = 0; //выставляем флаг что наш воркер уже занят
	pageclients_free = pageclients_free.filter(function(p){  //удаляем нашего воркека из списка свободных
		return pageclient.id !== p.id;
	});

	if( pageclient.url == url ){ 
		//если прошлый раз загружали эту же вкладку то просто обновляем информацию с этой вкладки
		cri_loadpagedata(pageclient,options,function(err,res){
			fnc_ret(err,res);
			pc_get_next_work(pageclient);
		});
		return;
	}

	//if( pageclient.url != url )
	{//задаем pageclients_url для поиска нужного обработчика для нашего урл
		const oldurl = pageclient.url;
		delete pageclients_url[oldurl];
		pageclient.url = url;
		pageclients_url[url] = pageclient;
	}
	cri_loadpage(pageclient,options,function(err,res){
		fnc_ret(err,res);
		pc_get_next_work(pageclient);
	});
}

function set_default_options__loadpage_cri(options){
	options.url                = options.url              || 'https://www.google.com';
	options.need_data_type     = options.need_data_type   || 'html'; //'image';
	options.preload_script     = options.preload_script   || 'default/preload_script.js';
	options.checkdata_script   = options.checkdata_script || 'default/checkdata_script.js';
	options.getdata_script     = options.getdata_script   || 'default/getdata_script.js';
	//options.add_scripts        = options.add_scripts      || ['jquery.min.js'];
	options.delay              = options.delay            || default_delay;
	options.repeat_cnt         = options.repeat_cnt       || 10; //сколько раз повторяем опрос+задержку пока не получим нужные данные
	options.viewportWidth      = options.viewportWidth    || default_viewportWidth;
	options.viewportHeight     = options.viewportHeight   || default_viewportHeight;
	options.CDP                = options.CDP              || {host:CDP_host,port:CDP_port};
	options.CDP.host           = options.CDP.host         || CDP_host;
	options.CDP.port           = options.CDP.port         || CDP_port;
}

//полная загрузка страницы
async function cri_loadpage(pageclient,options,fnc_ret) {
	if(DEBUG_cri) wlogf('cri_loadpage() worker %d start url: %s',pageclient.id,options.url);

	const {url,add_scripts,preload_script,viewportWidth,viewportHeight} = options;

	var {client,target} = pageclient;	
	const {Page, Runtime, Network, Emulation} = client;

	//await CDP.Activate({id:target.id});  //на всякий случай переходим на нашу вкладку
	if(DEBUG_cri_max) wlogf('CDP.Activate opt: %j',pageclient.cdp_options);
	await CDP.Activate(pageclient.cdp_options);

	if(DEBUG_cri_max) wlogf('Emulation.setVisibleSize opt: ...');
	await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
	const deviceMetrics = {
		width: viewportWidth,
		height: viewportHeight,
		deviceScaleFactor: 0,
		mobile: true,
		fitWindow: false,
	};

	if(DEBUG_cri_max) wlogf('Emulation.setDeviceMetricsOverride opt: ...');
	await Emulation.setDeviceMetricsOverride(deviceMetrics);

	if(config.cache_disabled){
		if(DEBUG_cri_max) wlogf('Network.setCacheDisabled opt: ...');
		await Network.setCacheDisabled({cacheDisabled: true});
	}

	if(DEBUG_cri_max) wlogf('Page.enable()');
	await Page.enable();

	const prev_url = pageclient.prev_url;
	if(DEBUG_cri_max) wlogf('pageclient.prev_url: %s',prev_url);
	var is_prepare = 0;
	async function prepare_to_reload_page(){
		is_prepare = 1;
		if(DEBUG_cri_max) wlogf('Page.navigate({url:"chrome://version/"})');
		await Page.navigate({url:"chrome://version/"});
		if(DEBUG_cri_max) wlogf('Page.loadEventFired()');
		await Page.loadEventFired();
	}

	if(prev_url==url && /#/.test(url)!==false && is_prepare==0) {
		await prepare_to_reload_page();
	}

	if(prev_url && is_prepare==0){//если изменилось только содержимое после # в ссылке
		let i = prev_url.indexOf('#');
		if(prev_url.substr(0,i)==url.substr(0,i)){
			await prepare_to_reload_page();
		}
	}

	if(DEBUG_cri_max) wlogf('Page.navigate({url})');
	await Page.navigate({url});
	pageclient.prev_url = url;
	
	//добавляем наши скрипты на страницу до загрузки
	if(add_scripts){
		if(DEBUG_cri_max) wlogf('Page.addScriptToEvaluateOnLoad scripts count: %d',add_scripts.length);
		for(let i=0;i<add_scripts.length;i++){
			var add_script = add_scripts[i];

			if(DEBUG_cri_max) wlogf('Page.addScriptToEvaluateOnLoad scriptSource: %s',add_script);
			await Page.addScriptToEvaluateOnLoad({ scriptSource: fetch(add_script) });
		}
	}

	if(DEBUG_cri_max) wlogf('Page.loadEventFired()');
	await Page.loadEventFired();

	//добавляем скрипт после загрузки страницы
	if(DEBUG_cri_max) wlogf('Runtime.evaluate opt: ...');
	await Runtime.evaluate({expression: fetch(preload_script) });

	pageclient.last_load = new Date();

	if(DEBUG_cri) wlogf('cri_loadpage() end open url: '+options.url);
	await cri_loadpagedata(pageclient,options,fnc_ret);
}

async function cri_loadpagedata(pageclient,options,fnc_ret) {
	if(DEBUG_cri) wlogf('cri_loadpagedata() worker %d start url: %s',pageclient.id,options.url);

	if(pageclient.check_data_errors >= 2){ //после двух неудачных попыток загрузить днные со страницы -> заново загружаем страницу
		pageclient.check_data_errors = 0;
		if(DEBUG_cri) wlogf('cri_loadpagedata() check_data_errors %d > 2 --> reload page',pageclient.check_data_errors);
		await cri_loadpage(pageclient,options,fnc_ret);
		return;
	}

	let last_load_minuts = time_long(pageclient.last_load)/1000/60;  //минуты
	if(last_load_minuts > PAGE_LIVETIME_MINUTS_MAX){
		if(DEBUG_cri) wlogf('cri_loadpagedata() last_load_minuts %d > %d --> reload page',last_load_minuts,PAGE_LIVETIME_MINUTS_MAX);
		await cri_loadpage(pageclient,options,fnc_ret);
		return;
	}

	const {checkdata_script,getdata_script,delay,repeat_cnt,need_data_type} = options;
	
	var {client,target} = pageclient;	
	const {Page, Runtime} = client;

	//await CDP.Activate({id:target.id});  //на всякий случай переходим на нашу вкладку 
	await CDP.Activate(pageclient.cdp_options);

	var i_repeat = repeat_cnt;
	while(i_repeat--){
		const check = await Runtime.evaluate({ expression: fetch(checkdata_script) });
		if(DEBUG_cri_max) wlogf("check data: %o",check);
		const test = check.result.value;
		if(!test){
		  	await wait_delay(delay);
		  	continue; // wait for next repeat..
		} 
		pageclient.check_data_errors = 0;  //если прошли проверку то сбрасываем счетчик ошибок

		const result = await Runtime.evaluate({ expression: fetch(getdata_script) });
		
		if(need_data_type=='html') {
		  	const html = result.result.value;
		  	if(DEBUG_cri) wlogf('cri_loadpagedata() loaded html url: '+options.url+' ');
		  	return fnc_ret(null,html);
		}
		
		if(need_data_type=='image'){
		  	const screenshot = await Page.captureScreenshot({format:default_image_format});
		  	const buffer = new Buffer.from(screenshot.data, 'base64');
		  	if(DEBUG_cri) wlogf('cri_loadpagedata() loaded image url: '+options.url+' ');
		 	return fnc_ret(null,buffer);
		}
	}
	if(i_repeat<=0){  //если после нескольких повторов так и не получилось получить данные со страницы
		pageclient.check_data_errors++;
	  	wlogf('cri_loadpagedata() loaded url: '+options.url+' ERROR');
	  	return fnc_ret(new Error('check data error after '+repeat_cnt+' repeat check'));
	}
}
  
function wait_delay(delay) {
	return new Promise(resolve => {
	  	setTimeout(() => {
			resolve(1);
	  	}, delay);
	});
}

function fetch(fileName) {
	const filePath = v.path.join(v.data.work_path, '../client', fileName);
	return v.fs.readFileSync(filePath, 'utf-8');
}

async function close_all_tabs_async(local_options,obj) {
	let list_local_options = extend({},local_options);
	const targets = await CDP.List(list_local_options);
	obj.cnt_close = targets.length;
	var i = 0;
	return Promise.all(targets.map(async function(target){
		if(++i>obj.cnt_close) return;
		let close_local_options = extend({},local_options);
		close_local_options.id = target.id;
		//var client = await CDP(local_options);
		//client.Close();
		//if(DEBUG_cri) wlogf('close tab %o',close_local_options);
		CDP.Close(close_local_options);
	}));
}

async function close_all_tabs(local_options) {
	if(DEBUG_cri) wlogf('close_all_tabs start - local_options:\n %o',local_options);
	var obj = {}
	try{
		await close_all_tabs_async(local_options,obj);
	} catch(err) {
		wlogf('ERROR close open tabs: %o',err);
		return;
	}
	wlogf('closed %d tabs',obj.cnt_close);
}




async function example2() {
	wlogf('example2() start load');
	
	let client = null;
	try {
			const target1 = await CDP.New(); //open tab1
			const target2 = await CDP.New();
			const target3 = await CDP.New();

			var client1 = await CDP({target:target1}); //client to tab1
			var client2 = await CDP({target:target2});
			var client3 = await CDP({target:target3});


			await example_loadtab(client1,1,target1,'https://google.com');
			await example_loadtab(client2,2,target2,'https://github.com');
			await example_loadtab(client3,3,target3,'https://www.npmjs.com');
			
			//await wait_delay(1000);

			await example_gettabinfo(client1,1,target1);
			await example_gettabinfo(client2,2,target2);
			await example_gettabinfo(client3,3,target3);
	} catch (err) {
		console.error(err);
	} finally {
		//if (client) await client.close();
	}
	wlogf('example2() end load');
}

async function example_loadtab(client0,n,target,url) {
	let client = client0;
	try {
		//client = await CDP({target});
		//await CDP.Activate({id:target.id});
		const {Page, Runtime, Network, Emulation} = client;

		await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
		const deviceMetrics = {
			width: viewportWidth,
			height: viewportHeight,
			deviceScaleFactor: 0,
			mobile: true,
			fitWindow: false,
		};
		await Emulation.setDeviceMetricsOverride(deviceMetrics);
		await Network.setCacheDisabled({cacheDisabled: true});
		
		await Page.enable();
		await Page.navigate({url: url});
		await Page.loadEventFired();
		var res = await Runtime.evaluate({expression: 'window.location.toString()'})
		wlogf('load tab'+n+': %s -> %s ',target.id,res.result.value);
	} catch (err) {
		console.error(err);
	} finally {
		//if (client) await client.close();
	}
}

async function example_gettabinfo(client0,n,target) {
	let client = client0;
	try {
		//console.log('example_gettabinfo'+n+': CDP.Activate .. %s',target.id);
		//client = await CDP({target});
		await CDP.Activate({id:target.id});
		
		const {Page, Runtime} = client;
		//console.log('example_gettabinfo'+n+': Page.enable() ..');
		await Page.enable();
		//console.log('example_gettabinfo'+n+': Page.loadEventFired() ..');
		//await Page.loadEventFired();

		//console.log('example_gettabinfo'+n+': Runtime.evaluate ..');
		var res = await Runtime.evaluate({expression: 'window.location.toString()'})
		wlogf('eval tab'+n+': %s -> %s ',target.id,res.result.value);
	} catch (err) {
		console.error(err);
	} finally {
		//if (client) await client.close();
	}
}
	 
async function example3(){
	if(!is_init) await init();
	loadpage({url:'https://test123.ru/a/708827'},example3_showresult);
	loadpage({url:'https://test123.ru/a/309707'},example3_showresult);
	loadpage({url:'https://test123.ru/a/1088271'},example3_showresult);
	loadpage({url:'https://test123.ru/a/2087902'},example3_showresult);
}

function example3_showresult(err,res){
	if(err){
		return wlogf("ERROR: %o\n\n\nERROR: %j",err,err);
	}
	wlogf('RESULT: size %d ',res.length);
}

function test(){

}
//example1();
//example2();
//example3();

