/*!
 * pushy.js
 * Copyright(c) 2013 Julien Ballestracci <julien@nitronet.org>
 * MIT Licensed
 */
var file    = require("fs"),
    sockjs  = require("sockjs"),
    crypto  = require("crypto"),
    express = require("express"),
    Manager = require("./manager"),
    events  = require("./events"),
    SockJsServer = require("./sockjs-server");

exports.init = function (config, commandsCallbacks) {
    // Channels Manager
    var chanManager = new Manager(config.secretKey);
    
    // 1. Echo sockjs server
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
    
    // 2. Express server
    var app = express();
    var server = require('http').createServer(app);
    
    app.configure(function () 
    {
        app.use(express.bodyParser());
        app.use(app.router);
    }); 
    
    app.post('/pushy/channel/:name/trigger', function (req, res) {
        // POST
        // 
        // event: eventname
        // [socket_id: don't send event to this client]
        // auth_key: Hash: channel:event:timestamp:encodedBody+secretKey
        // timestamp: current ts (-600s décalage)
        var eventName = req.query.event,
            channel = req.params.name,
            authKey = req.query.auth_key,
            socketId = req.query.socket_id,
            timestamp = req.query.timestamp,
            myTS        = Math.round(new Date().getTime()/1000),
            data      = req.body;
        
        if(!timestamp || !eventName || !channel || !authKey) {
            res.status(400);
            res.header('Content-type', "application/json");
            res.write(JSON.stringify({
                error: {
                    code: "400",
                    message: "Missing required parameters"
                }
            }));
            res.end();
            return;
        }
        
        if(!chanManager.exists(channel)) {
            res.status(200);
            res.header('Content-type', "application/json");
            res.write(JSON.stringify({
                status: {
                    code: "200",
                    message: "Ok (channel not found)"
                }
            }));
            res.end();
            return;
        }
        
        timestamp = parseInt(timestamp);
        if((myTS >= timestamp && myTS-timestamp >= 600) || 
            (myTS < timestamp && timestamp-myTS >= 600)) {
            res.status(403);
            res.header('Content-type', "application/json");
            res.write(JSON.stringify({
                error: {
                    code: "501",
                    message: "Timestamp out of bounds (600 seconds)"
                }
            }));
            res.end();
            return;
        }
        
        var signatureString = channel + ':';
        signatureString += eventName + ':';
        signatureString += timestamp + (data !== undefined ? JSON.stringify(data) : "") + config.secretKey;
        
        var verif = crypto.createHash('sha256').update(signatureString).digest("hex");
        if(verif != authKey) {
            res.status(403);
            res.header('Content-type', "application/json");
            res.write(JSON.stringify({
                error: {
                    code: "403",
                    message: "Invalid credentials ("+ signatureString +")"
                }
            }));
            res.end();
            return;
        }
        
        chanManager.get(channel).broadcast(eventName, data, socketId);
        res.status(201);
        res.header('Content-type', "application/json");
        res.write(JSON.stringify({
            status: {
                code: "201",
                message: "Ok"
            }
        }));
        res.end();
    }); 
     
    sockjs.installHandlers(server);
    server.listen(config.port, '0.0.0.0');

    console.log('-> pushy started on port '+ config.port +' (ssl: '+ (config.ssl ? 'yes' : 'no') +')');
}