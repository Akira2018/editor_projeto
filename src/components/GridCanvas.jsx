// src/components/GridCanvas.jsx
import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const GridCanvas = () => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const gridSize = 50; // 50px = 0.5 metro

  // Inicialização da grade + canvas
  useEffect(() => {
    const canvasEl = canvasRef.current;
    const canvas = new fabric.Canvas(canvasEl, {
      width: 1000,
      height: 600,
      backgroundColor: '#fff',
      selection: true,
    });

    fabricRef.current = canvas;

    // Grade vertical
    for (let i = 0; i < canvas.width; i += gridSize) {
      canvas.add(new fabric.Line([i, 0, i, canvas.height], {
        stroke: '#eee', selectable: false, evented: false, excludeFromExport: true
      }));
    }

    // Grade horizontal
    for (let i = 0; i < canvas.height; i += gridSize) {
      canvas.add(new fabric.Line([0, i, canvas.width, i], {
        stroke: '#eee', selectable: false, evented: false, excludeFromExport: true
      }));
    }

    // Snap ao mover
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      obj.set({
        left: Math.round(obj.left / gridSize) * gridSize,
        top: Math.round(obj.top / gridSize) * gridSize,
      });
    });
  }, []);

  // Funções de ação
  const adicionarParede = () => {
    const canvas = fabricRef.current;
    const parede = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 20,
      fill: '#888',
      lockScalingY: true,
      hasControls: true,
    });
    canvas.add(parede);
  };

  const adicionarPorta = () => {
    const canvas = fabricRef.current;
    fabric.Image.fromURL('/icones/porta.png', (img) => {
      img.set({ left: 200, top: 200, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
    });
  };

  const adicionarJanela = () => {
    const canvas = fabricRef.current;
    fabric.Image.fromURL('/icones/janela.png', (img) => {
      img.set({ left: 300, top: 200, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
    });
  };

  const adicionarTextoMedida = () => {
    const canvas = fabricRef.current;
    const texto = new fabric.Text('2,00 m', {
      left: 150,
      top: 130,
      fontSize: 14,
      fill: '#000',
    });
    canvas.add(texto);
  };

  const excluirSelecionado = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Editor de Plantas com Grade</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        maxWidth: '900px',
        margin: '0 auto 20px',
        padding: '0 16px'
      }}>
        <button onClick={adicionarParede} className="btn btn-dark">Adicionar Parede</button>
        <button onClick={adicionarPorta} className="btn btn-secondary">Adicionar Porta</button>
        <button onClick={adicionarJanela} className="btn btn-secondary">Adicionar Janela</button>
        <button onClick={adicionarTextoMedida} className="btn btn-info">Adicionar Medida</button>
        <button onClick={excluirSelecionado} className="btn btn-danger">Excluir Selecionado</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ border: '1px solid #ccc' }} />
      </div>
    </div>
  );
};

export default GridCanvas;

