import React, { useRef, useState } from 'react';

export function TitleTorch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-default ml-2 hidden sm:block overflow-hidden"
      style={{ padding: '0.5rem 1rem' }}
    >
      {/* Background invisible bounding box text to give the container width */}
      <div className="text-xl font-display font-bold tracking-widest opacity-0 select-none">
        Nellie's DM Screen
      </div>

      {/* The Revealed Text - The mask remains ALWAYS, only opacity changes to prevent flashing */}
      <div 
        className="absolute inset-0 flex items-center justify-center text-xl font-display font-bold tracking-widest text-[#c1a063] select-none pointer-events-none transition-opacity duration-300 ease-in-out"
        style={{
          maskImage: `radial-gradient(circle 50px at ${position.x}px ${position.y}px, black 10%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 50px at ${position.x}px ${position.y}px, black 10%, transparent 100%)`,
          opacity: isHovered ? 1 : 0,
        }}
      >
        Nellie's DM Screen
      </div>
    </div>
  );
}
