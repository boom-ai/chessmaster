import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';

/**
 * Shared board wrapper (drag + click-to-move, legal-move dots, arrows, highlights).
 * Props:
 *  - fen, orientation, arrows [{startSquare,endSquare,color}], highlights [squares]
 *  - canDragPiece({piece, square}) => bool
 *  - onMove(from, to) => bool (parent validates via chess.js)
 *  - getLegalTargets(square) => [squares]
 *  - allowDrawingArrows
 */
export default function Board({
  fen,
  orientation = 'white',
  arrows = [],
  highlights = [],
  canDragPiece,
  onMove,
  getLegalTargets,
  allowDrawingArrows = true,
}) {
  const [selected, setSelected] = useState(null);
  const [dots, setDots] = useState([]);

  useEffect(() => {
    setSelected(null);
    setDots([]);
  }, [fen]);

  const showDots = (sq) => {
    if (!getLegalTargets || !sq) {
      setDots([]);
      return;
    }
    try {
      setDots(getLegalTargets(sq));
    } catch {
      setDots([]);
    }
  };

  const tryMove = (from, to) => {
    if (!onMove) return false;
    const ok = onMove(from, to);
    setSelected(null);
    setDots([]);
    return !!ok;
  };

  const squareStyles = {};
  for (const sq of highlights) {
    squareStyles[sq] = { backgroundColor: 'rgba(234, 179, 8, 0.45)' };
  }
  if (selected) {
    squareStyles[selected] = { backgroundColor: 'rgba(34, 197, 94, 0.55)' };
  }
  for (const sq of dots) {
    squareStyles[sq] = {
      backgroundImage: 'radial-gradient(circle, rgba(20,20,20,0.35) 22%, transparent 23%)',
    };
  }

  return (
    <div className="board-wrap">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDrawingArrows,
          arrows,
          squareStyles,
          animationDurationInMs: 200,
          ...(canDragPiece ? { canDragPiece } : {}),
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            return tryMove(sourceSquare, targetSquare);
          },
          onPieceDrag: ({ square }) => {
            showDots(square);
          },
          onSquareClick: ({ piece, square }) => {
            if (selected) {
              if (square === selected) {
                setSelected(null);
                setDots([]);
                return;
              }
              const ok = tryMove(selected, square);
              if (!ok && piece) {
                setSelected(square);
                showDots(square);
              }
              return;
            }
            if (piece) {
              setSelected(square);
              showDots(square);
            }
          },
        }}
      />
    </div>
  );
}
