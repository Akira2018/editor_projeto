import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const CanvasArea = ({ gridSize = 50, setCanvas }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = new fabric.Canvas('editor-canvas', {
      width: 1000,
      height: 600,
      backgroundColor: '#fff',
      selection: true
    });

    canvasRef.current = canvas;
    setCanvas(canvas);

    // grade
    for (let x = 0; x <= canvas.width; x += gridSize) {
      canvas.add(new fabric.Line([x, 0, x, canvas.height], {
        stroke: '#eee',
        selectable: false,
        excludeFromExport: true
      }));
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      canvas.add(new fabric.Line([0, y, canvas.width, y], {
        stroke: '#eee',
        selectable: false,
        excludeFromExport: true
      }));
    }

    canvas.on('object:moving', (e) => {
      const obj = e.target;
      obj.set({
        left: Math.round(obj.left / gridSize) * gridSize,
        top: Math.round(obj.top / gridSize) * gridSize,
      });
    });
  }, [gridSize, setCanvas]);

  return (
    <div className="canvas-wrapper">
      <canvas id="editor-canvas" style={{ border: '1px solid #ccc' }} />
    </div>
  );
};

export default CanvasArea;

