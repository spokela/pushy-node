var Channel = require('../lib/channel'),
    events = require('../lib/events');

exports = module.exports = function(sockjs, connection, data, channels) {
    if(!data.channel) {
        sockjs.sendEvent(connection, events.PUSHY_ERROR, {
            message: "No channel specified",
            code: "300"
        });
        
        return;
    }
        
    
    var chan = channels.get(data.channel);
    if(!chan) {
        sockjs.sendEvent(connection, events.PUSHY_ERROR, {
            message: "Channel not found",
            code: "404"
        });
        
        return;
    }
    
    if(!chan.hasMember(connection)) {
        sockjs.sendEvent(connection, events.PUSHY_ERROR, {
            message: "Not subscribed to this channel",
            code: "403"
        });

        return;
    }
    
    
    chan.unsubscribe(connection, 'unsubscribed by the client');
    
    // send confirmation to client
    sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_END, {
        channel: data.channel
    });
};