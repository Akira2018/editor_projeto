import React, { useState } from 'react';
import Toolbar from './components/Toolbar';
import CanvasArea from './components/CanvasArea';
import './styles/App.css';
import { fabric } from 'fabric';

const CanvasEditor = () => {
  const [canvas, setCanvas] = useState(null);

  const adicionarParede = () => {
    if (!canvas) return;
    const parede = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 20,
      fill: '#888',
      lockScalingY: true
    });
    canvas.add(parede);
  };

  const adicionarPorta = () => {
    if (!canvas) return;
    fabric.Image.fromURL('/assets/icones/porta.png', (img) => {
      img.set({ left: 150, top: 200, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
    });
  };

  const adicionarJanela = () => {
    if (!canvas) return;
    fabric.Image.fromURL('/assets/icones/janela.png', (img) => {
      img.set({ left: 250, top: 200, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
    });
  };

  const adicionarTextoMedida = () => {
    if (!canvas) return;
    const texto = new fabric.Text('2,00 m', {
      left: 150,
      top: 150,
      fontSize: 14,
      fill: '#000'
    });
    canvas.add(texto);
  };

  const excluirSelecionado = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  return (
    <div className="editor-container">
      <h2>Editor de Plantas Online</h2>
      <Toolbar
        onAdicionarParede={adicionarParede}
        onAdicionarPorta={adicionarPorta}
        onAdicionarJanela={adicionarJanela}
        onAdicionarTextoMedida={adicionarTextoMedida}
        onExcluirSelecionado={excluirSelecionado}
      />
      <CanvasArea setCanvas={setCanvas} />
    </div>
  );
};

export default CanvasEditor;

