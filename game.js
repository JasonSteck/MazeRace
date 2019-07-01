//

function Maze({ rows, cols, start=0 }) {
  if (rows<2 || cols<2) throw new Error(`Rows and cols must be 2 or greater (rows: ${rows}, cols:${cols})`);
  const tCell = [0, -cols, 1, cols, -1]; // (none), up, right, down, left
  const tWall = [0, 1, 2, 2*cols + 1, 0]; // (none), up, right, down, left
  const { ShuffledHalls } = Maze;
  const totalCells = rows * cols;

  let q = undefined; // investigate queue
  let qi = undefined; // queue index
  let hi = undefined; // last hall index
  let all = undefined; // [true, true, false]
  let halls = undefined; // [ left wall of 4, top wall of 3, left wall of 1, ... ]
  let walls = undefined; // [0, 1, 3, ...]
  let visited = undefined; // visited cells
  let toExplore = undefined; // halls to explore

  const twoHalls = (a, b) => Math.floor(Math.random() * 2) ? (a<<3)+b : (b<<3)+a;
  const threeHalls = (exclude) => ShuffledHalls[6 * (exclude - 1) + Math.floor(Math.random() * 6)] & 0b000111111111;
  const fourHalls = () => ShuffledHalls[Math.floor(Math.random() * 24)];

  function setupHallChoices() {
    toExplore = new Array(totalCells);
    const lastRow = totalCells-cols;
    const lastCol = cols-1;

    // corners
    toExplore[0] = twoHalls(2,3);
    toExplore[lastCol] = twoHalls(3,4);
    toExplore[lastRow] = twoHalls(1,2);
    toExplore[totalCells-1] = twoHalls(1,4);
    // top/bottom
    for(let i=cols-2; i>0; i--) {
      toExplore[i] = threeHalls(1);
      toExplore[lastRow+i] = threeHalls(3);
    }
    // left/right
    for(let i=lastRow-cols; i > 0; i-=cols) {
      toExplore[i] = threeHalls(4);
      toExplore[lastCol+i] = threeHalls(2);
    }
    // center
    for(let i=lastRow-2; i>cols; i-=2) {
      for(let c=cols; c>2; c--) {
        toExplore[i] = fourHalls();
        i--;
      }
    }
  };

  function generate() {
    let x = undefined; // our cell
    let y = undefined; // next cell
    let dir = undefined;
    q = new Array(totalCells);
    q[0] = start;
    qi = 0;
    hi = -1;

    visited = new Array(totalCells);
    halls = new Array(totalCells * 2);
    walls = undefined;
    all = new Array((totalCells + cols) * 2).fill(true);

    // remove dangling walls from bottom wall
    for(let i=totalCells*2; i< all.length; i += 2) {
      all[i] = false;
    }

    setupHallChoices();

    visited[start] = true;
    while(qi >= 0) {
      // pop direction, remove cell if done
      x = q[qi]; // last in q
      dir = toExplore[x] & 7;
      toExplore[x] >>= 3;
      if (toExplore[x] === 0) qi--; // assume x is last in q when removing it

      // if unvisited
      //   then add cell to queue, open hall, repeat
      //   else repeat
      y = x + tCell[dir];
      if (visited[y]) continue;
      qi += 1;
      q[qi] = y;
      visited[y] = true;
      hi += 1;

      const hall = (x << 1) + tWall[dir];
      halls[hi] = hall;
      all[hall] = false;
    }
    halls.length = hi + 1;
    return self;
  };

  const self = {
    generate,
    get halls() {
      return halls;
    },
    get all() {
      return all;
    },
    get walls() {
      if(walls) return walls;

      let wi = 0;
      walls = new Array(totalCells * 2);
      all.forEach((isWall, i) => {
        if(isWall) {
          walls[wi] = i;
          wi += 1;
        }
      });

      walls.length = wi;
      return walls;
    },
    _move: (from, dir) => from + tCell[dir],
    _fromPos: pos => {
      const x = pos % cols;
      const y = (pos - x)/cols;
      return { x, y };
    },
    _toPos: (x,y) => y*cols + x,
    _print() {
      let str = '';
      for(let i=0; i<rows*cols;) {
        str += i++;
        if (i%cols === 0) str += '\n';
        else str += ' ';
      }
      console.log(str);
    },
  };
  return self;
}
// all combos of (3-bit) shuffled directions
Maze.ShuffledHalls = [
  0b001010011100, // 1, 2, 3, 4
  0b001010100011, // 1, 2, 4, 3
  0b001011010100, // 1, 3, 2, 4
  0b001011100010,
  0b001100010011,
  0b001100011010,
  0b010001011100,
  0b010001100011,
  0b010011001100,
  0b010011100001,
  0b010100001011,
  0b010100011001,
  0b011010001100,
  0b011010100001,
  0b011001010100,
  0b011001100010,
  0b011100010001,
  0b011100001010,
  0b100010011001,
  0b100010001011,
  0b100011010001,
  0b100011001010,
  0b100001010011,
  0b100001011010,
];

