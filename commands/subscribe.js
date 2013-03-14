var Channel = require('../lib/channel'),
    events = require('../lib/events');

exports.callback = function(sockjs, connection, data, channels) {
    if(!data.channel) {
        sockjs.sendEvent(connection, events.PUSHY_ERROR, {
            message: "No channel specified",
            code: "300"
        });
        
        return;
    }
        
    // require auth
    var presenceEnabled = false;
    if(data.channel.indexOf('private-') === 0) {
        if(data.auth === undefined || data.auth.trim() == "") {
            sockjs.sendEvent(connection, events.PUSHY_NEEDAUTH, {
                channel: data.channel
            });
            
            return;
        }
            
        if(data.auth !== channels.verifyAuth(connection, data.channel, data.data)) {
            sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_FAILED, {
                channel: data.channel,
                reason: 'Invalid credentials'
            });

            return;
        }
        
        if(data.data !== undefined) {
            presenceEnabled = true;
        }
    }
        
    var chan = channels.get(data.channel);
    if(!chan) {
        chan = new Channel(data.channel);
        chan.presenceEnabled = presenceEnabled;
        channels.add(data.channel, chan);
    } else {
        presenceEnabled = chan.presenceEnabled;
    }
    
    if(chan.hasMember(connection)) {
        sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_FAILED, {
            channel: data.channel,
            reason: "Already subscribed to this channel"
        });

        return;
    }
    
    chan.subscribe(connection, (presenceEnabled ? data.data : undefined));
};