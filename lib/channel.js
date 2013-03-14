
var EventEmitter = process.EventEmitter,
    crypto = require('crypto'),
    uuid    = require('node-uuid');

exports = module.exports = Channel;

function Channel(name) {
    this.name = name;
    this.attributes = {
        created: new Date().getTime()
    };
    this.connections = [];
    this.presenceEnabled = false;
    this.authRequired = (name.indexOf('private-') === 0);
    console.log('CHANNEL CREATED: '+ name);
};

Channel.prototype.__proto__ = EventEmitter.prototype;

Channel.prototype.set = function(attribute, value) {
    this.attributes[attribute] = value;
};

Channel.prototype.get = function(attribute, defaultValue) {
    
    return (this.attributes[attribute] || defaultValue);
};

Channel.prototype.nextMembershipId = function() {
    var id = uuid.v4();
    while(this.connections[id] !== undefined) {
        id = uuid.v4();
    }
    
    return id.toString().substr(0,id.toString().indexOf('-'));
};

Channel.prototype.subscribe = function(connection, subscriptionData) {
    if(this.hasMember(connection))
        throw new Error('Member "'+ connection.id.toString() +'" is already subscribed');

    var infos = {}, memberId = this.nextMembershipId();
    try {
        infos = JSON.parse(subscriptionData);
    } catch(e) { };

    infos.subscribed = new Date().getTime();
    infos.memberId   = memberId;
    infos.idle       = false;
    
    this.connections.push({
        connection: connection,
        data: infos
    });
    
    connection.on('close', function() {
        if(this.hasMember(connection)) {
            this.unsubscribe(connection, 'Connection closed');
        }
    }.bind(this));
    
    var data = {
        channel: this.name,
        memberId: memberId
    }
    
    if(this.presenceEnabled) {
        var conn, pres = [];
        for(var idx in this.connections) {
            conn        = this.connections[idx];
            pres[idx]   = conn.data;
        }
        
        data.presence = pres;
        
        this.broadcast("pushy:presence-add", {
                member: infos
        }, connection);
    }
    
    connection.write(JSON.stringify({
        event: "pushy:subscription-success",
        data: data
    }));
    
    console.log('SUBSCRIBER ADDED: "'+ connection.id.toString() +'" ("'+ this.name +'") '+ this.members().toString());
    this.emit('member:add', memberId);
};

Channel.prototype.unsubscribe = function(connection, reason) {
    if(!this.hasMember(connection)) 
        throw new Error('Member "'+ connection.id.toString() +'" is not subscribed');

    var conn, newConns = [], infos = this.getMemberByConnection(connection);
    for(var idx in this.connections) {
        conn = this.connections[idx];
        if(conn.connection.id != connection.id) {
            newConns.push(conn);
        }
    }
    this.connections = newConns;
    
    if(this.presenceEnabled) {
        this.broadcast("pushy:presence-quit",  {
                member: infos.data
        }, connection);
    }
    
    console.log('SUBSCRIBER REMOVED: "'+ connection.id.toString() +'" ("'+ this.name +'")');
    this.emit('member:quit');
};

Channel.prototype.idle = function(connection) {
    if(this.presenceEnabled) {
        this.emit('presence:idle');
    }
    this.emit('member:idle');
};

Channel.prototype.hasMember = function(connection) {
    var conn;
    for(var idx in this.connections) {
        conn = this.connections[idx];
        if(conn.connection.id == connection.id) {
            return true;
        }
    }
    return false;
};

Channel.prototype.getMemberById = function(memberId) {
    var conn;
    for(var idx in this.connections) {
        conn = this.connections[idx];
        if(idx == memberId) {
            return conn;
        }
    }
    return undefined;
};

Channel.prototype.getMemberByConnection = function(connection) {
    var conn;
    for(var idx in this.connections) {
        conn = this.connections[idx];
        if(conn.connection.id == connection.id) {
            return conn;
        }
    }
    return undefined;
};


Channel.prototype.members = function() {
    
    return this.connections.length;
};

Channel.prototype.broadcast = function(event, data, except) {
    var conn;
    var evnt = {
        event: event,
        channel: this.name
    };
    
    if(data) {
        evnt.data = data;
    }
    
    for(var idx in this.connections) {
        conn = this.connections[idx];
        if(except && conn.connection.id == except.id) continue;
        conn.connection.write(JSON.stringify(evnt));
    }
};