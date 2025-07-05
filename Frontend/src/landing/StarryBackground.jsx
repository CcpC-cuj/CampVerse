// StarryUniverse.jsx
import { useRef, useEffect } from 'react';

export default function StarryUniverse() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 400 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5,
      opacity: Math.random(),
    }));

    function drawNebulaBackground() {
      ctx.fillStyle = '#000010';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 200 + 50;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${100 + Math.random() * 155}, 0, ${100 + Math.random() * 155}, ${0.1 + Math.random() * 0.2})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }

    function drawStars() {
      stars.forEach(({ x, y, radius, opacity }) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.closePath();
      });
    }

    drawNebulaBackground();
    drawStars();
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-[-1]" />;
}
