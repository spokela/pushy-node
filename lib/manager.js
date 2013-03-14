/**
 * Export the constructor.
 */

var crypto = require('crypto');

exports = module.exports = Manager;

/**
 * Manager constructor.
 *
 * @api public
 */
function Manager(secretKey) {
    this.channels = [];
    this.__secretKey = secretKey;
};

Manager.prototype.exists = function(channelName) {
    
    return this.channels[channelName.toLowerCase()] !== undefined;
};

Manager.prototype.get = function(channelName) {
    if(!this.exists(channelName))
        return undefined;
    
    return this.channels[channelName.toLowerCase()];
};

Manager.prototype.add = function(name, channel) {
    if(this.exists(name))
        throw new Error('Unable to add channel "'+ name +'" (channel already exists)');
    
    this.channels[name.toLowerCase()] = channel;
    
    channel.on('member:quit', function() {
       if(channel.members() === 0) {
           this.remove(name);
           console.log('CHANNEL REMOVED: '+ name);
       } 
    }.bind(this));
    
    return channel;
};

Manager.prototype.remove = function(name) {
    if(!this.exists(name))
        return;
  
    delete this.channels[name.toLowerCase()];
};

Manager.prototype.verifyAuth = function(connection, channelName, subscriptionData) {
    var str = connection.id +':'+ channelName.toLowerCase();
    
    if(subscriptionData !== undefined) {
        str += JSON.stringify(subscriptionData);
    }
    
    str += this.__secretKey;
    return crypto.createHash('sha256').update(str).digest("hex");
};