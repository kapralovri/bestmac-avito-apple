import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ShatterTextProps {
  text: string;
  className?: string;
}

interface Transform {
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

const createZeroTransform = (): Transform => ({
  x: 0,
  y: 0,
  z: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0
});

const randomTransform = (): Transform => ({
  x: (Math.random() - 0.5) * 400,
  y: (Math.random() - 0.5) * 400,
  z: (Math.random() - 0.5) * 400,
  rotateX: Math.random() * 720 - 360,
  rotateY: Math.random() * 720 - 360,
  rotateZ: Math.random() * 720 - 360
});

const ShatterText = ({ text, className }: ShatterTextProps) => {
  const words = text.split(/(\s+)/);
  const letters = text.replace(/\s+/g, "").split("");
  const [shattered, setShattered] = useState(false);
  const [targets, setTargets] = useState<Transform[]>([]);

  useEffect(() => {
    if (shattered) {
      setTargets(letters.map(() => randomTransform()));
    } else {
      setTargets(letters.map(() => createZeroTransform()));
    }
  }, [shattered, text]);

  let letterIndex = -1;

  return (
    <span
      className="relative z-10"
      onClick={() => setShattered(prev => !prev)}
      style={{ display: "inline-block", cursor: "pointer", perspective: 1000 }}
    >
      {words.map((word, i) =>
        word.trim() === "" ? (
          word
        ) : (
          <span key={i} className="inline-flex whitespace-nowrap">
            {word.split("").map((char, j) => {
              letterIndex++;
              return (
                <motion.span
                  key={j}
                  className={className}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    transformStyle: "preserve-3d"
                  }}
                  animate={targets[letterIndex] as any}
                  transition={{ duration: 0.8 }}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        )
      )}
    </span>
  );
};

export default ShatterText;
