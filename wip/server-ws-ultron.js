const port = process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || process.env.PORT || process.argv[2] || 9000;

const Gun = require('gun');
// const Buffer = require('safe-buffer');
const jwt = require('jsonwebtoken');
const ws = require( 'ws' );
const Ultron = require('ultron');
const EventEmitter = require('events').EventEmitter; // or require('eventmitter3');
const serverEvents = new EventEmitter();

const env = {
  CLIENT_ID: process.env.CLIENT_ID || 'CLIENT_ID',
  CLIENT_SECRET: process.env.CLIENT_SECRET || 'CLIENT_SECRET',
  DOMAIN: process.env.DOMAIN   || 'DOMAIN'
};

///////// Start of Gun Server ///////////////////
Gun.on('out', function(msg){
	this.to.next( msg );
	msg = JSON.stringify(msg);
  console.log('1.out - : ', msg);
	gunPeers.forEach( function(peer){ peer.send( msg ) })
})

const gun = Gun({
	file: 'data.json'
});

////////// Start of HTTP server ///////////////////
const server = require('http').createServer(function(req, res){
	let insert = "";
	if( req.url.endsWith( "gun.js" ) )
		insert = "/";

	require('fs').createReadStream(require('path').join(__dirname, insert, req.url)).on('error',function(){ // static files!
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(require('fs').readFileSync(require('path').join(__dirname, 'index.html'))); // or default to index
	}).pipe(res); // stream
});

///////// Start of websocket server ///////////////
const WebSocketServer = ws.Server;

const wss = new WebSocketServer( {
        server: server, // 'ws' npm
        autoAcceptConnections : false // want to handle the request (websocket npm?)
    });
const HEARTBEAT_INTERVAL = 1 * 1000; // seconds

var gunPeers = ['http://localhost:9001/gun'];  // used as a list of connected clients.
// var isAlive = [];
// var isAlive = wss.isAlive;
var timerId = 0;

const processConnection = ( newConnection ) => {
  const connection = newConnection;
    // const Result = connection._isServer;
    const Result = connection._ultron.id
    console.log( "1.processConnection  Result ==> ", Result )
    /// keep-alive heartbeat ///
    const heartbeat = () => {console.log('2.processConnection client - GOOD heartbeat : ', connection._ultron.id)}


    /// helper functions ///
    const postAuthenticate = (socket, data) => {
      const currentConnection = socket;
      console.log('3.processConnection postAuthenticate - GOOD - : ', data);
      gunPeers.push( connection );
      keepAlive( connection );
      connection.on( 'error', (error) => {console.log( "4.WebSocket Error:", error) } );
      connection.on('message',  (msg) => {
         msg = JSON.parse(msg)
         if ("forEach" in msg) msg.forEach(m => gun.on('in', JSON.parse(m)));
         else gun.on('in', msg)
      });
      return
    };
    /// handle server events ///
    serverEvents.on('authenticate', (connection, message) => {
       console.log('5.authenticate : ', message)
       const currentConnection = connection;
       jwt.verify(message.token, 'secret', (err, decoded) => {
         if (err || !decoded) {
           badLogin(currentConnection, message);
           return
         }
        //now is authenticated
         postAuthenticate(currentConnection, message);
         console.log('6.jwt authenticated : ', decoded);
         currentConnection.send('Authenticated');
       });
       return
    }); // authenticate

    /// hande websocket requests //
    connection.on('message', sendServerEvent)
    connection.on('pong', heartbeat);
 } // processConnection

/////////////
const keepAlive = (connection) => {
    console.log('7.processConnection keepAlive');
    var timeout = HEARTBEAT_INTERVAL;
    if (connection.readyState == connection.OPEN) {
        connection.send('');
    }
    timerId = setTimeout(keepAlive, timeout);
}
const cancelKeepAlive = () => {
    console.log('8.processConnection cancelKeepAlive');
    if (timerId) {
        clearTimeout(timerId);
    }
}
 const disconnect = (connection) => {
   console.log('9.disconnected');
   // gunpeers gone.
   const i = gunPeers.findIndex( (p) => {return p===connection} );
   if( i >= 0 ) gunPeers.splice( i, 1 );
   cancelKeepAlive();
   connection.close();
 };
  /// send a server event
  const sendServerEvent = (message) => {
   console.log('10.sendServerEvent : ', message)
   try {
     var event = JSON.parse(message);
     serverEvents.emit(event.type, event.payload);
   } catch(err) {
     switch (err) {
       case 'not opened':
         console.log('11.sendServerEvent error : Socket CLOSED');
       break;
       default:
         console.log('12.sendServerEvent error : ' , err);
       break;
     }
   }
  }

  wss.on('connection', processConnection );
  wss.on('close', disconnect(wss));

  server.listen(port);

  console.log('0.Server started on port ' + port);
