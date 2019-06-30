//

function Board({ rows, cols, start=0 }) {
  if (rows<2 || cols<2) throw new Error(`Rows and cols must be 2 or greater (rows: ${rows}, cols:${cols})`);
  const tCell = [0, -cols, 1, cols, -1]; // (none), up, right, down, left
  const tWall = [0, 1, 2, 2*cols + 1, 0]; // (none), up, right, down, left
  const { ShuffledHalls } = Board;
  const totalCells = rows * cols;

  let q = undefined; // investigate queue
  let qi = undefined; // queue index
  let hi = undefined; // last hall index
  let walls = undefined; // [true, true, false]
  let visited = undefined; // visited cells
  let toExplore = undefined; // halls to explore
  let halls = undefined; // [ left wall of 4, top wall of 3, left wall of 1, ... ]

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

  function generateMaze() {
    let x = undefined; // our cell
    let y = undefined; // next cell
    let dir = undefined;
    q = new Array(totalCells);
    q[0] = start;
    qi = 0;
    hi = -1;

    visited = new Array(totalCells);
    halls = new Array(totalCells * 2); // in created order
    maze = new Array(totalCells * 2).fill(true);
    walls = undefined; // in number order

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
      maze[hall] = false;
    }
    halls.length = hi + 1;
    return self;
  };

  const self = {
    generateMaze,
    get halls() {
      return halls;
    },
    get maze() {
      return maze;
    },
    get walls() {
      if(walls) return walls;

      let wi = 0;
      walls = new Array(totalCells * 2);
      maze.forEach((isWall, i) => {
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
Board.ShuffledHalls = [
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

function Rect(rect) {
  rect.midX = rect.x + rect.width/2;
  rect.midY = rect.y + rect.height/2;
  return rect;
}

function Game() {
  let board;
  let world;
  const rows = 30;
  const cols = 30;
  const lineSize = 5;

  const canvasWidthTarget = 1000;
  const canvasHeightTarget = 1000;

  const canvasWidth = canvasWidthTarget - ((canvasWidthTarget - lineSize) % cols);
  const canvasHeight = canvasHeightTarget - ((canvasHeightTarget - lineSize) % rows);

  // output
  const canvas = document.getElementById('canvas');
  if (!canvas) throw new Error('No #canvas found');
  const ctx = canvas.getContext("2d");

  // caching layer
  let mazeLayer = document.createElement('canvas');
  mazeLayer.width = canvas.width = canvasWidth;
  mazeLayer.height = canvas.height = canvasHeight;
  mazeLayerCtx = mazeLayer.getContext('2d');

  const colSize = (canvasWidth - lineSize) / Math.max(rows, cols);
  const cellSize = colSize - lineSize;

  let player;
  let x = (colSize+lineSize)/2;
  let y = (colSize+lineSize)/2;
  const pWidth = 10;
  const pHeight = 10;
  const halfPW = pWidth/2;
  const halfPH = pHeight/2;

  const step = 7;
  const heldKeys = {};
  const releasedKeys = {};

  const self = {
    debug: true,
    get board() {
      return board;
    },
    get world() {
      return world;
    },
    start() {
      window.addEventListener('keydown', self.onKeyDown);
      window.addEventListener('keyup', self.onKeyUp);

      // generate conceptual maze
      board = Board({ rows, cols });
      board.generateMaze();

      // create physics system with maze
      world = World({
        pxWidth: canvasWidth,
        pxHeight: canvasHeight,
        chunkSize: colSize,
      });
      world.addWalls(self.createWallRects(board.walls));

      // create player
      player = world.addPlayer({ x, y });

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

      if (heldKeys.ArrowUp) yVel -= step;
      else if (heldKeys.ArrowDown) yVel += step;

      if (heldKeys.ArrowLeft) xVel -= step;
      else if (heldKeys.ArrowRight) xVel += step;

      x += xVel;
      y += yVel;

      world.getNearbyObjects(x,y);
    },
    render() {
      ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.drawImage(mazeLayer, 0, 0);

      ctx.fillStyle = "#000";
      ctx.fillRect(x-halfPW, y-halfPH, pWidth, pHeight);

      if(self.debug) {
        ctx.fillStyle = "#F00";
        const objects = world.getNearbyObjects(x, y);
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
      board.halls.forEach(w => {
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
      // block out the walls
      return walls.map(w => {
        const side = w & 1;
        const cell = w >> 1;
        const col = cell % cols;
        const row = (cell - col) / cols;
        if (side) {
          return Rect({
            x: col*colSize,
            y: row*colSize,
            width: colSize + lineSize,
            height: lineSize,
          });
        } else {
          return Rect({
            x: col*colSize,
            y: row*colSize,
            width: lineSize,
            height: colSize + lineSize,
          });
        }
      });
    }
  };

  return self;
};

function World({ pxWidth, pxHeight, chunkSize=50 }) {
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
    get chunks() {
      return chunks;
    },
    addWalls(wallRects) {
      wallRects.forEach(w => addRect(w));
    },
    addPlayer({ x, y }) {

    },
    getNearbyObjects,
  };
}

game = Game()
game.start();
// setTimeout(game.stop, 500);
