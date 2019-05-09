const canvas = document.getElementById('canvas');
if (!canvas) throw new Error('No #canvas found');

const ctx = canvas.getContext("2d");
// ctx.fillStyle = "#FF0000";
// ctx.fillRect(0, 0, 98.5, 75);

function Board({ rows, cols, start=0 }) {
  if (rows<2 || cols<2) throw new Error(`Rows and cols must be 2 or greater (rows: ${rows}, cols:${cols})`);
  const aim = [0, -cols, 1, cols, -1]; // stay, up, right, down, left
  const { ShuffledHalls } = Board;
  const totalCells = rows * cols;
  const q = [start];

  const visited = new Array(totalCells);
  const toExplore = new Array(totalCells); // halls to explore
  const finalHalls = new Array(totalCells * 2); // [ left wall of 0, top wall of 0, left wall of 1, top wall of 1... ]

  const fourHalls = () => ShuffledHalls[Math.floor(Math.random() * 24)];
  const threeHalls = (exclude) => ShuffledHalls[6 * (exclude - 1) + Math.floor(Math.random() * 6)] & 0b000111111111;
  const twoHalls = (a, b) => Math.floor(Math.random() * 2) ? (a<<3)+b : (b<<3)+a;

  +function setupHallChoices() {
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
  }();

  +function generateMaze() {

  }();

  const self = {
    _move: (from, dir) => from + aim[dir],
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
    _getHalls(v) {
      return v.toString(2).padStart(12,'0').match(/(...)/g).map(s => parseInt(s,2)).join('-');
    },
    _showAllHalls() {
      const n = self._getHalls;
      let str = '';
      for(let i=0; i<rows*cols;) {
        str += n(toExplore[i] || 0);
        i++;
        if (i%cols === 0) str += '\n';
        else str += '  ';
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

b = Board({ rows: 4, cols: 5 });
b._showAllHalls();

function Game() {
  const step = 10;

  let board;
  let x = 0;
  let y = 0;
  const heldKeys = {};
  const releasedKeys = {};

  const self = {
    async start() {
      window.addEventListener('keydown', self.onKeyDown);
      window.addEventListener('keyup', self.onKeyUp);
      board = generateBoard();
      setInterval(() => {
        self.update();
        self.render();
      }, 33); // 30 fps
    },
    onKeyDown(e) { heldKeys[e.key] = true; },
    onKeyUp(e) { heldKeys[e.key] = false; },
    update() {
      if (heldKeys.ArrowUp) y -= step;
      else if (heldKeys.ArrowDown) y += step;
      else if (heldKeys.ArrowLeft) x -= step;
      else if (heldKeys.ArrowRight) x += step;

      for(const p in releasedKeys) {
        heldKeys[p] = false;
        releasedKeys[p] = true;
      }
    },
    render() {
//       ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.fillRect(x, y, 10, 10);
    },
  };

  return self;
};

// Game().start();


// Checkerboard
// let str = '';
// const w = 7;
// const w2 = 1-w%2;
// for(let i=0; i<42; i++) {
//   const x = i % w;
//   const y = (i - x)/w;
//   if (x === 0) str += '\n';
//   str += (i + y*w2) % 2;
// }
// console.log(str);
