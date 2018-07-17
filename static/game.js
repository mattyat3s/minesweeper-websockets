function Game(params) {
  var that = this;

  this.url      = params.url;
  this.element  = document.getElementById(params.elementID);
  this.gridSize = params.gridSize;
  this.bees     = params.bees;
  this.gameID   = params.gameID;

  this.grid    = this.make2DArray(this.gridSize);
  this.joining = false;
  this.webSocket;
  this.clientIP;

  // create dom elements
  this.info = document.createElement("div");
  this.info.id = "gameID";
  this.canvas = document.createElement("div");
  this.canvas.id = "canvas";
  this.players = document.createElement("div");
  this.players.id = "players";
  this.element.innerHTML = "";
  this.element.appendChild(this.info);
  this.element.appendChild(this.canvas);
  this.element.appendChild(this.players);

  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      this.grid[i][j] = new Cell(i, j, that);
    }
  }

  if (this.gameID !== "") {
    this.joining = true;
    this.info.innerHTML = "Joining...";
    this.connectToServer();
  } else {
    this.requestGameID(function(gameID) {
      that.gameID = gameID;
      that.connectToServer();
    });
  }
}

/*
  default functions
*/
Game.prototype.requestGameID = function (complete) {
  var that = this;
  fetch("http://" + this.url + "/getGameID/").then(function(response) {
    return response.json();
  }).then(function(gameID) {
    complete(gameID);
  }).catch(function(error) {
    console.log('There has been a problem with your fetch operation: ' + error.message);
  });
}
Game.prototype.connectToServer = function () {
  var that = this;
  try {
    this.webSocket = new WebSocket("ws://" + this.url + "/sock/" + that.gameID);
    this.webSocket.onmessage = function(event) {
      var msg = JSON.parse(event.data);

      var player = document.getElementById(msg.clientIP);
      if (player === null) {
        player = document.createElement("div");
        player.id = msg.clientIP;
        player.innerHTML = msg.clientIP;
        that.players.appendChild(player);
      }

      switch(msg.type) {
        case "setup":
          that.clientIP = msg.clientIP
          if (that.joining === false) {
            that.play();
          } else {
            if (msg.playerCount == 1) {
              that.info.innerHTML = 'This game has finished';
              that.canvas.parentNode.removeChild(that.canvas);
            }
          }
          break;
        case "playerJoined":
          if (that.joining === false && msg.clientIP !== that.clientIP) {
            that.info.innerHTML = msg.clientIP + ' has joined';
            that.sendCurrentState();
          }
          break;
        case "playerLeft":
          if (msg.clientIP !== that.clientIP) {
            var player = document.getElementById(msg.clientIP);
            player.parentNode.removeChild(player);
            that.info.innerHTML = msg.clientIP + ' has left';
          }
          break;
        case "currentState":
          if (that.joining === true && msg.clientIP !== that.clientIP) {
            that.play(msg);
            that.joining = false;
          }
          break;
        case "move":
          if (msg.clientIP !== that.clientIP) {
            that.info.innerHTML = msg.clientIP + ' has made a move';
            that.makeMove(msg.i, msg.j)
          }
          break;
      }
    }
  } catch(exception) {
    console.log(exception);
  }
}
Game.prototype.play = function (currentState) {
  if (currentState) {
    this.setBeeLocations(currentState.beeLocations);
  } else {
    this.getBeeLocations();
  }

  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      this.grid[i][j].countBees();
    }
  }

  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      this.grid[i][j].show();
    }
  }

  if (currentState) {
    this.setRevealedLocations(currentState.revealedLocations);
  }

  this.info.innerHTML = "Play";
  gameID.value = this.gameID;
  history.pushState("", "", this.gameID);
}
Game.prototype.sendMove = function (i, j) {
  var msg = {
    type: "move",
    clientIP: this.clientIP,
    i: i,
    j: j,
    revealedLocations: [],
    beeLocations: []
  };
  this.webSocket.send(JSON.stringify(msg));
}
Game.prototype.makeMove = function (i, j) {
  this.grid[i][j].reveal();
}
Game.prototype.gameOver = function () {
  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      if (this.grid[i][j].revealed == false) {
        this.grid[i][j].reveal();
      }
    }
  }
}

/*
  game functions
*/
Game.prototype.randomIntFromInterval = function (min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}
Game.prototype.make2DArray = function (gridSize) {
  arr = new Array(gridSize);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(gridSize);
  }
  return arr;
}
Game.prototype.getBeeLocations = function () {
  var options = Array();

  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      options.push({i: i, j: j});
    }
  }

  for (var n = 0; n < this.bees; n++) {
    var index = this.randomIntFromInterval(0, options.length-1);
    var bee = options[index];
    var i = bee.i;
    var j = bee.j;
    options.splice(index, 1);

    this.grid[i][j].bee = true;
  }
}
Game.prototype.setRevealedLocations = function (revealedLocations) {
  for (var n = 0; n < revealedLocations.length; n++) {
    var cell = revealedLocations[n];
    var i = cell.i;
    var j = cell.j;
    this.grid[i][j].reveal();
  }
}
Game.prototype.setBeeLocations = function (beeLocations) {
  for (var n = 0; n < beeLocations.length; n++) {
    var cell = beeLocations[n];
    var i = cell.i;
    var j = cell.j;
    this.grid[i][j].bee = true;
  }
}
Game.prototype.sendCurrentState = function () {
  var revealedLocations = Array();
  var beeLocations      = Array();

  for (var i = 0; i < this.gridSize; i++) {
    for (var j = 0; j < this.gridSize; j++) {
      if (this.grid[i][j].revealed) {
        revealedLocations.push({i: i, j: j});
      }
      if (this.grid[i][j].bee) {
        beeLocations.push({i: i, j: j});
      }
    }
  }

  var msg = {
    type: "currentState",
    clientIP: this.clientIP,
    i: null,
    j: null,
    revealedLocations: revealedLocations,
    beeLocations: beeLocations
  };
  this.webSocket.send(JSON.stringify(msg));
}
