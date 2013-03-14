
/*!
 * pushy.js
 * Copyright(c) 2012 Julien Ballestracci <julien@nitronet.org>
 * MIT Licensed
 */

var pushy = module.exports = require('./lib/pushy'),
    file  = require("fs"),
    cfgFile = (process.argv[2] || null);
    
if(cfgFile == null) {
    throw new Error("No config file specified.");
}

try {
    var config = JSON.parse(file.readFileSync(cfgFile));
} catch(err) {
    throw new Error("Error parsing config file: "+ err);
}

pushy.init(config, {
   subscribe: require('./commands/subscribe').callback,
   unsubscribe: function(sockjs, data, manager) {
    console.log('UNSUBSCRIBE');
   }
});