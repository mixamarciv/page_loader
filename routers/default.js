var express = require('express');
var router = express.Router();
module.exports = router;

var v = require('../app_fnc.js')();
const { wlog, wlogf, path, extend, fs, url, util } = v;
const loading_time = v.mixa.str.time_duration_str;

var p = require('../app_cri.js');

const DEBUG_test = 0;

const default_options = {
    need_data_type: 'html',
    scripts_autoload: 0,                      //автоматически задаем параметры *_script* на основе урл
    scripts_path: '',                     //путь-префикс к скриптам
    preload_script: 'default/preload.js',   //выполняем после загрузки страницы 
    checkdata_script: 'default/checkdata.js', //проверка - готова ли страница, если нет то ждем delay, выполняем каждый раз перед getdata.js
    getdata_script: 'default/getdata.js',   //скрипт которым возвращаем нужные данные со страницы
    //add_scripts      : ['default/add_scripts/jquery.min.js'],  //скрипты которые добавляем на страницу до её загрузки
    delay: 500,   //сколько мс ждем загрузки страницы и выполнения preload.js + checkdata.js
    repeat_cnt: 10,    //количество повторов delay полсле неудачного checkdata.js
    viewportWidth: 400,   //ширина экрана
    viewportHeight: 20000
}

router.get('/test', function (req, res) {
    console.log("-- url: -----------------------------------");
    console.log(req.originalUrl);
    console.log("-- ip: ------------------------------------");
    console.log(req.ip);
    console.log("-- body: ----------------------------------");
    console.log(req.body);
    console.log("-- query: ---------------------------------");
    console.log(req.query);
    console.log("-------------------------------------------");
    res.send(req.originalUrl);
});


//выдаем ответ на урл вида: http://127.0.0.1:5000/?url=https://test123.ru/z/101171
router.get('/', function (req, res) {
    var start_load_time = new Date();
    var need_url = req.query.url;
    wlog('GET / <- ' + need_url);
    function res_send(result) {
        res.send(result);
        wlog('GET / -> ' + loading_time(start_load_time) + ' size: ' + result.length + ' ' + need_url);
    }

    get_options(req.query, function (err, options) {
        if (err) return res_send(format_error(err));
        //wlogf('options: %o',options);
        //wlog('GET / ... get_options ' + loading_time(start_load_time));
        p.loadpage(options, function (err, result) {
            if (err) return res_send(format_error(err));
            if (!result) result = 'no data!!!';
            res_send(result);
        });
    });
});

function format_error(err) {
    var msg = {};
    msg.type = 'error';
    msg.msg = err.message;
    msg.stack = err.stack;
    msg.error = util.format('%o', err);
    return JSON.stringify(msg);
}

function get_options(p_opt, fnc_ret) {
    if (!p_opt) return fnc_ret(new Error('no req options'));
    if (!p_opt.url) return fnc_ret(new Error('not set url'));
    var opt = extend(default_options, p_opt);

    if (opt.scripts_autoload || opt.scripts_path) {
        var host = url.parse(opt.url).host;
        if (!opt.scripts_autoload) {
            host = opt.scripts_path;
        } else {
            host = path.join(host, opt.scripts_path);
        }

        opt.preload_script = p_opt.preload_script || path.join(host, '/preload.js');
        opt.checkdata_script = p_opt.checkdata_script || path.join(host, '/checkdata.js');
        opt.getdata_script = p_opt.getdata_script || path.join(host, '/getdata.js');
        if (!p_opt.add_scripts) {
            const filesPath = path.join(v.data.work_path, '../client', host, 'add_scripts');
            if (fs.existsSync(filesPath)) {
                let jsfiles = load_js_files_list(filesPath);
                jsfiles.forEach(function (item, index, array) {
                    jsfiles[index] = path.join('../client', host, 'add_scripts', item);
                });
                wlogf('add_scripts files: %j', jsfiles);
                opt.add_scripts = jsfiles;
            }
        }
    }

    return fnc_ret(null, opt);
}

function load_js_files_list(filesPath) {
    var arr = fs.readdirSync(filesPath)
    arr = arr.filter(file => {
        let b = /\.js$/.test(file);
        if (!b) return false;
        let fullpath = path.join(filesPath, file);
        b = fs.lstatSync(fullpath).isFile();
        if (!b) return false;
        return true;
    });
    return arr;
}

//--------------------------------------------------------------------------------------------
function test_options() {
    get_options({ url: 'https://nodejs.org/docs/latest/api/url.html', scripts_autoload: 1 }, function (err, options) {
        wlogf('get_options ERROR: %o', err);
        wlogf('get_options RESULT: %o', options);
    });
}

function test_get(surl) {
    //http://127.0.0.1:9301/?url=https%3A%2F%2Ftest123.ru%2F&scripts_path=default2%2Flist
    var start_load_time = new Date();
    wlog('TESTGET / <-');
    function res_send(result) {
        wlogf('result:  size %d', result.length);
        wlog('TESTGET / -> ' + loading_time(start_load_time));
    }
    var opt = test_get__url_to_options(surl);
    get_options(opt, function (err, options) {
        if (err) return res_send(err);
        if (DEBUG_test) wlogf('TESTGET options: %o', options);
        //wlog('GET / ... get_options ' + loading_time(start_load_time));
        p.loadpage(options, function (err, result) {
            if (err) return res_send(err);
            res_send(result);
        });
    });
}

function test_get__url_to_options(surl) {
    var options = {};
    var u = new url.URL(surl);
    var params = u.searchParams;
    for (const name of params.keys()) {
        options[name] = params.get(name);
        if (name == 'add_scripts') options['add_scripts'] = params.getAll('add_scripts');
    }
    return options;
}


function run_tests() {
    var urltest = 'http://127.0.0.1:9301/?url=https%3A%2F%2Ftest123.ru%2F&scripts_path=test123.ru%2Flist';
    setTimeout(function () {
        test_get(urltest);
        setInterval(function () {
            test_get(urltest);
        }, 2000);
    }, 1000);
}

//run_tests();
