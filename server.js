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
  Primus = require("primus");

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
// primus.authorize(authorize);

//
// `connection` is only triggered if the authorization succeeded.
//
primus.on("connection", function connection(spark) {
  gunPeers.push(spark);
  console.log("1.connection : SUCCESS : ", spark.id);
  const SUCCESS = { type: "authenticated", payload: "success" };
  spark.write(SUCCESS);

  spark.on("data", function(msg) {
    gunPeers.forEach(peer => {
      peer.send(msg);
    });
    msg = JSON.parse(msg);
    console.log("2.spark data : ", msg);
    if ("forEach" in msg)
      msg.forEach(m => {
        console.log("3.spark data : ", m);
        gun.on("in", JSON.parse(m));
      });
    else {
      gun.on("in", msg);
    }
  });

  spark.on("message", function(msg) {
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

  spark.on("close", function(reason, desc) {
    // gunpeers gone.
    var i = gunPeers.findIndex(function(p) {
      return p === connection;
    });
    if (i >= 0) gunPeers.splice(i, 1);
  });

  spark.on("error", function(error) {
    console.log("WebSocket Error:", error);
  });

  return;
});

//
// Begin accepting connections.
//
server.listen(PORT, function listening() {
  console.log(`Open http://localhost:${PORT} in your browser`);
});
