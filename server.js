"use strict";
const PORT =
  process.env.OPENSHIFT_NODEJS_PORT ||
  process.env.VCAP_APP_PORT ||
  process.env.PORT ||
  process.argv[2] ||
  8080;
//
// Require all dependencies.
//
const bodyParser = require("body-parser"),
  express = require("express"),
  http = require("http"),
  Gun = require("gun"),
  levelup = require("levelup"),
  leveldown = require("leveldown"),
  Primus = require("primus.io");
// rooms = require("primus-rooms");

require("gun-level");

const levelDB = levelup("./data/local-data/", {
  db: leveldown
});
const gun = new Gun({
  level: levelDB,
  file: false
});

var gunPeers = []; // used as a list of connected clients.

Gun.on("out", function(msg) {
  this.to.next(msg);
  msg = JSON.stringify(msg);
  console.log("1.Gun out : ", msg);
  gunPeers.forEach(function(peer) {
    peer.send(msg);
  });
});

const authorize = require("./authorize");
// const { useGun } = require('./useGun');
// const { openGun } = require('./openGun');
//
// Create an Express and Primus server.
//
const app = express();
const server = http.createServer(app),
  primus = new Primus(server);

app.use(express.static(__dirname));
app.use(bodyParser.json());
// useGun(primus);

// save current in memory primus.js for frontend access
primus.save(__dirname + "/primus.js");
//
// Add the authorization hook.
//
primus.authorize(authorize);

// Add room plugin
// primus.plugin("rooms", rooms);

//
// `connection` is only triggered if the authorization succeeded.
//
primus.on("connection", spark => {
  gunPeers.push(spark);
  console.log("1.connection : SUCCESS : ", spark.id);
  const SUCCESS = { type: "authenticated", payload: "success" };
  spark.write(SUCCESS);

  // rooms
  const joinRoom = room => {
    spark.join(room, () => {
      // send message to this client
      spark.send(["sport", "you joined room " + room]);
      console.log("1.joinRoom : ", room);
      // send message to all clients except this one
      spark
        .room(room)
        .except(spark.id)
        .write("sport", spark.id + " joined room " + room);
    });
  };

  const leaveRoom = room => {
    spark.leave(room, () => {
      // send message to this client
      spark.send("sport", "you left room " + room);
      console.log("1.leaveRoom : ", room);
    });
  };
  const updateGundb = msg => {
    gunPeers.forEach(peer => {
      if (peer) peer.write(msg);
    });
    // msg = JSON.parse(msg);
    console.log("1.updateGundb : ", msg);
    if ("forEach" in msg)
      msg.forEach(m => {
        console.log("2.updateGundb : ", m);
        gun.on("in", JSON.parse(m));
      });
    else {
      gun.on("in", msg);
    }
  };
  // gundb
  spark.on("data", msg => {
    console.log("1.data : ", msg);
    if (msg.type === 0 && msg.data.length && msg.data) {
      const choice = msg.data[0];
      // console.log("2.data choice : ", choice);
      switch (choice) {
        case "join":
          // console.log("3.data choice join");
          joinRoom(msg.data[1]);
          break;
        case "leave":
          // console.log("4.data choice leave");
          leaveRoom(msg.data[1]);
          break;
        default:
          console.log("5.data choice default");
          updateGundb(msg);
          break;
      }
    }
  });

  spark.on("message", msg => {
    console.log("message : ", msg);
    gunPeers.forEach(peer => {
      peer.send(msg);
    });
    msg = JSON.parse(msg);
    console.log("4.spark message : ", msg);
    if ("forEach" in msg)
      msg.forEach(m => {
        console.log("5.spark message : ", m);
        gun.on("in", JSON.parse(m));
      });
    else {
      gun.on("in", msg);
    }
  });

  spark.on("close", (reason, desc) => {
    console.log("close : ", reason, desc);
    // gunpeers gone.
    var i = gunPeers.findIndex(p => {
      return p === connection;
    });
    if (i >= 0) gunPeers.splice(i, 1);
  });

  spark.on("error", error => {
    console.log("WebSocket Error:", error);
  });

  return;
});

//
// Begin accepting connections.
//
server.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT} in your browser`);
});
