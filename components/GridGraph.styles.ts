// GridGraph.styles.ts
const CELL_SIZE = 50;

const styles = {
  buttonMargin: { marginLeft: 10 },
  gridContainer: (cols: number, rows: number) => ({
    width: cols * CELL_SIZE,
    height: rows * CELL_SIZE,
  }),
  grid: (cols: number, rows: number) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
    gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`
  }),
  nodeFixed: (color: string) => ({
    backgroundColor: color,
  }),
  contextMenu: (x: number, y: number) => ({
    position: 'fixed' as const,
    top: y,
    left: x,
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '4px',
    zIndex: 1000,
    listStyle: 'none'
  }),
  contextMenuItem: {
    padding: '4px 8px',
    cursor: 'pointer'
  }
};

export default styles;
