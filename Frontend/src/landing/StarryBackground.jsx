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

    function drawGradientBackground() {
      // Draw galaxy gradient
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        100,
        width / 2,
        height / 2,
        width
      );
      gradient.addColorStop(0, '#1a0025');   // inner purple
      gradient.addColorStop(0.3, '#0b0033'); // dark blue
      gradient.addColorStop(1, '#000010');   // deep black
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    function drawStars() {
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.closePath();
      });
    }

    function animate() {
      drawGradientBackground();
      drawStars();
      requestAnimationFrame(animate);
    }

    animate();
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-[-1]" />;
}
