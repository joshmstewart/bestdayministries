import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Pack3DProps {
  isOpening: boolean;
  onOpenComplete: () => void;
  packImageUrl?: string | null;
  collectionName: string;
}

function PackBox({ isOpening, onOpenComplete, packImageUrl }: Omit<Pack3DProps, 'collectionName'>) {
  const meshRef = useRef<THREE.Group>(null);
  const topFlapRef = useRef<THREE.Mesh>(null);
  const frontFlapRef = useRef<THREE.Mesh>(null);
  const leftFlapRef = useRef<THREE.Mesh>(null);
  const rightFlapRef = useRef<THREE.Mesh>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  
  const openProgress = useRef(0);
  const hasCompleted = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Idle rotation when not opening
    if (!isOpening) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    } else {
      // Opening animation
      if (openProgress.current < 1) {
        openProgress.current += delta * 2.5; // Fast opening
        
        if (openProgress.current > 1) {
          openProgress.current = 1;
          if (!hasCompleted.current) {
            hasCompleted.current = true;
            setTimeout(onOpenComplete, 200);
          }
        }

        const progress = openProgress.current;
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        // Open top flap
        if (topFlapRef.current) {
          topFlapRef.current.rotation.x = -easeProgress * Math.PI * 0.6;
          topFlapRef.current.position.z = easeProgress * 0.3;
        }

        // Open front flap
        if (frontFlapRef.current) {
          frontFlapRef.current.rotation.x = easeProgress * Math.PI * 0.5;
          frontFlapRef.current.position.z = -easeProgress * 0.2;
        }

        // Open side flaps
        if (leftFlapRef.current) {
          leftFlapRef.current.rotation.y = -easeProgress * Math.PI * 0.4;
          leftFlapRef.current.position.x = -easeProgress * 0.2;
        }

        if (rightFlapRef.current) {
          rightFlapRef.current.rotation.y = easeProgress * Math.PI * 0.4;
          rightFlapRef.current.position.x = easeProgress * 0.2;
        }

        // Card slides up and out
        if (cardRef.current) {
          cardRef.current.position.y = easeProgress * 2;
          cardRef.current.rotation.y = easeProgress * Math.PI * 2;
          cardRef.current.scale.setScalar(0.8 + easeProgress * 0.2);
        }
      }
    }
  });

  // Create holographic gradient material
  const holographicMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8B5CF6'),
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 1.5,
  });

  const flapMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7C3AED'),
    metalness: 0.8,
    roughness: 0.2,
  });

  return (
    <group ref={meshRef}>
      {/* Main box body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2.5, 1.5]} />
        <meshStandardMaterial {...holographicMaterial} />
      </mesh>

      {/* Top flap */}
      <mesh 
        ref={topFlapRef} 
        position={[0, 1.25, 0]}
      >
        <boxGeometry args={[2, 0.1, 1.5]} />
        <meshStandardMaterial {...flapMaterial} />
      </mesh>

      {/* Front flap */}
      <mesh 
        ref={frontFlapRef} 
        position={[0, -1.25, 0.75]}
      >
        <boxGeometry args={[2, 0.1, 1.5]} />
        <meshStandardMaterial {...flapMaterial} />
      </mesh>

      {/* Left flap */}
      <mesh 
        ref={leftFlapRef} 
        position={[-1, 0, 0]}
      >
        <boxGeometry args={[0.1, 2.5, 1.5]} />
        <meshStandardMaterial {...flapMaterial} />
      </mesh>

      {/* Right flap */}
      <mesh 
        ref={rightFlapRef} 
        position={[1, 0, 0]}
      >
        <boxGeometry args={[0.1, 2.5, 1.5]} />
        <meshStandardMaterial {...flapMaterial} />
      </mesh>

      {/* Card inside (appears when opening) */}
      <mesh ref={cardRef} position={[0, -0.5, 0]}>
        <boxGeometry args={[1.6, 2, 0.05]} />
        <meshStandardMaterial 
          color="#ffffff"
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Sparkles effect */}
      {isOpening && (
        <>
          {[...Array(20)].map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
              ]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial
                color={new THREE.Color().setHSL(Math.random(), 1, 0.6)}
                emissive={new THREE.Color().setHSL(Math.random(), 1, 0.5)}
                emissiveIntensity={2}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

export function Pack3D({ isOpening, onOpenComplete, packImageUrl, collectionName }: Pack3DProps) {
  return (
    <div className="w-full h-80">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <pointLight position={[0, 2, 2]} intensity={1} color="#ffffff" />
        
        <PackBox 
          isOpening={isOpening} 
          onOpenComplete={onOpenComplete}
          packImageUrl={packImageUrl}
        />
        
        {!isOpening && <OrbitControls enableZoom={false} enablePan={false} />}
      </Canvas>
    </div>
  );
}
