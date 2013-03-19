//
// Pushy
// (c) 2013-2014, Julien Ballestracci - Spokela
// Licensed under the MIT license (@see LICENSE)
//

var pushy = require('./lib/pushy'),
    file  = require("fs"),
    cfgFile = (process.argv[2] || null);

// configuration stuff
if (cfgFile == null) {
    throw new Error("syntax is: node pushy-server.js <path-to-config.json>");
}
try {
    var config = JSON.parse(file.readFileSync(cfgFile));
} catch(err) {
    throw new Error("bogus config file: "+ err);
}

// Initialize/launch the server and register commands callbacks.
// Commands are functions accessible from client-side. They allow the user to
// perform various actions throught his sockjs connection. Pushy comes with only
// two obvious commands: SUBSCRIBE and UNSUBSCRIBE.
pushy.init(
    // configuration
    config, 
    // commands callbacks
    {
        subscribe: require('./commands/subscribe').callback,
        unsubscribe: function(sockjs, connection, data, channels) {
            console.log('UNSUBSCRIBE');
        }
    }
);