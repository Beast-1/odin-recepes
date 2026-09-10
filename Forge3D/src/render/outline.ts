import * as THREE from 'three'

/**
 * Silhouette outline material. Back faces are pushed along the fully averaged
 * vertex normal by an amount proportional to view depth, which keeps the
 * outline a near-constant thickness on screen at any zoom level.
 */
export function makeOutlineMaterial(color: string, thickness = 0.006) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uThickness: { value: thickness },
    },
    vertexShader: /* glsl */ `
      attribute vec3 outlineNormal;
      uniform float uThickness;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * outlineNormal);
        viewPosition.xyz += viewNormal * (-viewPosition.z) * uThickness;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  })
}
