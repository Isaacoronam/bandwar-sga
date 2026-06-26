import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

function InstrumentoModel({ modelPath }) {
  const group = useRef();
  const { scene } = useGLTF(modelPath);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={group} dispose={null} position={[0, -1.1, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default InstrumentoModel;
