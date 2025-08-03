"use client";

import { useEffect, useState } from "react";

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button, a')) {
        setIsHovering(true);
      }
    };

    const onMouseLeave = () => {
      setIsHovering(false);
    };

    // Hide default cursor
    document.body.style.cursor = 'none';

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseenter", onMouseEnter, true);
    document.addEventListener("mouseleave", onMouseLeave, true);

    return () => {
      document.body.style.cursor = 'auto';
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter, true);
      document.removeEventListener("mouseleave", onMouseLeave, true);
    };
  }, []);

  return (
    <>
      {/* Main cursor dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-gray-700 rounded-full pointer-events-none z-[9999] transition-all duration-100 ease-out hidden md:block"
        style={{ 
          left: `${position.x - 4}px`, 
          top: `${position.y - 4}px`,
          transform: isHovering ? 'scale(1.5)' : 'scale(1)',
          backgroundColor: isHovering ? '#374151' : '#6b7280'
        }}
      />
      
      {/* Outer ring */}
      <div
        className="fixed top-0 left-0 w-8 h-8 border border-gray-400 rounded-full pointer-events-none z-[9998] transition-all duration-200 ease-out hidden md:block"
        style={{ 
          left: `${position.x - 16}px`, 
          top: `${position.y - 16}px`,
          transform: isHovering ? 'scale(1.5)' : 'scale(1)',
          opacity: isHovering ? 0.8 : 0.6,
          borderColor: isHovering ? '#374151' : '#9ca3af'
        }}
      />
      
      {/* Add custom CSS for cursor hiding */}
      <style jsx global>{`
        * {
          cursor: none !important;
        }
        
        @media (max-width: 768px) {
          * {
            cursor: auto !important;
          }
        }
      `}</style>
    </>
  );
};

export default CustomCursor;