function Game() {
  let maze;
  let world;
  let player;
  const step = 7;
  const rows = 30;
  const cols = 30;
  const lineSize = 5;

  const canvasWidthTarget = 1000;
  const canvasHeightTarget = 1000;
  const canvasWidth = canvasWidthTarget - ((canvasWidthTarget - lineSize) % cols);
  const canvasHeight = canvasHeightTarget - ((canvasHeightTarget - lineSize) % rows);

  const colSize = (canvasWidth - lineSize) / Math.max(rows, cols);
  const cellSize = colSize - lineSize;

  // output
  const canvas = document.getElementById('canvas');
  if (!canvas) throw new Error('No #canvas found');
  const ctx = canvas.getContext("2d");

  // caching layer
  let mazeLayer = document.createElement('canvas');
  mazeLayer.width = canvas.width = canvasWidth;
  mazeLayer.height = canvas.height = canvasHeight;
  mazeLayerCtx = mazeLayer.getContext('2d');

  const heldKeys = {};

  const self = {
    debug: true,
    get maze() {
      return maze;
    },
    get world() {
      return world;
    },
    start() {
      window.addEventListener('keydown', self.onKeyDown);
      window.addEventListener('keyup', self.onKeyUp);

      // generate conceptual maze
      maze = Maze({ rows, cols });
      maze.generate();

      // create physics system with maze
      world = World({
        ctx,
        pxWidth: canvasWidth,
        pxHeight: canvasHeight,
        chunkSize: colSize,
      });
      world.addWalls(self.createWallRects(maze.walls));

      // create player
      player = world.addPlayer({
        x: (colSize+lineSize)/2 + 5,
        y: (colSize+lineSize)/2 + 5,
      });

      // create cached visual layer for maze
      self.createMazeDrawing();

      // start game loop
      self.intervalId = setInterval(() => {
        self.update();
        self.render();
      }, 50); // 16 ms for 60 fps
    },
    stop() {
       clearInterval(self.intervalId);
    },
    onKeyDown(e) { heldKeys[e.key] = true; },
    onKeyUp(e) { heldKeys[e.key] = false; },
    update() {
      let xVel = 0;
      let yVel = 0;

      if (heldKeys.ArrowUp || heldKeys.w) yVel -= step;
      else if (heldKeys.ArrowDown || heldKeys.s) yVel += step;

      if (heldKeys.ArrowLeft || heldKeys.a) xVel -= step;
      else if (heldKeys.ArrowRight || heldKeys.d) xVel += step;

      player.xVel = xVel;
      player.yVel = yVel;

      world.update();
    },
    render() {
      ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.drawImage(mazeLayer, 0, 0);

      world.draw(ctx);

      if(self.debug) {
        ctx.fillStyle = "#F00";
        const objects = world.getNearbyObjects(player.x, player.y);
        for(let id in objects) {
          const o = objects[id];

          ctx.fillRect(o.x, o.y, o.width, o.height);
        }
      }
    },
    createMazeDrawing() {
      mazeLayerCtx.fillStyle = "#000";
      for(let i=0; i<1000; i+=colSize) mazeLayerCtx.fillRect(i, 0, lineSize, 1000);
      for(let i=0; i<1000; i+=colSize) mazeLayerCtx.fillRect(0, i, 1000, lineSize);

      // white out the halls
      mazeLayerCtx.fillStyle = "#FFF";
      maze.halls.forEach(w => {
        const side = w & 1;
        const cell = w >> 1;
        const col = cell % cols;
        const row = (cell - col) / cols;
        if (side) {
          mazeLayerCtx.fillRect(
            col*colSize + lineSize,
            row*colSize - 1,
            cellSize,
            lineSize+2
          );
        } else {
          mazeLayerCtx.fillRect(
            col*colSize - 1,
            row*colSize + lineSize,
            lineSize+2,
            cellSize
          );
        }
      });
    },
    createWallRects(walls) {
      // account for shared left/right walls
      const rects = new Array(walls.length + rows);
      let ri = 0;

      const rightSide = cols*colSize;
      const wallSize = colSize + lineSize;

      function addRect(rect) {
        rects[ri++] = rect;
      }

      // block out the walls
      walls.forEach(w => {
        const side = w & 1;
        const cell = w >> 1;
        const col = cell % cols;
        const row = (cell - col) / cols;
        if (side) {
          addRect(Rect({
            x: col*colSize,
            y: row*colSize,
            width: wallSize,
            height: lineSize,
          }));
        } else {
          addRect(Rect({
            x: col*colSize,
            y: row*colSize,
            width: lineSize,
            height: wallSize,
          }));
        }
      });

      for(let r=0; r<rows; r++) {
        addRect(Rect({
          x: rightSide,
          y: r*colSize,
          width: lineSize,
          height: wallSize,
        }));
      }

      return rects; // should be correct size already
    }
  };

  return self;
};

