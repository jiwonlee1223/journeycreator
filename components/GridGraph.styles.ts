export const CELL_SIZE = 50;

export const gridContainer = (cols: number, rows: number) => ({
  width: cols * CELL_SIZE,
  height: rows * CELL_SIZE,
  backgroundColor: "var(--color-background)",
});

export const gridStyle = (cols: number, rows: number) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
  gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
});

export const nodeFixedStyle = (color: string) =>
  ({
    backgroundColor: color,
    boxShadow: "0 0 6px var(--shadow-default)",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    opacity: 1,
  } as const);


export const contextMenuStyle = (x: number, y: number) => ({
  position: "fixed" as const,
  top: y,
  left: x,
  background: "var(--color-surface-variant)",
  border: "1px solid var(--color-divider)",
  borderRadius: "6px",
  padding: "4px",
  zIndex: 1000,
  listStyle: "none",
  boxShadow: "0 2px 10px var(--shadow-default)",
});

export const contextMenuItemStyle = {
  padding: "6px 12px",
  color: "var(--color-text-primary)",
  cursor: "pointer",
  transition: "background-color 0.2s ease",
};
