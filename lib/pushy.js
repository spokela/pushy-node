//
// Pushy
// (c) 2013-2014, Julien Ballestracci - Spokela
// Licensed under the MIT license (@see LICENSE)
//

var file    = require("fs"),
    crypto  = require("crypto"),
    express = require("express"),
    Manager = require("./manager"),
    events  = require("./events"),
    SockJsServer = require("./sockjs-server"),
    sendAndClose = function(response, status, data) {
        response.status(status);
        response.header('Content-type', "application/json");
        response.write(JSON.stringify(data));
        response.end();
    };

// Initialization function. Called from the main script.
exports.init = function (config, commandsCallbacks) {
    // channels Manager
    var chanManager = new Manager(config.secretKey);
    
    // echo sockjs server
    var sockjs = new SockJsServer(config.sockjs);
    sockjs.on('command', function(connection, cmd) {
        var callback = (commandsCallbacks[cmd.command.toLowerCase()] || undefined);
        if(typeof callback == 'function') {
            callback(sockjs, connection, cmd.data, chanManager);
        } else {
            sockjs.sendEvent(connection, events.PUSHY_ERROR, {
                message: "Unknown command",
                code: "200"
            });
        }
    });
    
    // express/http server
    var app = express();
    var server = require('http').createServer(app);
    app.configure(function () 
    {
        app.use(express.bodyParser());
        app.use(app.router);
    }); 
    
    // Exposes an HTTP/Json API to trigger an event to a given channel from
    // anywhere.
    // 
    // POST data: is the data (json encoded) attached to the event
    // GET data:
    //  event: eventname
    //  auth_key: sha256 of channel:event:timestamp:encodedBody+secretKey
    //  timestamp: current ts (should be +/- 600s)
    //  socket_id (optional): don't send event to this client
    app.post('/pushy/channel/:name/trigger', function (req, res) {
        var eventName = req.query.event,
            channel = req.params.name,
            authKey = req.query.auth_key,
            socketId = req.query.socket_id,
            timestamp = req.query.timestamp,
            myTS = Math.round(new Date().getTime()/1000),
            data = req.body;
        
        if(!timestamp || !eventName || !channel || !authKey) {
            sendAndClose(res, 400, {
                error: {
                    code: "400",
                    message: "Missing required parameters"
                }
            });
            return;
        }
        
        // check if the timestamp is not too different from the local ts
        // to prevent desynchronization (600 seconds +/-).
        timestamp = parseInt(timestamp);
        if((myTS >= timestamp && myTS-timestamp >= 600) || 
            (myTS < timestamp && timestamp-myTS >= 600)) {
            sendAndClose(res, 403, {
                error: {
                    code: "501",
                    message: "Timestamp out of bounds (600 seconds)"
                }
            });
            return;
        }
        
        // check the authKey/hash
        var signatureString = channel + ':';
        signatureString += eventName + ':';
        signatureString += timestamp + (data !== undefined ? JSON.stringify(data) : "") + config.secretKey;
        var verif = crypto.createHash('sha256').update(signatureString).digest("hex");
        if (verif != authKey) {
            sendAndClose(res, 403, {
                error: {
                    code: "403",
                    message: "Invalid credentials ("+ authKey +")"
                }
            });
            return;
        }
        
        // check if channel exists and broadcast the event
        if (chanManager.exists(channel)) {
            chanManager.get(channel).broadcast(eventName, data, socketId);
        }
        
        // we send a 201 header if the channel exists
        sendAndClose(res, (chanManager.exists(channel) ? 201 : 200), {
            status: {
                code: "201",
                message: "Ok"
            }
        });
    });
     
    // finally start everything
    sockjs.installHandlers(server);
    server.listen(config.port, '0.0.0.0');
    console.log('Pushy started on port '+ config.port +' (ssl: '+ (config.ssl ? 'yes' : 'no') +')');
}