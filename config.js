var argv = require('minimist')(process.argv.slice(2));  // параметры с командной строки


var config = {}
module.exports = config;

config.argv = argv;

config.app = {          // общие параметры приложения
	cache_disabled: argv.cache_disabled,
	debug: 0
}
