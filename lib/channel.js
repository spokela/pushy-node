//
// Pushy
// (c) 2013-2014, Julien Ballestracci - Spokela
// Licensed under the MIT license (@see LICENSE)
//

var EventEmitter = process.EventEmitter,
    crypto = require('crypto'),
    uuid = require('node-uuid'),
    events = require("./events");

// export the constructor
exports = module.exports = Channel;

// Provides a Channel representation
function Channel(name) {
    this.name = name;
    this.attributes = {
        created: new Date().getTime()
    };
    this.members = [];
    this.presenceEnabled = false;
    
    // if the channel name starts with "private-" then authorization is
    // required to subscribe.
    this.authRequired = (name.toString().toLowerCase().indexOf('private-') === 0);
};

// inherits event-dispatcher capacities
Channel.prototype.__proto__ = EventEmitter.prototype;

// Defines an attribute for this channel
//
// @param string attribute Attribute name
// @param mixed  value     The value
Channel.prototype.set = function(attribute, value) {
    this.attributes[attribute] = value;
};

// Gets an attribute previously defined or defaultValue
//
// @param string attribute    Attribute name
// @param mixed  defaultValue Default value to be returned if attr not defined
// @return mixed 
Channel.prototype.get = function(attribute, defaultValue) {
    return (this.attributes[attribute] || defaultValue);
};

// Generates a unique membership id
// 
// @return string
Channel.prototype.nextMembershipId = function() {
    var id = uuid.v4();
    while(this.members[id] !== undefined) {
        id = uuid.v4();
    }
    
    return id.toString().substr(0,id.toString().indexOf('-'));
};

// Adds a subscriber to the channel
//
// @param {sockjs connection} connection       User's SockJS connection
// @param Object              subscriptionData Data sent by user on subscription
// @return void
// @throws Error If connection already subscribed 
Channel.prototype.subscribe = function(connection, subscriptionData) {
    if (this.hasMember(connection)) {
        throw new Error('Member already subscribed');
    }
    
    var infos = {}, memberId = this.nextMembershipId();
    try {
        infos = JSON.parse(subscriptionData);
    } catch(e) { };

    infos.subscribed = new Date().getTime();
    infos.memberId   = memberId;
    infos.idle       = false;
    
    this.members.push({
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
        for(var idx in this.members) {
            conn        = this.members[idx];
            pres[idx]   = conn.data;
        }
        
        data.presence = pres;
        this.broadcast(events.PUSHY_PRESENCE_ADD, {
                member: infos
        }, connection);
    }
    
    this.emit('member:add', memberId);
    return data;
};

// Removes a subscriber from the channel
//
// @param {sockjs connection} connection User's SockJS connection
// @param string              reason     Reason (if any)
// @return void
// @throws Error If connection not subscribed 
Channel.prototype.unsubscribe = function(connection, reason) {
    if (!this.hasMember(connection)) {
        throw new Error('Member not subscribed');
    }
    
    var conn, newConns = [], infos = this.getMemberByConnection(connection);
    for(var idx in this.members) {
        conn = this.members[idx];
        if(conn.connection.id != connection.id) {
            newConns.push(conn);
        }
    }
    this.members = newConns;
    
    if(this.presenceEnabled) {
        this.broadcast(events.PUSHY_PRESENCE_QUIT,  {
                member: infos.data
        }, connection);
    }
    
    this.emit('member:quit', infos.data.memberId, reason);
};

// Tells if a member (connection) is already subscribed to this channel
//
// @param {sockjs connection} connection SockJS connection instance
// @return boolean
Channel.prototype.hasMember = function(connection) {
    var member = this.getMemberByConnection(connection);
    return (member !== undefined);
};

// Gets a member by its membership id
// 
// @param string memberId Membership identifier
// @return {sockjs connection}|undefined
Channel.prototype.getMemberById = function(memberId) {
    var conn;
    for(var idx in this.members) {
        conn = this.members[idx];
        if(idx == memberId) {
            return conn;
        }
    }
    return undefined;
};

// Gets a member by its connection
// 
// @param string memberId Membership identifier
// @return {sockjs connection}|undefined
Channel.prototype.getMemberByConnection = function(connection) {
    var member = null;
    for(var idx in this.members) {
        member = this.members[idx];
        if(member.connection.id == connection.id) {
            return member;
        }
    }
    return undefined;
};

// Count actual subscribers
//
// @return integer
Channel.prototype.countMembers = function() {
    return this.members.length;
};

// Broadcast an event to channel's subscribers
//
// @param string event  Event name
// @param Object data   Event data
// @param string except MemberID to skip
// @return void
Channel.prototype.broadcast = function(event, data, except) {
    var conn, evnt = {
        event: event,
        channel: this.name,
        data: data
    }, str = JSON.stringify(evnt);
    
    for(var idx in this.members) {
        conn = this.members[idx];
        if(except && conn.connection.id == except.id) continue;
        conn.connection.write(str);
    }
};

Channel.prototype.verifyAuth = function(connection, subscriptionData, secretKey) {
    var str = connection.id +':'+ this.name.toLowerCase();
    
    if(subscriptionData !== undefined) {
        str += ':'+ JSON.stringify(subscriptionData);
    }
    
    str += ':'+ secretKey;
    
    return crypto.createHash('sha256').update(str).digest("hex");
};