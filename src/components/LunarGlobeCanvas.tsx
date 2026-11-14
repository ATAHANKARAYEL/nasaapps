import React, { useEffect, useRef, useState } from 'react';
import { LANDMARKS } from '../lib/landmarks';
import {
  DEG2RAD,
  ensureLunarDem,
  interpolateGreatCircle,
  latLonToBody,
  RAD2DEG,
  TEX_H,
  TEX_W,
} from '../lib/lunarPhysics';

export interface CameraTarget {
  yaw: number;
  pitch: number;
  zoom: number;
}

interface LunarGlobeCanvasProps {
  active: boolean;
  cameraTarget: CameraTarget;
  cameraSeq: number;
  spectrum: number;
  sunAngleDeg: number;
  autoSpin: boolean;
  showGrid: boolean;
  showLabels: boolean;
  measureMode: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  selected: { lat: number; lon: number; name: string; tag: string };
  pointA: { lat: number; lon: number };
  pointB: { lat: number; lon: number };
  cardinals: { N: string; S: string; E: string; W: string };
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
  onSelectCoords: (lat: number, lon: number, name: string, tag: string) => void;
  onMeasureClick: (lat: number, lon: number) => void;
  onScaleUpdate: (scaleText: string, pxWidth: number) => void;
  onBakeReady?: (bakeMs: number) => void;
}