function Rect(rect) {
  rect.midX = rect.x + rect.width/2;
  rect.midY = rect.y + rect.height/2;
  return rect;
}

function Player({ x, y, width=10, height=10 }) {
  const self = {
    x, y,
    xVel: 0,
    yVel: 0,
    width,
    height,
    draw(ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(self.x, self.y, self.width, self.height);
    }
  };
  return self;
}

function World({ ctx, pxWidth, pxHeight, chunkSize=50 }) {
  const entities = [];

  // if chunk size is too small, entities might pass through things
  // if chunk size is big then the game will probably slow down
  const colChunks = Math.ceil(pxWidth/chunkSize);
  let nextObjID = 1;

  const arrayDim = { length: colChunks + 1 }; // +1 for positive chunk padding
  const rowInit = () => Array.from(arrayDim, () => ({}));
  let chunks = Array.from(arrayDim, rowInit);

  // add negative chunk padding
  for(let r=colChunks; r>=0; r--) chunks[r][-1] = {};
  chunks[-1] = rowInit();
  chunks[-1][-1] = {};

  function addRect(rect) {
    const id = rect.id = nextObjID++;

    const col = Math.floor(rect.midX/chunkSize);
    const row = Math.floor(rect.midY/chunkSize);

    const topChunk = chunks[row-1];
    topChunk[col-1][id] = rect;
    topChunk[col][id] = rect;
    topChunk[col+1][id] = rect;

    const middleChunk = chunks[row];
    middleChunk[col-1][id] = rect;
    middleChunk[col][id] = rect;
    middleChunk[col+1][id] = rect;

    const bottomChunk = chunks[row+1];
    bottomChunk[col-1][id] = rect;
    bottomChunk[col][id] = rect;
    bottomChunk[col+1][id] = rect;
  }

  function getNearbyObjects(x, y) {
    const col = Math.floor(x/chunkSize);
    const row = Math.floor(y/chunkSize);

    if(!chunks[row]) return {};

    return chunks[row][col];
  }

  return {
    entities,
    chunks,
    update() {
      entities.forEach(e => {
        e.x += e.xVel;
        e.y += e.yVel;
      });
    },
    draw() {
      entities.forEach(e => {
        e.draw(ctx);
      });
    },
    addPlayer(p) {
      const player = Player(p);
      entities.push(player);
      return player;
    },
    addWalls(wallRects) {
      wallRects.forEach(w => addRect(w));
    },
    getNearbyObjects,
  };
}

game = Game()
game.start();
// setTimeout(game.stop, 500);
