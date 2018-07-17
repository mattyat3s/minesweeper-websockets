function Cell(i, j, game) {
  this.game = game;
  this.i = i;
  this.j = j;
  this.element = null;
  this.revealed = false;
  this.bee = false;
  this.neighborCount = 0;
}

Cell.prototype.reveal = function () {
  this.revealed = true;
  if (this.bee) {
    this.element.className = 'cell bee';
    if (this.bee) {
      this.game.gameOver();
    }
  } else {
    this.element.className = 'cell revealed';
  }

  if (this.neighborCount == 0) {
    this.floodFill();
  }
};

Cell.prototype.countBees = function () {
  if (this.bee) {
    this.neighborCount = -1;
    return;
  }
  var total = 0;
  for (var xoff = -1; xoff <= 1; xoff++) {
    for (var yoff = -1; yoff <= 1; yoff++) {
      var i = this.i + xoff;
      var j = this.j + yoff;
      if (i > -1 && i < this.game.gridSize && j > -1 && j < this.game.gridSize) {
        var neighbor = this.game.grid[i][j];
        if (neighbor.bee) {
          total++;
        }
      }
    }
  }
  this.neighborCount = total;
}

Cell.prototype.floodFill = function () {
  for (var xoff = -1; xoff <= 1; xoff++) {
    for (var yoff = -1; yoff <= 1; yoff++) {
      var i = this.i + xoff;
      var j = this.j + yoff;
      if (i > -1 && i < this.game.gridSize && j > -1 && j < this.game.gridSize) {
        var neighbor = this.game.grid[i][j];
        if (neighbor.revealed == false) {
          neighbor.reveal();
        }
      }
    }
  }
}

Cell.prototype.show = function () {
  var that = this;
  this.element = document.createElement('div');
  this.element.className = 'cell';

  var cellSize = that.game.canvas.clientWidth / that.game.gridSize;
  this.element.setAttribute('style', 'width: ' + (cellSize - 1) + 'px;height: ' + (cellSize - 1) + 'px;line-height: ' + cellSize + 'px;');
  this.element.i = this.i;
  this.element.j = this.j
  this.element.onmouseover = function(evt) {
    var element = evt.target;
    if (element.className.includes('revealed') == false) {
      element.className += ' hover';
    }
  }
  this.element.onmouseout = function(evt) {
    var element = evt.target;
    element.className = element.className
      .replace(' hover', '')
      .replace(' active', '');
  }
  if (mobile) {
    this.element.ontouchstart = function(evt) {
      that.active(that, evt);
    }
  } else {
    this.element.onmousedown = function(evt) {
      that.active(that, evt);
    }
  }
  if (mobile) {
    this.element.ontouchend = function(evt) {
      that.release(that, evt);
    }
  } else {
    this.element.onmouseup = function(evt) {
      that.release(that, evt);
    }
  }
  if (this.neighborCount > 0) {
    this.element.innerHTML = this.neighborCount;
  }

  this.game.canvas.appendChild(this.element)
};

Cell.prototype.active = function (that, evt) {
  var element = evt.target;
  if (element.className.includes('revealed') == false) {
    element.className = element.className.replace(' hover', '');
    element.className += ' active';
    that.game.canvas.className += 'active';
    that.game.canvas.onmouseout = function(evt) {
      that.game.canvas.className = that.game.canvas.className.replace('active', '');
    }
  }
}
Cell.prototype.release = function (that, evt) {
  var element = evt.target;
  element.className = element.className.replace(' active', '');
  that.game.canvas.className = that.game.canvas.className.replace('active', '');

  var i = element.i;
  var j = element.j;

  that.game.makeMove(i, j);
  that.game.sendMove(i, j);
}
