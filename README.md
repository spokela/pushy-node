# Pushy Server

Pushy is a Publish/Subscribe system for realtime web applications. 
This is the server-side made on top of NodeJS and SockJS.

UNMAINTAINED / OBSOLETE

## Install via NPM

```
npm install DEPRECATED
```

Create a bootstrap-file ```pushy-server.js```:

```javascript
var pushy = require('pushy');

// Initialize/launch the server and register commands callbacks.
// Commands are functions accessible from client-side. They allow the user to
// perform various actions throught his sockjs connection. Pushy comes with only
// two commands: SUBSCRIBE and UNSUBSCRIBE.
pushy.init(
    // configuration
    {
        "port": 8234,
        "secretKey": "mySuperSecretKey",
        "ssl": false,

        "sockjs": {
           "prefix": "/pushy/socket",
           "sockjs_url": "http://cdn.sockjs.org/sockjs-0.3.min.js",
           "websocket": true,
           "response_limit": "128K",
           "jsessionid": false,
           "heartbeat_delay": 25,
           "disconnect_delay": 5
        }
    }, 
    // commands callbacks
    {
        subscribe: require('./node_modules/pushy/commands/subscribe'),
        unsubscribe: require('./node_modules/pushy/commands/unsubscribe')
        // add your commands here to extend functionnality of your pushy-server
    }
);
```

Run the service:

```
$ node pushy-server.js
```

# Usage

### Trigger an event on a channel

To trigger an event on a specific channel, hit the following URL with the required parameters. POST data will be sent alongside the event.

``` 
http(s)://<pushy-host>:<pushy-port>/pushy/channel/<channel-name>/trigger?event=<event-name>&timestamp=<current-ts>&auth_key=<auth-key>
``` 

Parameters:
* ```pushy-host``` : the hostname of your Pushy server
* ```pushy-port``` : the listening port you defined in *config.json*
* ```channel-name``` : name of the channel where the event should be dispatched
* ```event-name``` : name of the event
* ```current-ts``` : your app's timestamp (UNIXTIME). 600 seconds difference (+/-) is tolerated.
* ```auth-key``` : SHA256 auth key for this command (read more bellow)

### Generating authentication key

The authentication key is a SHA256 sum of:

```
<channel>:<event>:<timestamp>:<JsonEncodedBody>:<secretKey>
``` 

Example: we want to send a *test* event to the *Hello* channel, the current timestamp is *123456789* and we don't send any data. Our secret key is *secret*.

```
signature string: hello:test:123456789:{}:secret
auth_key: d7f4c3309757c4025269b6576eae10028ec0711c88e6ef605bb44d149cb07803
```

## Private and Presence-enabled Channels

Any channel named ```private-```something will require an authentification string sent on subscription. If any complementary data is sent, *presence* will be enabled too. 

### Authentication

The authentication token should be generated server-side when requested by the client. Then the client should resend his subscription request with this token. 
The authentication token is a SHA256 hash generated by this signature string:

```
<connection_id>:<channel>[:<JsonEncodedPresenceData>]:<secretKey>
``` 

Parameters:
* ```connection_id``` : The connection ID (given to client on connection)
* ```channel``` : Lowercased channel name
* ```JsonEncodedPresenceData``` *optional* : Json encoded presence data (if any)
* ```secretKey``` : Your configured secret key

### Presence-enabled channels

When *presence* is enabled on a channel, presence data sent on subscription will be shared between members everytime a new subscriber join.

The channel will trigger two additionnal events:

* ```pushy:presence-add``` : when a new subscriber join (with its presence data)
* ```pushy:presence-quit``` : when a subscriber quit

When subscribing to a presence-enabled channel, the client will recieve presence data from all current subscribers.

**IMPORTANT** : Presence data is SHARED so please don't put passwords or any sensitive data here. Since its sent very often, it might also be a good idea to keep this data as light as possible (just a username and his avatar-url for example).

## Configuration parameters

* ```port``` *int* : HTTP Port number (default is 8123)
* ```secretKey``` *string* : Secret/long string used server-side to do authentification.
* ```ssl``` *boolean* : Run as an HTTPS server (defaults to false)
* ```sockjs``` *object* : Default SockJS options (see SockJS documentation)

## Commands

Commands are callables made available to the client to interact with your Pushy server througth the SockJS socket. Obviously, the two default commands are *SUBSCRIBE* and *UNSUBSCRIBE* but you can easily add other commands to fit your needs. This can be useful for games, chats etc..

A command signature looks like this:

``` javascript
// Command example
//
// @param SockJsServer     sockjs     The SockJS server handle (@see lib/sockjs-server.js)
// @param SockJSConnection connection The SockJS connection handle sending the command
// @param Object           data       Data sent alongside the command
// @param Manager          channels   Channels Manager instance (@see lib/manager.js)
function(sockjs, connection, data, channels) {
    // do something
} 
```

## LICENSE

This software is licensed under the MIT License. Please refer to the LICENSE file for more details.

```
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
