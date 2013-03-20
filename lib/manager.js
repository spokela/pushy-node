//
// Pushy
// (c) 2013-2014, Julien Ballestracci - Spokela
// Licensed under the MIT license (@see LICENSE)
//

// export the constructor
exports = module.exports = Manager;

// Channels Manager
function Manager(secretKey) {
    this.channels = [];
    this.__secretKey = secretKey;
};

// Check the existence of a channel by its name
// 
// @param string channelName the channel name
// @return boolean
Manager.prototype.exists = function(channelName) {
    return this.channels[channelName.toLowerCase()] !== undefined;
};

// Returns a Channel according to its name or "undefined" if channel not present
//
// @param string channelName the channel name
// @return Channel|undefined
Manager.prototype.get = function(channelName) {
    if (!this.exists(channelName)) {
        return undefined;
    }
    
    return this.channels[channelName.toLowerCase()];
};

// Adds a Channel
//
// @param string  channelName the channel name
// @param Channel channel     Channel object
// @return Channel The channel object
// @throws Error if trying to override an existing channel
Manager.prototype.add = function(name, channel) {
    if (this.exists(name)) {
        throw new Error('Unable to add channel "'+ name +'" (already exists)');
    }
    
    this.channels[name.toLowerCase()] = channel;
    
    // remove the channel when the last member quit
    channel.on('member:quit', function() {
       if(channel.countMembers() === 0) {
           this.remove(name);
           console.log('[channel: '+ name +'] channel removed.');
       } 
    }.bind(this));
    
    return channel;
};

// Removes a channel
//
// @param string name the channel name
Manager.prototype.remove = function(name) {
    if (!this.exists(name)) {
        return;
    }
  
    delete this.channels[name.toLowerCase()];
};