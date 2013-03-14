/*!
 * pushy
 * Copyright(c) 2013 Julien Ballestracci <julien@nitronet.org>
 * MIT Licensed
 */

var sockjs  = require("sockjs"),
    events  = require("./events"),
    EventEmitter = process.EventEmitter;
    
exports = module.exports = SockJsServer;

/**
 * SockJsServer constructor.
 *
 * @api public
 */
function SockJsServer(sockJsConfig) {
    this.handle = handle = sockjs.createServer(sockJsConfig);
    var self = this;
    handle.on('connection', function(connection) {
        // send a CONNECT event to let the client know it's ok
        self.sendEvent(connection, events.PUSHY_CONNECT, {
            socketId: connection.id,
            protocol: connection.protocol
        });
        
        connection.on('data', function(message) {
            var cmd = {};
            try {
                cmd = JSON.parse(message);
            } catch(e) {cmd = {}};
            
            if((cmd.event == undefined && cmd.command == undefined) ||
               (cmd.event != undefined && cmd.command != undefined)) {
                
                self.sendEvent(connection, events.PUSHY_ERROR, {
                    message: "Bogus message recieved",
                    code: "100"
                });
        
                return;
            }
            
            if(cmd.command !== undefined) {
                self.emit('command', connection, cmd);
                return;
            }
            
            if(cmd.event != undefined && cmd.channel == undefined) {
                self.sendEvent(connection, events.PUSHY_ERROR, {
                    message: "No channel specified",
                    code: "300"
                });
                
                return;
            }
        });
        
        connection.on('close', function() {
            console.log('close ' + connection);
        });
    });
};

SockJsServer.prototype.__proto__ = EventEmitter.prototype;

SockJsServer.prototype.sendEvent = function(connection, event, data) {
    connection.write(JSON.stringify({
        event: event,
        data: data
    }));
};

SockJsServer.prototype.installHandlers = function(app) {
    this.handle.installHandlers(app);
};