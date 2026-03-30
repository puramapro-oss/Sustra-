'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollFillTextProps {
  text: string;
  className?: string;
}

export default function ScrollFillText({ text, className }: ScrollFillTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.9', 'end 0.3'],
  });

  const words = text.split(' ');

  return (
    <div ref={containerRef} className={`py-32 px-4 ${className ?? ''}`}>
      <p className="max-w-5xl mx-auto text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-syne leading-tight text-center">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = (i + 1) / words.length;
          return <Word key={i} word={word} range={[start, end]} progress={scrollYProgress} />;
        })}
      </p>
    </div>
  );
}

function Word({
  word,
  range,
  progress,
}: {
  word: string;
  range: [number, number];
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  const color = useTransform(progress, range, ['#F8FAFC26', '#F8FAFC']);

  return (
    <motion.span style={{ opacity, color }} className="inline-block mr-3 mb-2 transition-colors">
      {word}
    </motion.span>
  );
}
