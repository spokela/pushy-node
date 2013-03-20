//
// Pushy
// (c) 2013-2014, Julien Ballestracci - Spokela
// Licensed under the MIT license (@see LICENSE)
//

var sockjs  = require("sockjs"),
    events  = require("./events"),
    EventEmitter = process.EventEmitter;
    
// export the constructor    
exports = module.exports = SockJsServer;

// Initialize the SockJS Server. (constructor)
//
// @return void
function SockJsServer(sockJsConfig) {
    var handle = this.handle = sockjs.createServer(sockJsConfig), self = this;
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
        });
    });
};

// inherits event-dispatcher capacities
SockJsServer.prototype.__proto__ = EventEmitter.prototype;

// Sends an formatted event to the connection
//
// @param {SockJS Connection} connection The connection we want to send the event to
// @param string              event      The event name
// @param Object              data       Data attached to the event (encoded to JSON)
// @return void
SockJsServer.prototype.sendEvent = function(connection, event, data) {
    connection.write(JSON.stringify({
        event: event,
        data: data
    }));
};

// Installs HTTP SockJS handlers to the HTTP Server
// (called on startup)
//
// @param {HttpServer} app The HTTP Server
// @return void
SockJsServer.prototype.installHandlers = function(app) {
    this.handle.installHandlers(app);
};