import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

function InstrumentoModel({ modelPath }) {
  const group = useRef();
  const { scene, error } = useGLTF(modelPath);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (scene) {
      setReady(true);
    }
  }, [scene]);

  useFrame(() => {
    if (group.current && ready) {
      group.current.rotation.y += 0.002;
    }
  });

  if (error) {
    return null;
  }

  return (
    <group ref={group} dispose={null} position={[0, -1.1, 0]}>
      {ready ? <primitive object={scene} /> : null}
    </group>
  );
}

export default InstrumentoModel;
