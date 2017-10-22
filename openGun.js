
var Gun = require('./gun');

var gunPeers = [];  // used as a list of connected clients.

module.exports.openGun = ( connection ) => {
    gunPeers.push( connection );

    gun.on('out', function(msg){
      console.log('1.gun out : ',msg);
    	this.to.next( msg );
    	msg = JSON.stringify(msg);
    	gunPeers.forEach( function(peer){ peer.send( msg ) })
    })

    connection.on( 'error',function(error){console.log( "WebSocket Error:", error) } );

    connection.on('data', function (msg) {
	      gunPeers.forEach( (peer) => { peer.send( msg ) })
        msg = JSON.parse(msg)
        console.log('2.gun data : ', msg);
        if ("forEach" in msg) msg.forEach(m => {
          console.log('3.gun data : ', m);
          gun.on('in', JSON.parse(m))
        });
        else {
          gun.on('in', msg)
        }
    })

    connection.on('message', function (msg) {
	      gunPeers.forEach( (peer) => { peer.send( msg ) })
        msg = JSON.parse(msg)
        console.log('4.gun message : ', msg);
        if ("forEach" in msg) msg.forEach(m => {
          console.log('5.gun message : ', m);
          gun.on('in', JSON.parse(m))
        });
        else {
          gun.on('in', msg)
        }

    })

    connection.on( 'close', function(reason,desc){
        // gunpeers gone.
        var i = gunPeers.findIndex( function(p){return p===connection} );
        if( i >= 0 )
            gunPeers.splice( i, 1 );

    })
}