const VERT_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;
  varying vec2 v_uv;

  uniform vec2 u_res;
  uniform float u_yaw;
  uniform float u_pitch;
  uniform float u_zoom;
  uniform float u_sunLon;
  uniform int u_spectrum;
  uniform sampler2D u_planetTex;

  const float PI = 3.14159265359;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
          mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
          mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  vec3 hypsometricColor(float t) {
    vec3 c0 = vec3(0.11, 0.09, 0.32);
    vec3 c1 = vec3(0.14, 0.39, 0.92);
    vec3 c2 = vec3(0.03, 0.72, 0.83);
    vec3 c3 = vec3(0.06, 0.73, 0.51);
    vec3 c4 = vec3(0.92, 0.70, 0.04);
    vec3 c5 = vec3(0.94, 0.27, 0.27);
    vec3 c6 = vec3(0.98, 0.98, 0.99);
    if (t < 0.18) return mix(c0, c1, t / 0.18);
    if (t < 0.35) return mix(c1, c2, (t - 0.18) / 0.17);
    if (t < 0.50) return mix(c2, c3, (t - 0.35) / 0.15);
    if (t < 0.68) return mix(c3, c4, (t - 0.50) / 0.18);
    if (t < 0.86) return mix(c4, c5, (t - 0.68) / 0.18);
    return mix(c5, c6, (t - 0.86) / 0.14);
  }

  void main() {
    float aspect = u_res.x / u_res.y;
    vec2 ndc = vec2(v_uv.x * aspect, v_uv.y);

    float camDist = 3.2;
    float focal = 1.45 * u_zoom;

    vec3 rayOrigCam = vec3(0.0, 0.0, camDist);
    vec3 rayDirCam = normalize(vec3(ndc.x, ndc.y, -focal));

    float cp = cos(u_pitch), sp = sin(u_pitch);
    float cy = cos(u_yaw),   sy = sin(u_yaw);

    vec3 o1 = vec3(rayOrigCam.x, rayOrigCam.y * cp + rayOrigCam.z * sp, -rayOrigCam.y * sp + rayOrigCam.z * cp);
    vec3 d1 = vec3(rayDirCam.x,  rayDirCam.y * cp  + rayDirCam.z * sp,  -rayDirCam.y * sp  + rayDirCam.z * cp);

    vec3 ro = vec3(o1.x * cy + o1.z * sy, o1.y, -o1.x * sy + o1.z * cy);
    vec3 rd = normalize(vec3(d1.x * cy + d1.z * sy, d1.y, -d1.x * sy + d1.z * cy));

    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float h = b * b - c;

    if (h < 0.0) {
      vec3 dir = normalize(vec3(ndc * 1.4, -2.0));
      float s1 = hash31(floor(dir * 260.0));
      float s2 = hash31(floor(dir * 520.0));
      vec3 bg = vec3(0.012, 0.020, 0.042);
      if (s1 > 0.9965) bg += vec3(0.75, 0.85, 1.0) * ((s1 - 0.9965) * 260.0);
      if (s2 > 0.9982) bg += vec3(1.0, 0.93, 0.80) * ((s2 - 0.9982) * 320.0);
      gl_FragColor = vec4(bg, 1.0);
      return;
    }

    float t = -b - sqrt(h);
    vec3 P = ro + t * rd;

    float lat = asin(clamp(P.y, -1.0, 1.0));
    float lon = atan(P.x, P.z);
    vec2 uv = vec2((lon + PI) / (2.0 * PI), (PI * 0.5 - lat) / PI);

    vec4 data = texture2D(u_planetTex, uv);
    float albedo = data.r;
    float elevNorm = data.g;
    vec2 slopeXY = (data.ba - 0.5) * 2.0;

    float zoomDetail = clamp((u_zoom - 0.8) / 8.0, 0.15, 1.0);
    float n1 = noise3(P * 95.0);
    float n2 = noise3(P * 280.0);
    float n3 = noise3(P * 750.0);
    float micro = (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.05 * zoomDetail + (n3 - 0.5) * 0.035 * zoomDetail;
    albedo = clamp(albedo + micro * 0.85, 0.08, 0.98);

    vec3 upVec = abs(P.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 east = normalize(cross(upVec, P));
    vec3 north = cross(P, east);

    float microDx = (noise3((P + east * 0.002) * 240.0) - n2) * 0.45 * zoomDetail;
    float microDy = (noise3((P + north * 0.002) * 240.0) - n2) * 0.45 * zoomDetail;

    vec3 N = normalize(P - east * (slopeXY.x * 1.45 + microDx) - north * (slopeXY.y * 1.45 + microDy));

    float sunLat = 1.54 * PI / 180.0;
    vec3 L = normalize(vec3(cos(sunLat) * sin(u_sunLon), sin(sunLat), cos(sunLat) * cos(u_sunLon)));
    vec3 V = normalize(ro - P);

    float ndotl = dot(N, L);
    float macroNdotL = dot(P, L);
    float ndotv = max(0.06, dot(N, V));

    float directLight = 0.0;
    if (ndotl > 0.0 && macroNdotL > -0.06) {
      float horizonFade = smoothstep(-0.06, 0.04, macroNdotL);
      float lommel = ndotl / (ndotl + ndotv * 0.58);
      directLight = (ndotl * 0.48 + lommel * 0.78) * horizonFade;
    }
    float earthshine = 0.032 + 0.015 * max(0.0, dot(P, vec3(0.0, 0.0, 1.0)));

    vec3 finalColor = vec3(0.0);

    if (u_spectrum == 0) {
      vec3 regolithTint = mix(vec3(0.84, 0.85, 0.88), vec3(0.98, 0.96, 0.92), albedo);
      vec3 lit = regolithTint * albedo * (directLight * 1.22);
      vec3 dark = vec3(0.68, 0.76, 0.90) * albedo * earthshine;
      finalColor = lit + dark;
    } else if (u_spectrum == 1) {
      vec3 topo = hypsometricColor(elevNorm);
      float contour = abs(fract(elevNorm * 20.0) - 0.5);
      float line = smoothstep(0.02, 0.06, contour);
      float shade = 0.45 + 0.65 * max(0.0, ndotl);
      finalColor = topo * shade * mix(0.35, 1.0, line);
    } else if (u_spectrum == 2) {
      float slopeMag = length(slopeXY) * 2.2 + abs(microDx) * 0.4;
      vec3 safeCol = vec3(0.06, 0.73, 0.50);
      vec3 warnCol = vec3(0.96, 0.62, 0.04);
      vec3 hazCol  = vec3(0.94, 0.24, 0.24);
      vec3 col = slopeMag < 0.28
        ? mix(safeCol, warnCol, slopeMag / 0.28)
        : mix(warnCol, hazCol, clamp((slopeMag - 0.28) / 0.45, 0.0, 1.0));
      finalColor = col * (0.48 + 0.62 * max(0.0, ndotl));
    } else if (u_spectrum == 3) {
      float polar = smoothstep(1.15, 1.56, abs(lat));
      float bowl = smoothstep(0.52, 0.18, elevNorm);
      float psr = clamp(polar * bowl * (1.0 - max(0.0, macroNdotL) * 4.0), 0.0, 1.0);
      vec3 warmCol = mix(vec3(0.18, 0.22, 0.34), vec3(0.98, 0.45, 0.09), clamp(macroNdotL, 0.0, 1.0));
      if (macroNdotL > 0.7) warmCol = mix(warmCol, vec3(1.0, 0.96, 0.75), (macroNdotL - 0.7) / 0.3);
      vec3 psrCol = mix(vec3(0.02, 0.55, 0.92), vec3(0.32, 0.22, 0.96), bowl);
      finalColor = mix(warmCol, psrCol, psr);
    } else if (u_spectrum == 4) {
      vec3 dryCol = vec3(0.82, 0.52, 0.18);
      vec3 midCol = vec3(0.36, 0.44, 0.62);
      vec3 iceCol = vec3(0.12, 0.92, 0.98);
      float iceTrap = smoothstep(1.25, 1.56, abs(lat)) * smoothstep(0.52, 0.18, elevNorm);
      vec3 mCol = iceTrap < 0.35 ? mix(dryCol, midCol, iceTrap / 0.35) : mix(midCol, iceCol, (iceTrap - 0.35) / 0.65);
      finalColor = mCol * (0.50 + 0.60 * max(0.0, ndotl));
    } else {
      float polarPeak = smoothstep(1.22, 1.57, abs(lat)) * smoothstep(0.44, 0.72, elevNorm);
      float duty = clamp(0.48 + polarPeak * 0.50 - smoothstep(0.45, 0.15, elevNorm) * 0.42, 0.04, 0.98);
      vec3 dteCol = duty < 0.45
        ? mix(vec3(0.05, 0.08, 0.16), vec3(0.12, 0.35, 0.78), duty / 0.45)
        : mix(vec3(0.85, 0.48, 0.05), vec3(1.0, 0.97, 0.76), (duty - 0.45) / 0.53);
      finalColor = dteCol * (0.65 + 0.40 * max(0.0, ndotl));
    }

    float limb = smoothstep(0.0, 0.008, h);
    gl_FragColor = vec4(finalColor * limb, 1.0);
  }
`;

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const LunarGlobeCanvas: React.FC<LunarGlobeCanvasProps> = (props) => {
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const propsRef = useRef(props);
  propsRef.current = props;

  const camRef = useRef({
    yaw: props.cameraTarget.yaw,
    pitch: props.cameraTarget.pitch,
    zoom: props.cameraTarget.zoom,
    targetYaw: props.cameraTarget.yaw,
    targetPitch: props.cameraTarget.pitch,
    targetZoom: props.cameraTarget.zoom,
    velYaw: 0,
    velPitch: 0,
    dragging: false,
    dragDist: 0,
    lastX: 0,
    lastY: 0,
    hover: null as { lat: number; lon: number } | null,
  });

  const requestDrawRef = useRef<() => void>(() => {});

  // Sync external camera preset/fly-to updates
  useEffect(() => {
    const c = camRef.current;
    c.targetYaw = props.cameraTarget.yaw;
    c.targetPitch = props.cameraTarget.pitch;
    c.targetZoom = props.cameraTarget.zoom;
    c.velYaw = 0;
    c.velPitch = 0;
    requestDrawRef.current();
  }, [props.cameraTarget.yaw, props.cameraTarget.pitch, props.cameraTarget.zoom, props.cameraSeq]);

  // Redraw when visual uniforms or overlays change
  useEffect(() => {
    requestDrawRef.current();
  }, [
    props.active,
    props.spectrum,
    props.sunAngleDeg,
    props.autoSpin,
    props.showGrid,
    props.showLabels,
    props.leftOpen,
    props.rightOpen,
    props.selected.lat,
    props.selected.lon,
    props.pointA.lat,
    props.pointA.lon,
    props.pointB.lat,
    props.pointB.lon,
    props.cardinals.N,
    props.cardinals.S,
    props.cardinals.E,
    props.cardinals.W,
  ]);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    if (!glCanvas || !hudCanvas) return;

    const isSoftwareGl = detectSoftwareGl();
    const gl =
      (glCanvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
      }) as WebGL2RenderingContext | null) ||
      (glCanvas.getContext('webgl', {
        antialias: false,
        powerPreference: 'high-performance',
      }) as WebGLRenderingContext | null);

    if (!gl) {
      setWebglUnavailable(true);
      return;
    }

    const hudCtx = hudCanvas.getContext('2d');
    if (!hudCtx) return;

    let prog: WebGLProgram | null = null;
    let planetTex: WebGLTexture | null = null;
    let vbo: WebGLBuffer | null = null;
    let uniforms: {
      res: WebGLUniformLocation | null;
      yaw: WebGLUniformLocation | null;
      pitch: WebGLUniformLocation | null;
      zoom: WebGLUniformLocation | null;
      sunLon: WebGLUniformLocation | null;
      spectrum: WebGLUniformLocation | null;
      planetTex: WebGLUniformLocation | null;
    } | null = null;

    const initPipeline = () => {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT_SRC));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
      gl.linkProgram(program);
      gl.useProgram(program);
      prog = program;

      vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      const posLoc = gl.getAttribLocation(program, 'a_pos');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      uniforms = {
        res: gl.getUniformLocation(program, 'u_res'),
        yaw: gl.getUniformLocation(program, 'u_yaw'),
        pitch: gl.getUniformLocation(program, 'u_pitch'),
        zoom: gl.getUniformLocation(program, 'u_zoom'),
        sunLon: gl.getUniformLocation(program, 'u_sunLon'),
        spectrum: gl.getUniformLocation(program, 'u_spectrum'),
        planetTex: gl.getUniformLocation(program, 'u_planetTex'),
      };

      const { rgba, bakeMs } = ensureLunarDem();
      propsRef.current.onBakeReady?.(bakeMs);

      planetTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, planetTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        TEX_W,
        TEX_H,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(uniforms.planetTex, 0);
    };

    initPipeline();

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      initPipeline();
      requestDraw();
    };
    glCanvas.addEventListener('webglcontextlost', onContextLost);
    glCanvas.addEventListener('webglcontextrestored', onContextRestored);

    const projectLatLon = (latDeg: number, lonDeg: number, W: number, H: number) => {
      const c = camRef.current;
      const [Px, Py, Pz] = latLonToBody(latDeg, lonDeg);
      const cy = Math.cos(c.yaw);
      const sy = Math.sin(c.yaw);
      const cp = Math.cos(c.pitch);
      const sp = Math.sin(c.pitch);

      const x1 = Px * cy - Pz * sy;
      const y1 = Py;
      const z1 = Px * sy + Pz * cy;

      const xc = x1;
      const yc = y1 * cp - z1 * sp;
      const zc = y1 * sp + z1 * cp;

      const camDist = 3.2;
      if (zc <= 1.0 / camDist) return null;

      const focal = 1.45 * c.zoom;
      const denom = camDist - zc;
      const u = (focal * xc) / denom;
      const v = (focal * yc) / denom;

      const halfH = H * 0.5;
      return { x: W * 0.5 + u * halfH, y: halfH - v * halfH, zc };
    };

    const raycastScreenToLatLon = (px: number, py: number, W: number, H: number) => {
      const c = camRef.current;
      const halfH = H * 0.5;
      const u = (px - W * 0.5) / halfH;
      const v = (halfH - py) / halfH;

      const camDist = 3.2;
      const focal = 1.45 * c.zoom;

      const len = Math.sqrt(u * u + v * v + focal * focal);
      const dxC = u / len;
      const dyC = v / len;
      const dzC = -focal / len;

      const cp = Math.cos(c.pitch);
      const sp = Math.sin(c.pitch);
      const cy = Math.cos(c.yaw);
      const sy = Math.sin(c.yaw);

      const ox1 = 0;
      const oy1 = camDist * sp;
      const oz1 = camDist * cp;
      const dx1 = dxC;
      const dy1 = dyC * cp + dzC * sp;
      const dz1 = -dyC * sp + dzC * cp;

      const rox = ox1 * cy + oz1 * sy;
      const roy = oy1;
      const roz = -ox1 * sy + oz1 * cy;
      const rdx = dx1 * cy + dz1 * sy;
      const rdy = dy1;
      const rdz = -dx1 * sy + dz1 * cy;

      const b = rox * rdx + roy * rdy + roz * rdz;
      const cc = rox * rox + roy * roy + roz * roz - 1.0;
      const h = b * b - cc;
      if (h < 0) return null;

      const tHit = -b - Math.sqrt(h);
      const Px = rox + tHit * rdx;
      const Py = roy + tHit * rdy;
      const Pz = roz + tHit * rdz;

      return {
        lat: Math.asin(Math.max(-1, Math.min(1, Py))) * RAD2DEG,
        lon: Math.atan2(Px, Pz) * RAD2DEG,
      };
    };

    const drawHudOverlay = (W: number, H: number) => {
      const p = propsRef.current;
      const c = camRef.current;
      hudCtx.clearRect(0, 0, W, H);
      if (!p.active) return;

      if (p.showGrid) {
        let stepDeg = 15;
        if (c.zoom >= 1.8) stepDeg = 5;
        if (c.zoom >= 5.0) stepDeg = 1;
        if (c.zoom >= 11.0) stepDeg = 0.25;

        const centerHit = raycastScreenToLatLon(W * 0.5, H * 0.5, W, H) || { lat: -89, lon: 0 };
        const spanLat = Math.min(90, 85 / c.zoom);
        const latStart = Math.max(-90, Math.floor((centerHit.lat - spanLat) / stepDeg) * stepDeg);
        const latEnd = Math.min(90, Math.ceil((centerHit.lat + spanLat) / stepDeg) * stepDeg);

        const polarZoom = Math.abs(centerHit.lat) > 68;
        const lonStart = polarZoom
          ? -180
          : Math.floor((centerHit.lon - spanLat * 1.4) / stepDeg) * stepDeg;
        const lonEnd = polarZoom
          ? 180
          : Math.ceil((centerHit.lon + spanLat * 1.4) / stepDeg) * stepDeg;

        for (let lat = latStart; lat <= latEnd + 1e-6; lat += stepDeg) {
          if (Math.abs(lat) > 89.99) continue;
          const isMajor = Math.abs(lat % 15) < 1e-4;
          const isEquator = Math.abs(lat) < 1e-4;
          const isArtemisRing = Math.abs(lat + 80) < 1e-4;

          hudCtx.beginPath();
          let started = false;
          const segs = polarZoom ? 96 : 64;
          for (let i = 0; i <= segs; i++) {
            const lon = lonStart + (i / segs) * (lonEnd - lonStart);
            const pt = projectLatLon(lat, lon, W, H);
            if (pt) {
              if (!started) {
                hudCtx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                hudCtx.lineTo(pt.x, pt.y);
              }
            } else {
              started = false;
            }
          }
          hudCtx.strokeStyle = isEquator
            ? 'rgba(251, 191, 36, 0.42)'
            : isArtemisRing
              ? 'rgba(56, 189, 248, 0.42)'
              : isMajor
                ? 'rgba(148, 163, 184, 0.24)'
                : 'rgba(148, 163, 184, 0.12)';
          hudCtx.lineWidth = isEquator || isArtemisRing ? 1.3 : 0.8;
          hudCtx.stroke();

          const lblPt = projectLatLon(lat, centerHit.lon, W, H);
          if (lblPt && lblPt.x > 40 && lblPt.x < W - 40 && lblPt.y > 60 && lblPt.y < H - 60) {
            const degInt = Math.trunc(Math.abs(lat));
            const minInt = Math.round((Math.abs(lat) - degInt) * 60);
            const hemiChar = lat >= 0 ? p.cardinals.N : p.cardinals.S;
            const txt = minInt > 0 ? `${degInt}°${minInt}′${hemiChar}` : `${degInt}°${hemiChar}`;
            hudCtx.fillStyle = 'rgba(186, 230, 253, 0.72)';
            hudCtx.font = '10px monospace';
            hudCtx.fillText(txt, lblPt.x + 4, lblPt.y - 3);
          }
        }

        for (let lon = lonStart; lon < lonEnd - 1e-6; lon += stepDeg) {
          const isPrime = Math.abs(((lon + 180) % 360) - 180) < 1e-4;
          const isMajor = Math.abs(lon % 15) < 1e-4;

          hudCtx.beginPath();
          let started = false;
          for (let i = 0; i <= 48; i++) {
            const lat = latStart + (i / 48) * (latEnd - latStart);
            const pt = projectLatLon(lat, lon, W, H);
            if (pt) {
              if (!started) {
                hudCtx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                hudCtx.lineTo(pt.x, pt.y);
              }
            } else {
              started = false;
            }
          }
          hudCtx.strokeStyle = isPrime
            ? 'rgba(251, 191, 36, 0.42)'
            : isMajor
              ? 'rgba(148, 163, 184, 0.22)'
              : 'rgba(148, 163, 184, 0.11)';
          hudCtx.lineWidth = isPrime ? 1.3 : 0.8;
          hudCtx.stroke();
        }
      }

      // Great-circle A -> B measure line
      const ptA = projectLatLon(p.pointA.lat, p.pointA.lon, W, H);
      const ptB = projectLatLon(p.pointB.lat, p.pointB.lon, W, H);
      if (ptA || ptB) {
        hudCtx.beginPath();
        let started = false;
        for (let i = 0; i <= 40; i++) {
          const gc = interpolateGreatCircle(
            p.pointA.lat,
            p.pointA.lon,
            p.pointB.lat,
            p.pointB.lon,
            i / 40
          );
          const pt = projectLatLon(gc.lat, gc.lon, W, H);
          if (pt) {
            if (!started) {
              hudCtx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              hudCtx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        hudCtx.strokeStyle = '#34d399';
        hudCtx.lineWidth = 2.0;
        hudCtx.setLineDash([5, 4]);
        hudCtx.stroke();
        hudCtx.setLineDash([]);

        const drawPin = (x: number, y: number, color: string, letter: string) => {
          hudCtx.fillStyle = color;
          hudCtx.beginPath();
          hudCtx.arc(x, y, 8, 0, Math.PI * 2);
          hudCtx.fill();
          hudCtx.fillStyle = '#03060f';
          hudCtx.font = '800 10px monospace';
          hudCtx.fillText(letter, x - 3, y + 3.5);
        };
        if (ptA) drawPin(ptA.x, ptA.y, '#34d399', 'A');
        if (ptB) drawPin(ptB.x, ptB.y, '#fbbf24', 'B');
      }

      if (p.showLabels) {
        const maxPrio = c.zoom >= 3.2 ? 3 : c.zoom >= 1.5 ? 2 : 1;
        const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
        const minLabelX = p.leftOpen && W >= 1024 ? 318 : 16;
        const maxLabelX = p.rightOpen && W >= 1024 ? W - 402 : W - 16;
        hudCtx.font = '600 11px "Plus Jakarta Sans", -apple-system, sans-serif';

        for (let i = 0; i < LANDMARKS.length; i++) {
          const lm = LANDMARKS[i];
          if (lm.prio > maxPrio) continue;
          const pt = projectLatLon(lm.lat, lm.lon, W, H);
          if (!pt || pt.x < minLabelX || pt.x > maxLabelX - 24 || pt.y < 104 || pt.y > H - 78) {
            continue;
          }

          const wBox = lm.name.length * 6.4 + 22;
          const hBox = 18;
          const bx = pt.x + 7;
          const by = pt.y - 9;
          if (bx + wBox > maxLabelX) continue;

          let collides = false;
          for (let j = 0; j < occupied.length; j++) {
            const o = occupied[j];
            if (bx < o.x + o.w && bx + wBox > o.x && by < o.y + o.h && by + hBox > o.y) {
              collides = true;
              break;
            }
          }
          if (collides) continue;
          occupied.push({ x: bx, y: by, w: wBox, h: hBox });

          const color =
            lm.cat === 'POLE'
              ? '#38bdf8'
              : lm.cat === 'LANDING'
                ? '#34d399'
                : lm.cat === 'MARE'
                  ? '#a78bfa'
                  : '#fbbf24';

          hudCtx.beginPath();
          hudCtx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
          hudCtx.fillStyle = color;
          hudCtx.fill();
          hudCtx.strokeStyle = '#03060f';
          hudCtx.lineWidth = 1.2;
          hudCtx.stroke();

          hudCtx.fillStyle = 'rgba(5, 9, 20, 0.82)';
          hudCtx.fillRect(bx, by, wBox - 8, hBox);

          hudCtx.fillStyle = '#f1f5f9';
          hudCtx.fillText(lm.name, bx + 5, by + 12.5);
        }
      }

      const selPt = projectLatLon(p.selected.lat, p.selected.lon, W, H);
      if (selPt) {
        hudCtx.strokeStyle = '#38bdf8';
        hudCtx.lineWidth = 1.6;
        hudCtx.beginPath();
        hudCtx.arc(selPt.x, selPt.y, 11, 0, Math.PI * 2);
        hudCtx.stroke();

        hudCtx.beginPath();
        hudCtx.moveTo(selPt.x - 16, selPt.y);
        hudCtx.lineTo(selPt.x - 6, selPt.y);
        hudCtx.moveTo(selPt.x + 6, selPt.y);
        hudCtx.lineTo(selPt.x + 16, selPt.y);
        hudCtx.moveTo(selPt.x, selPt.y - 16);
        hudCtx.lineTo(selPt.x, selPt.y - 6);
        hudCtx.moveTo(selPt.x, selPt.y + 6);
        hudCtx.lineTo(selPt.x, selPt.y + 16);
        hudCtx.stroke();
      }

      if (c.hover) {
        const hPt = projectLatLon(c.hover.lat, c.hover.lon, W, H);
        if (hPt) {
          hudCtx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
          hudCtx.lineWidth = 1.1;
          hudCtx.beginPath();
          hudCtx.arc(hPt.x, hPt.y, 6, 0, Math.PI * 2);
          hudCtx.stroke();
        }
      }

      const kmPerScreenHeight = (2.0 * 1737.4) / (1.45 * c.zoom);
      const targetKm = kmPerScreenHeight * (110 / H);
      const niceSteps = [1000, 500, 250, 100, 50, 25, 10, 5, 2, 1, 0.5];
      let chosenKm = 500;
      for (const s of niceSteps) {
        if (s <= targetKm * 1.35) {
          chosenKm = s;
          break;
        }
      }
      const pxWidth = Math.max(45, Math.min(180, (chosenKm / targetKm) * 110));
      p.onScaleUpdate(
        chosenKm >= 1 ? `${chosenKm} km` : `${chosenKm * 1000} m`,
        Math.round(pxWidth)
      );
    };

    let rafId = 0;
    let timerId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      if ('fenceSync' in gl && typeof (gl as WebGL2RenderingContext).fenceSync === 'function') {
        const gl2 = gl as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
          if (status === gl2.UNSIGNALED) {
            timerId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl2.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          }
        };
        timerId = window.setTimeout(poll, 5);
      } else {
        gl.finish();
        timerId = window.setTimeout(cb, 80);
      }
    };

    const drawFrame = (now: number): boolean => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const c = camRef.current;
      const p = propsRef.current;

      let needsMore = false;
      if (!c.dragging) {
        if (p.autoSpin && p.active) {
          c.targetYaw += dt * 0.14;
          needsMore = true;
        } else if (Math.abs(c.velYaw) > 1e-4 || Math.abs(c.velPitch) > 1e-4) {
          c.targetYaw += c.velYaw;
          c.targetPitch = Math.max(
            -Math.PI * 0.499,
            Math.min(Math.PI * 0.499, c.targetPitch + c.velPitch)
          );
          c.velYaw *= 0.88;
          c.velPitch *= 0.88;
          needsMore = true;
        }
      }

      if (isSoftwareGl) {
        c.yaw = c.targetYaw;
        c.pitch = c.targetPitch;
        c.zoom = c.targetZoom;
      } else {
        const ease = 1 - Math.pow(0.0015, dt);
        c.yaw += (c.targetYaw - c.yaw) * ease;
        c.pitch += (c.targetPitch - c.pitch) * ease;
        c.zoom += (c.targetZoom - c.zoom) * ease;
        if (
          Math.abs(c.targetYaw - c.yaw) > 5e-4 ||
          Math.abs(c.targetPitch - c.pitch) > 5e-4 ||
          Math.abs(c.targetZoom - c.zoom) > 5e-4
        ) {
          needsMore = true;
        }
      }

      const dpr = isSoftwareGl ? 1 : Math.min(2.0, window.devicePixelRatio || 1);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const pw = Math.max(1, Math.floor(W * dpr));
      const ph = Math.max(1, Math.floor(H * dpr));

      if (glCanvas.width !== pw || glCanvas.height !== ph) {
        glCanvas.width = pw;
        glCanvas.height = ph;
        hudCanvas.width = pw;
        hudCanvas.height = ph;
      }

      if (prog && uniforms) {
        gl.viewport(0, 0, pw, ph);
        gl.uniform2f(uniforms.res, pw, ph);
        gl.uniform1f(uniforms.yaw, c.yaw);
        gl.uniform1f(uniforms.pitch, c.pitch);
        gl.uniform1f(uniforms.zoom, c.zoom);
        gl.uniform1f(uniforms.sunLon, p.sunAngleDeg * DEG2RAD);
        gl.uniform1i(uniforms.spectrum, p.spectrum);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      hudCtx.save();
      hudCtx.scale(dpr, dpr);
      drawHudOverlay(W, H);
      hudCtx.restore();

      return needsMore;
    };

    const requestDraw = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      rafId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const needsMore = drawFrame(now);
        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || needsMore)) {
            requestDraw();
          }
        };
        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    requestDrawRef.current = requestDraw;
    requestDraw();

    const onResize = () => requestDraw();
    window.addEventListener('resize', onResize);

    const onPointerDown = (e: PointerEvent) => {
      const c = camRef.current;
      c.dragging = true;
      c.dragDist = 0;
      c.lastX = e.clientX;
      c.lastY = e.clientY;
      c.velYaw = 0;
      c.velPitch = 0;
      hudCanvas.style.cursor = 'grabbing';
      hudCanvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const c = camRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (c.dragging) {
        const dx = e.clientX - c.lastX;
        const dy = e.clientY - c.lastY;
        c.dragDist += Math.hypot(dx, dy);
        c.lastX = e.clientX;
        c.lastY = e.clientY;

        const sens = 0.0042 / Math.sqrt(c.zoom);
        c.velYaw = -dx * sens;
        c.velPitch = dy * sens;
        c.targetYaw += c.velYaw;
        c.targetPitch = Math.max(
          -Math.PI * 0.499,
          Math.min(Math.PI * 0.499, c.targetPitch + c.velPitch)
        );
        requestDraw();
      }

      const hit = raycastScreenToLatLon(e.clientX, e.clientY, W, H);
      c.hover = hit;
      propsRef.current.onHoverCoords(hit);
      requestDraw();
    };

    const onPointerUp = (e: PointerEvent) => {
      const c = camRef.current;
      c.dragging = false;
      hudCanvas.style.cursor = 'crosshair';
      try {
        hudCanvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }

      if (c.dragDist < 5) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        let clickedLm = null;
        let bestDist = 16;
        for (const lm of LANDMARKS) {
          const pt = projectLatLon(lm.lat, lm.lon, W, H);
          if (!pt) continue;
          const d = Math.hypot(pt.x - e.clientX, pt.y - e.clientY);
          if (d < bestDist) {
            bestDist = d;
            clickedLm = lm;
          }
        }

        const hit = clickedLm
          ? { lat: clickedLm.lat, lon: clickedLm.lon }
          : raycastScreenToLatLon(e.clientX, e.clientY, W, H);

        if (hit) {
          if (propsRef.current.measureMode) {
            propsRef.current.onMeasureClick(hit.lat, hit.lon);
          } else {
            const label = clickedLm
              ? clickedLm.name
              : `Target (${hit.lat.toFixed(2)}°, ${hit.lon.toFixed(2)}°)`;
            const tag = clickedLm ? clickedLm.cat : 'LOLA DEM';
            propsRef.current.onSelectCoords(hit.lat, hit.lon, label, tag);
          }
        }
      }
      requestDraw();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = camRef.current;
      const factor = e.deltaY < 0 ? 1.16 : 0.86;
      c.targetZoom = Math.max(0.75, Math.min(18.0, c.targetZoom * factor));
      requestDraw();
    };

    hudCanvas.addEventListener('pointerdown', onPointerDown);
    hudCanvas.addEventListener('pointermove', onPointerMove);
    hudCanvas.addEventListener('pointerup', onPointerUp);
    hudCanvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      glCanvas.removeEventListener('webglcontextlost', onContextLost);
      glCanvas.removeEventListener('webglcontextrestored', onContextRestored);
      hudCanvas.removeEventListener('pointerdown', onPointerDown);
      hudCanvas.removeEventListener('pointermove', onPointerMove);
      hudCanvas.removeEventListener('pointerup', onPointerUp);
      hudCanvas.removeEventListener('wheel', onWheel);
      if (planetTex) gl.deleteTexture(planetTex);
      if (vbo) gl.deleteBuffer(vbo);
      if (prog) gl.deleteProgram(prog);
    };
  }, []);

  if (webglUnavailable) {
    return (
      <div
        className="fixed inset-0 z-0 flex items-center justify-center bg-[#03060f] text-slate-400"
        data-testid="lunar-canvas-fallback"
      >
        <div className="panel-surface max-w-md p-6 text-center">
          <div className="font-display text-lg font-bold text-slate-100">
            WebGL Context Unavailable
          </div>
          <p className="mt-2 text-sm text-slate-400">
            3D Lunar globe rendering is paused; analytical comparison and Tsiolkovsky fuel tools remain active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={glCanvasRef}
        data-testid="lunar-gl-canvas"
        className={`fixed inset-0 z-0 block h-full w-full transition-opacity duration-200 ${
          props.active ? 'opacity-100' : 'opacity-20 pointer-events-none'
        }`}
      />
      <canvas
        ref={hudCanvasRef}
        data-testid="lunar-hud-canvas"
        className={`fixed inset-0 z-[1] block h-full w-full cursor-crosshair touch-none transition-opacity duration-200 ${
          props.active ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    </>
  );
};
