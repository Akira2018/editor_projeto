import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ExportButtons = ({ canvasRef }) => {
  const exportPNG = () => {
    html2canvas(canvasRef.current, { backgroundColor: null }).then((canvas) => {
      const link = document.createElement('a');
      link.download = 'planta.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  const exportPDF = () => {
    html2canvas(canvasRef.current, { backgroundColor: null }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save('planta.pdf');
    });
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <button onClick={exportPNG} className="btn btn-primary">Exportar PNG</button>{' '}
      <button onClick={exportPDF} className="btn btn-success">Exportar PDF</button>
    </div>
  );
};

export default ExportButtons;
