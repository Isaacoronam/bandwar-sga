import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function Model3D() {
  const meshRef = useRef();

  // Animación suave del modelo
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group>
      {/* Esfera de demostración - Reemplazar con modelo .glb cuando esté disponible */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.5, 4]} />
        <meshStandardMaterial
          color="#FFD700"
          metalness={0.7}
          roughness={0.2}
          emissive="#FFA500"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Anillo decorativo alrededor del modelo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[2, 0.1, 16, 100]} />
        <meshStandardMaterial
          color="#4A90E2"
          metalness={0.8}
          roughness={0.2}
          emissive="#2E5C8A"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Plataforma base */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[2, 2, 0.2, 32]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>

      {/* Esfera de ambient occlusion (decorativa) */}
      <mesh position={[0, 0, 0]} scale={2.2}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#1A1A2E"
          transparent
          opacity={0.05}
        />
      </mesh>
    </group>
  );
}

export default Model3D;
