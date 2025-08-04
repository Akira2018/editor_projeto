
import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

function App() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [wallStartPoint, setWallStartPoint] = useState(null);

  useEffect(() => {
    const fabricCanvas = new fabric.Canvas('canvas', {
      width: 1000,
      height: 800,
      backgroundColor: '#fff',
    });
    setCanvas(fabricCanvas);

    const gridSize = 20;
    for (let i = 0; i < 1000 / gridSize; i++) {
      fabricCanvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, 800], { stroke: '#ccc', selectable: false }));
    }
    for (let i = 0; i < 800 / gridSize; i++) {
      fabricCanvas.add(new fabric.Line([0, i * gridSize, 1000, i * gridSize], { stroke: '#ccc', selectable: false }));
    }

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!canvas) return;

    const handleClick = (opt) => {
      if (!isDrawingWall) return;
      const pointer = canvas.getPointer(opt.e);
      if (!wallStartPoint) {
        setWallStartPoint(pointer);
      } else {
        const line = new fabric.Line([
          wallStartPoint.x, wallStartPoint.y, pointer.x, pointer.y
        ], {
          stroke: 'black',
          strokeWidth: 3,
          selectable: true,
        });
        canvas.add(line);
        setWallStartPoint(null);
        setIsDrawingWall(false);
      }
    };

    canvas.on('mouse:down', handleClick);
    return () => canvas.off('mouse:down', handleClick);
  }, [canvas, isDrawingWall, wallStartPoint]);

  const addRect = () => {
    const rect = new fabric.Rect({
      left: 100, top: 100, fill: 'red', width: 60, height: 60
    });
    canvas.add(rect);
  };

  const addCircle = () => {
    const circle = new fabric.Circle({
      left: 200, top: 200, radius: 30, fill: 'green'
    });
    canvas.add(circle);
  };

  const addText = () => {
    const text = new fabric.IText('Digite aqui', {
      left: 300, top: 300, fontSize: 20
    });
    canvas.add(text);
  };

  const deleteSelected = () => {
    const active = canvas.getActiveObject();
    if (active) canvas.remove(active);
  };

  const exportPNG = () => {
    const dataURL = canvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'planta.png';
    link.click();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Editor de Plantas Online</h1>
      <div style={{ marginBottom: 10 }}>
        <button onClick={addRect}>Retângulo</button>
        <button onClick={addCircle}>Círculo</button>
        <button onClick={addText}>Texto</button>
        <button onClick={() => setIsDrawingWall(true)}>Desenhar Parede</button>
        <button onClick={deleteSelected}>Deletar</button>
        <button onClick={exportPNG}>Exportar PNG</button>
      </div>
      <canvas id="canvas" ref={canvasRef} style={{ border: '1px solid #000' }}></canvas>
    </div>
  );
}

export default App;
