// src/Editor.js
import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

function Editor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#f0f0f0',
    });

    // Exemplo: adiciona um retângulo ao carregar
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'gray',
      width: 60,
      height: 70,
    });
    canvas.add(rect);

    // Cleanup
    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div className="container">
      <h2>Editor de Projeto</h2>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default Editor;
