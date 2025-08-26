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
  const letters = text.split("");
  const [shattered, setShattered] = useState(false);
  const [targets, setTargets] = useState<Transform[]>(letters.map(() => createZeroTransform()));

  useEffect(() => {
    if (shattered) {
      setTargets(letters.map(() => randomTransform()));
    } else {
      setTargets(letters.map(() => createZeroTransform()));
    }
  }, [shattered, letters]);

  return (
    <span
      className={className}
      onClick={() => setShattered((prev) => !prev)}
      style={{ display: "inline-block", cursor: "pointer", perspective: 1000 }}
    >
      {letters.map((char, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", whiteSpace: "pre", transformStyle: "preserve-3d" }}
          animate={targets[i]}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
};

export default ShatterText;
