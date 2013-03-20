# Pushy Server

Pushy is a Publish/Subscribe system for realtime web applications. 
This is the server-side made on top of NodeJS and SockJS.

## Install node modules

```
npm install node-uuid
npm install sockjs
npm install express
```

## Run the service

### Start NodeJS/Pushy:

```
$ node pushy-server.js config.json
```

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

Example: we want to send a *test* event to the *hello* channel, the current timestamp is *123456789* and we don't send any data. Our secret key is *secret*.

```
signature string: hello:test:123456789:{}:secret
auth_key: d7f4c3309757c4025269b6576eae10028ec0711c88e6ef605bb44d149cb07803
```

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