//https://medium.com/@dschnr/using-headless-chrome-as-an-automated-screenshot-tool-4b07dffba79a

module.exports.newPageClient = function(){ return new PageClient(); }

module.exports.pClientPool = function(){ return new pClientPool(); }

const MAX_PAGECLIENTS  = 2;  // количество одновременно открытых страниц
const MAX_WORKWAIT     = 5;  // макс.количество урл(в очереди) ожидающих открытия на страницах
const MAX_PAGEDATAWAIT = 3;  // максимальное количество запросов на одну из октрытых страниц ожидающих обновления данных

const DEBUG_pClientPool = 1;      
const DEBUG_cri = 1;   

const CDP_port = 9222;
const CDP_host = '127.0.0.1';

const CDP = require('chrome-remote-interface');

var v = require('./app_fnc.js')();
const {wlog,wlogf} = v;
const {fs,util} = v;


const format = 'png';
const viewportWidth = 400;
const viewportHeight = 20000;
const delay = 500;
var   userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36";
      userAgent = null;


var cdp_options = {host:CDP_host, port:CDP_port};
async function close_all_tabs() {
	console.log('Closing existing targets if any');
	const targets = await CDP.List(cdp_options);
	return Promise.all(targets.map(({id}) => CDP.Close({id})));
}
 
close_all_tabs();

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
	 
//example1();
example2();

