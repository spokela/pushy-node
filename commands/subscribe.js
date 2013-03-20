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
        
    // require auth
    var chan = (channels.get(data.channel) || new Channel(data.channel));
    if(chan.authRequired === true) {
        if(data.auth === undefined || data.auth.trim() == "") {
            sockjs.sendEvent(connection, events.PUSHY_NEEDAUTH, {
                channel: data.channel
            });
            
            return;
        }
            
        if(data.auth !== chan.verifyAuth(connection, data.data, channels.secretKey)) {
            sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_FAILED, {
                channel: data.channel,
                reason: 'Invalid credentials'
            });

            return;
        }
        
        if(data.data !== undefined && !channels.exists(data.channel)) {
            chan.presenceEnabled = true;
        }
    }
        
    if(!channels.exists(data.channel)) {
        channels.add(data.channel, chan);
        
        console.log('[channel: '+ data.channel +'] channel created.');

        chan.on('member:add', function(memberId) {
            console.log('[channel: '+ data.channel +'] member added: '+ memberId +' (total: '+ chan.countMembers().toString() +')');
        });
        
        chan.on('member:quit', function(memberId, reason) {
           console.log('[channel: '+ data.channel +'] member removed: '+ memberId +' - reason: '+ reason); 
        });
        
    } 
    
    if(chan.hasMember(connection)) {
        sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_FAILED, {
            channel: data.channel,
            reason: "Already subscribed to this channel"
        });

        return;
    }
    
    data = chan.subscribe(connection, (chan.presenceEnabled ? data.data : undefined));
    
    // send confirmation to client
    sockjs.sendEvent(connection, events.PUSHY_SUBSCRIPTION_SUCCESS, data);
};