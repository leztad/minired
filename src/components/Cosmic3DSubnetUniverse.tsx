import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Globe, Compass, Eye, ShieldAlert, Wifi, Server, Monitor, HardDrive, 
  Tv, Gamepad2, Printer, Search, Play, Pause, RotateCcw, Activity, 
  HelpCircle, ChevronRight, Zap, RefreshCw, Layers
} from 'lucide-react';
import { Device } from '../types';

interface Cosmic3DSubnetUniverseProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  currentSubnetBase: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

interface Particle {
  t: number; // progress 0 to 1
  speed: number;
  color: string;
  size: number;
}

interface Unified3DNode {
  id: string;
  label: string;
  ip?: string;
  mac?: string;
  vendor?: string;
  type: string;
  estado?: string;
  ping?: number | null;
  download?: number;
  upload?: number;
  size: number;
  color: string;
  x: number;
  y: number;
  z: number;
  isSwitch?: boolean;
  isClient?: boolean;
  isMatched?: boolean;
  parent?: string;
  linkType?: string;
  interfaceName?: string;
  projected: {
    sx: number;
    sy: number;
    scale: number;
    depth: number;
  };
}

export default function Cosmic3DSubnetUniverse({ 
  devices, 
  onSelectDevice, 
  currentSubnetBase 
}: Cosmic3DSubnetUniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Custom Controls State
  const [zoom, setZoom] = useState<number>(1.0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [tilt, setTilt] = useState<number>(30); // pitch angle in degrees (vertical tilt)
  const [yaw, setYaw] = useState<number>(45);   // yaw angle in degrees (horizontal rotation)
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [gravitySeparation, setGravitySeparation] = useState<number>(140); // separation of planets
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Interactivity State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Drag states
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startYaw: number; startTilt: number }>({ x: 0, y: 0, startYaw: 0, startTilt: 0 });

  // Generate constant random starry background (3D spheres of stars)
  const stars: Star[] = useMemo(() => {
    const list: Star[] = [];
    const colors = ['#ffffff', '#bae6fd', '#38bdf8', '#7dd3fc', '#cbd5e1'];
    for (let i = 0; i < 200; i++) {
      // Uniform distribution on a sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 350 + Math.random() * 250; // far away starry sphere
      
      list.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: 0.5 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return list;
  }, []);

  // Pre-configured list of traffic packet generators (particles flowing along links)
  const linksParticlesRef = useRef<Record<string, Particle[]>>({});

  // Memoize device processing and parent association
  const nodesModel = useMemo(() => {
    const base = currentSubnetBase;
    const gatewayIp = `${base}.1`;
    
    // Find local station
    const localDevice = devices.find(d => {
      const name = d.host.toLowerCase();
      return name.includes('este pc') || name.includes('mi pc') || name.includes('computador de trabajo') || name.includes('estación');
    });
    const localIp = localDevice?.ip || `${base}.55`;

    // Active devices excluding gateway and host
    const list = devices.filter(d => d.ip !== gatewayIp);

    // Dynamic categorization of switches and APs
    const parents = [
      { id: 'switch-core', label: 'Core Switch L3', type: 'switch' as const, angleOffset: 0 },
      { id: 'switch-poe', label: 'Switch PoE & L2', type: 'switch' as const, angleOffset: (2 * Math.PI) / 3 },
      { id: 'ap-central', label: 'AP Central WiFi', type: 'ap' as const, angleOffset: (4 * Math.PI) / 3 }
    ];

    const nodes = list.map((d, index) => {
      const hostLower = d.host.toLowerCase();
      const ipSuffix = d.ip.split('.').pop() || '0';
      
      // Determine device category
      let nodeType: 'router' | 'switch' | 'ap' | 'desktop' | 'server' | 'tv' | 'gaming' | 'nas' | 'printer' | 'iot' | 'cloud' = 'desktop';
      let parentId = 'switch-core';
      let linkType: 'ethernet' | 'fiber' | 'wifi' | 'virtual' = 'ethernet';

      // 1. Assign visual icon type
      if (hostLower.includes('tv') || hostLower.includes('television')) {
        nodeType = 'tv';
        parentId = 'switch-poe';
      } else if (hostLower.includes('gaming') || hostLower.includes('ps5') || hostLower.includes('xbox') || hostLower.includes('consola')) {
        nodeType = 'gaming';
        parentId = 'switch-poe';
      } else if (hostLower.includes('nas') || hostLower.includes('almacenamiento') || hostLower.includes('backup')) {
        nodeType = 'nas';
        parentId = 'switch-core';
      } else if (hostLower.includes('printer') || hostLower.includes('impresora')) {
        nodeType = 'printer';
        parentId = 'switch-core';
      } else if (hostLower.includes('server') || hostLower.includes('servidor') || hostLower.includes('db') || hostLower.includes('database') || hostLower.includes('docker') || hostLower.includes('grafana') || hostLower.includes('vm')) {
        nodeType = 'server';
        parentId = 'switch-core';
        linkType = hostLower.includes('docker') ? 'virtual' : 'ethernet';
      } else if (hostLower.includes('camera') || hostLower.includes('cámara') || hostLower.includes('domo') || hostLower.includes('cctv') || hostLower.includes('dahua') || hostLower.includes('biométrico')) {
        nodeType = 'iot'; // Represent Cameras as specialized IoT planetary moons
        parentId = 'switch-poe';
        linkType = 'ethernet';
      } else if (hostLower.includes('celular') || hostLower.includes('smartphone') || hostLower.includes('iphone') || hostLower.includes('android') || hostLower.includes('tablet') || hostLower.includes('alexa') || hostLower.includes('smart') || hostLower.includes('bulb')) {
        nodeType = 'iot';
        parentId = 'ap-central';
        linkType = 'wifi';
      } else {
        nodeType = d.ip === localIp ? 'desktop' : 'desktop';
        parentId = 'switch-core';
      }

      return {
        id: d.id,
        label: d.host,
        ip: d.ip,
        mac: d.mac,
        vendor: d.vendor || 'Dispositivo LAN',
        type: nodeType,
        parent: parentId,
        linkType,
        estado: d.estado,
        ping: d.ping,
        download: d.consumoDownload || 0,
        upload: d.consumoUpload || 0,
        deviceObj: d
      };
    });

    return { parents, clientNodes: nodes, gatewayIp };
  }, [devices, currentSubnetBase]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startYaw: yaw,
      startTilt: tilt
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      // Rotate camera
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      setYaw((dragStartRef.current.startYaw - dx * 0.4) % 360);
      setTilt(Math.max(5, Math.min(85, dragStartRef.current.startTilt - dy * 0.4)));
    } else {
      // Hover detection
      setCursorPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Main rendering simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let orbitalAngleOffset = 0; // drives orbital motion over time

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 540;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Frame runner
    const render = () => {
      // 1. Advance Orbital Angles and Auto-Rotation
      if (speed > 0) {
        orbitalAngleOffset += 0.006 * speed;
      }
      
      // Keep rotating the galaxy view if active
      let currentYaw = yaw;
      if (isRotating && !isDraggingRef.current) {
        currentYaw = (yaw + 0.08 * speed) % 360;
        // set state lazily or bypass state to avoid re-renders at 60fps
        dragStartRef.current.startYaw = currentYaw;
      }

      // Prepare trigonometry coefficients
      const radTilt = (tilt * Math.PI) / 180;
      const radYaw = (currentYaw * Math.PI) / 180;

      const cosP = Math.cos(radTilt);
      const sinP = Math.sin(radTilt);
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);

      // Center coordinates
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // 3D Projection Helper
      const project3D = (x: number, y: number, z: number) => {
        // Yaw (horizontal orbital view rotation around vertical Y axis)
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Pitch (vertical tilt view rotation around horizontal X axis)
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        // Perspective scaling - prevent division by zero or negative values
        const d = 520; // Focal camera length
        const scaleFactor = (d / Math.max(10, d + z2)) * Math.max(0.1, zoom);

        return {
          sx: cx + x1 * scaleFactor,
          sy: cy + y2 * scaleFactor,
          scale: scaleFactor,
          depth: z2 // used for back-to-front rendering sorting
        };
      };

      // Clear Screen with Stellar Nebula Gradient Backdrop
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula Core light - guard radial gradient parameters
      const safeZoom = Math.max(0.1, zoom);
      const grad = ctx.createRadialGradient(cx, cy, 50 * safeZoom, cx, cy, 320 * safeZoom);
      grad.addColorStop(0, 'rgba(14, 116, 144, 0.12)'); // cyan glow core
      grad.addColorStop(0.5, 'rgba(67, 56, 202, 0.04)'); // indigo dust
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Render Starfield Background with Parallax
      stars.forEach(star => {
        const proj = project3D(star.x, star.y, star.z);
        // Clip stars outside viewport
        if (proj.sx >= 0 && proj.sx <= canvas.width && proj.sy >= 0 && proj.sy <= canvas.height) {
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, star.size * proj.scale, 0, 2 * Math.PI);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.max(0.2, Math.min(1.0, 0.6 + 0.4 * Math.sin(star.x + orbitalAngleOffset)));
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0;

      // 3. Define and Calculate all 3D Coordinates
      // Star Router (Sun) at (0,0,0)
      const gatewayNode = {
        id: nodesModel.gatewayIp,
        label: 'Router Gateway',
        ip: nodesModel.gatewayIp,
        type: 'router' as const,
        x: 0,
        y: 0,
        z: 0,
        estado: 'OK',
        ping: 2,
        download: 145.2,
        upload: 92.4,
        size: 18,
        color: '#f59e0b', // Glowing Orange Star
        projected: project3D(0, 0, 0)
      };

      // Orbiting Switches (Planets)
      const switchNodes = nodesModel.parents.map((p, index) => {
        // Base orbit spacing
        const parentAngle = p.angleOffset + orbitalAngleOffset * 0.4;
        const radius = gravitySeparation;
        const x = radius * Math.cos(parentAngle);
        const z = radius * Math.sin(parentAngle);
        const y = 20 * Math.sin(parentAngle * 2); // subtle wave coordinate

        let color = '#06b6d4'; // Cyan for L3 Core
        let size = 11;
        if (p.id === 'switch-poe') {
          color = '#10b981'; // Green for L2 Switch
          size = 10;
        } else if (p.id === 'ap-central') {
          color = '#eab308'; // Amber for Access Point
          size = 9.5;
        }

        return {
          ...p,
          x,
          y,
          z,
          size,
          color,
          projected: project3D(x, y, z)
        };
      });

      // Orbiting Clients (Moons orbiting around Switch Planets)
      // Group clients by parent to position them evenly in rings
      const parentGroups: Record<string, typeof nodesModel.clientNodes> = {};
      nodesModel.parents.forEach(p => {
        parentGroups[p.id] = [];
      });

      nodesModel.clientNodes.forEach(c => {
        if (parentGroups[c.parent]) {
          parentGroups[c.parent].push(c);
        } else {
          parentGroups['switch-core'].push(c);
        }
      });

      const clientNodesProjected = nodesModel.clientNodes.map(c => {
        const parentGroup = parentGroups[c.parent] || [];
        const indexInGroup = parentGroup.findIndex(node => node.id === c.id);
        const totalInGroup = parentGroup.length || 1;

        // Orbit radius of moon around parent planet
        const moonRadius = 45 + (indexInGroup * 3); // stagger moons slightly
        const moonSpeedFactor = 1.4 - (indexInGroup * 0.08); // closer orbit is faster
        const moonAngle = (indexInGroup * 2 * Math.PI) / totalInGroup + (orbitalAngleOffset * moonSpeedFactor);

        // Find parent position
        const parentPlanet = switchNodes.find(p => p.id === c.parent) || switchNodes[0];

        // 3D coordinates relative to parent
        // Tilting moon planes differently for a spherical atomic look!
        const planeTilt = (indexInGroup % 2 === 0 ? 0.35 : -0.35);
        const rx = moonRadius * Math.cos(moonAngle);
        const rz = moonRadius * Math.sin(moonAngle);
        const ry = rx * planeTilt; // 3D slope

        const x = parentPlanet.x + rx;
        const y = parentPlanet.y + ry;
        const z = parentPlanet.z + rz;

        // Size & Color according to status
        let size = 5.5;
        let color = '#10b981'; // OK
        if (c.estado === 'Advertencia') {
          color = '#f59e0b';
        } else if (c.estado === 'Caído') {
          color = '#f43f5e';
          size = 6;
        } else if (c.estado === 'No_Escaneado') {
          color = '#64748b';
        }

        // Highlight matched search
        let isMatched = false;
        if (searchQuery) {
          const s = searchQuery.toLowerCase();
          isMatched = c.label.toLowerCase().includes(s) || c.ip.includes(s) || c.type.toLowerCase().includes(s);
          if (isMatched) {
            size = 8;
          }
        }

        return {
          ...c,
          x,
          y,
          z,
          size,
          color,
          isMatched,
          projected: project3D(x, y, z)
        };
      });

      // Collect all nodes to draw them depth-sorted (painter's algorithm)
      // Map everything to a safe fully typed Unified3DNode structure to avoid union TS warnings
      const allRenderNodes: Unified3DNode[] = [
        {
          id: gatewayNode.id,
          label: gatewayNode.label,
          ip: gatewayNode.ip,
          type: 'router',
          estado: gatewayNode.estado,
          ping: gatewayNode.ping,
          download: gatewayNode.download,
          upload: gatewayNode.upload,
          size: gatewayNode.size,
          color: gatewayNode.color,
          x: gatewayNode.x,
          y: gatewayNode.y,
          z: gatewayNode.z,
          isSwitch: false,
          isClient: false,
          projected: gatewayNode.projected
        },
        ...switchNodes.map(s => ({
          id: s.id,
          label: s.label,
          type: 'switch',
          size: s.size,
          color: s.color,
          x: s.x,
          y: s.y,
          z: s.z,
          isSwitch: true,
          isClient: false,
          projected: s.projected
        })),
        ...clientNodesProjected.map(c => ({
          id: c.id,
          label: c.label,
          ip: c.ip,
          mac: c.mac,
          vendor: c.vendor,
          type: c.type,
          estado: c.estado,
          ping: c.ping,
          download: c.download,
          upload: c.upload,
          size: c.size,
          color: c.color,
          x: c.x,
          y: c.y,
          z: c.z,
          isSwitch: false,
          isClient: true,
          isMatched: c.isMatched,
          parent: c.parent,
          linkType: c.linkType,
          projected: c.projected
        }))
      ];

      // Sort back-to-front (largest depth value z2 first)
      allRenderNodes.sort((a, b) => b.projected.depth - a.projected.depth);

      // Hover Hit Testing in 2D Screen Space
      let currentHoveredId: string | null = null;
      if (cursorPos) {
        // Check closest node (frontwards bias)
        for (let i = allRenderNodes.length - 1; i >= 0; i--) {
          const n = allRenderNodes[i];
          const radiusClick = (n.size * n.projected.scale) + 12;
          const dx = cursorPos.x - n.projected.sx;
          const dy = cursorPos.y - n.projected.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radiusClick) {
            currentHoveredId = n.id;
            break;
          }
        }
      }

      // Render Orbits Rings (Draw below nodes)
      // Switch Orbits around Gateway Router
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      
      // We draw concentric orbital ellipses projected from 3D circles
      const segments = 90;
      const draw3DCircleOrbit = (radius: number, strokeColor: string) => {
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const theta = (i * 2 * Math.PI) / segments;
          const ox = radius * Math.cos(theta);
          const oz = radius * Math.sin(theta);
          const oProj = project3D(ox, 0, oz);
          if (i === 0) {
            ctx.moveTo(oProj.sx, oProj.sy);
          } else {
            ctx.lineTo(oProj.sx, oProj.sy);
          }
        }
        ctx.stroke();
      };

      draw3DCircleOrbit(gravitySeparation, 'rgba(14, 116, 144, 0.14)');
      ctx.setLineDash([]); // Reset dash

      // 4. DRAW 3D WIRE CONNECTIONS WITH DYNAMIC FLOW PULSES
      allRenderNodes.forEach(n => {
        if (!n.projected) return;

        // Router to Switches
        if (n.isSwitch) {
          ctx.beginPath();
          ctx.moveTo(gatewayNode.projected.sx, gatewayNode.projected.sy);
          ctx.lineTo(n.projected.sx, n.projected.sy);
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
          ctx.lineWidth = 1.5 * n.projected.scale;
          ctx.stroke();

          // Render active packets flow
          const linkId = `gateway-${n.id}`;
          if (!linksParticlesRef.current[linkId]) {
            linksParticlesRef.current[linkId] = Array.from({ length: 3 }).map((_, idx) => ({
              t: idx / 3,
              speed: 0.008 + Math.random() * 0.006,
              color: '#22d3ee',
              size: 2.5
            }));
          }

          if (speed > 0) {
            linksParticlesRef.current[linkId].forEach(p => {
              p.t = (p.t + p.speed * speed) % 1.0;
              const px = gatewayNode.x + p.t * (n.x - gatewayNode.x);
              const py = gatewayNode.y + p.t * (n.y - gatewayNode.y);
              const pz = gatewayNode.z + p.t * (n.z - gatewayNode.z);
              const pProj = project3D(px, py, pz);
              
              ctx.beginPath();
              ctx.arc(pProj.sx, pProj.sy, p.size * pProj.scale, 0, 2 * Math.PI);
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 4;
              ctx.fill();
              ctx.shadowBlur = 0; // reset
            });
          }
        }

        // Parent switch to client nodes
        if (n.isClient) {
          const parentPlanet = switchNodes.find(p => p.id === n.parent);
          if (parentPlanet) {
            ctx.beginPath();
            ctx.moveTo(parentPlanet.projected.sx, parentPlanet.projected.sy);
            ctx.lineTo(n.projected.sx, n.projected.sy);
            
            // Faint colored lines based on link standard
            let strokeStyle = 'rgba(148, 163, 184, 0.08)';
            if (n.linkType === 'wifi') {
              strokeStyle = 'rgba(234, 179, 8, 0.08)';
              ctx.setLineDash([2, 4]);
            } else if (n.linkType === 'virtual') {
              strokeStyle = 'rgba(168, 85, 247, 0.08)';
            } else if (n.estado === 'Caído') {
              strokeStyle = 'rgba(244, 63, 94, 0.04)';
            }

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1 * n.projected.scale;
            ctx.stroke();
            ctx.setLineDash([]); // reset

            // Flow packets if client is active and communicating bandwidth
            const isDown = n.estado === 'Caído';
            const isNoScan = n.estado === 'No_Escaneado';
            const totalTraffic = (n.download || 0) + (n.upload || 0);

            if (!isDown && !isNoScan && totalTraffic > 0.05) {
              const linkId = `${n.parent}-${n.id}`;
              if (!linksParticlesRef.current[linkId]) {
                linksParticlesRef.current[linkId] = Array.from({ length: 2 }).map((_, idx) => ({
                  t: idx / 2,
                  speed: 0.01 + Math.random() * 0.01 + Math.min(0.02, totalTraffic * 0.001),
                  color: n.linkType === 'wifi' ? '#fbbf24' : n.linkType === 'virtual' ? '#c084fc' : '#22d3ee',
                  size: 2
                }));
              }

              if (speed > 0) {
                linksParticlesRef.current[linkId].forEach(p => {
                  p.t = (p.t + p.speed * speed) % 1.0;
                  const px = parentPlanet.x + p.t * (n.x - parentPlanet.x);
                  const py = parentPlanet.y + p.t * (n.y - parentPlanet.y);
                  const pz = parentPlanet.z + p.t * (n.z - parentPlanet.z);
                  const pProj = project3D(px, py, pz);
                  
                  ctx.beginPath();
                  ctx.arc(pProj.sx, pProj.sy, p.size * pProj.scale, 0, 2 * Math.PI);
                  ctx.fillStyle = p.color;
                  ctx.fill();
                });
              }
            }
          }
        }
      });

      // 5. DRAW GALAXY NODES (Depth sorted)
      allRenderNodes.forEach(n => {
        if (!n.projected) return;
        const scale = Math.max(0.01, n.projected.scale);
        const radius = Math.max(0.1, n.size * scale);
        const sx = n.projected.sx;
        const sy = n.projected.sy;

        ctx.save();

        const isHovered = n.id === currentHoveredId;
        const isSelected = n.id === selectedNodeId;

        // Search supernova halo highlight
        if (n.isMatched) {
          ctx.beginPath();
          ctx.arc(sx, sy, radius * 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();
        }

        // Selection / Hover targeted HUD Ring
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 8, 0, 2 * Math.PI);
          ctx.strokeStyle = isSelected ? '#fbbf24' : '#22d3ee';
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Outer crosshair ticks
          ctx.strokeStyle = isSelected ? 'rgba(251, 191, 36, 0.4)' : 'rgba(34, 211, 238, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - radius - 14, sy); ctx.lineTo(sx - radius - 9, sy);
          ctx.moveTo(sx + radius + 9, sy); ctx.lineTo(sx + radius + 14, sy);
          ctx.moveTo(sx, sy - radius - 14); ctx.lineTo(sx, sy - radius - 9);
          ctx.moveTo(sx, sy + radius + 9); ctx.lineTo(sx, sy + radius + 14);
          ctx.stroke();
        }

        // Draw node physical body
        if (n.id === gatewayNode.id) {
          // Central Sun (Router)
          // Radiant solar corona
          const sunGlow = ctx.createRadialGradient(sx, sy, Math.max(0.1, radius * 0.4), sx, sy, Math.max(0.1, radius * 2.8));
          sunGlow.addColorStop(0, '#f59e0b');
          sunGlow.addColorStop(0.3, 'rgba(245, 158, 11, 0.45)');
          sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
          
          ctx.beginPath();
          ctx.arc(sx, sy, radius * 2.8, 0, 2 * Math.PI);
          ctx.fillStyle = sunGlow;
          ctx.fill();

          // Star Core
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
          ctx.fillStyle = '#fffbeb';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12 * scale;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          
          // Spinning solar system central rings
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(sx, sy, radius * 1.5, radius * 0.6, orbitalAngleOffset, 0, 2 * Math.PI);
          ctx.stroke();

        } else if (n.isSwitch) {
          // Switches (Planets)
          // Planetary gas shadow
          const pGlow = ctx.createRadialGradient(
            sx - radius * 0.3, 
            sy - radius * 0.3, 
            Math.max(0.1, radius * 0.1), 
            sx, 
            sy, 
            Math.max(0.1, radius)
          );
          pGlow.addColorStop(0, '#ffffff');
          pGlow.addColorStop(0.2, n.color);
          pGlow.addColorStop(1, '#02050f');

          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
          ctx.fillStyle = pGlow;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 8 * scale;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Planetary orbit rings (like Saturn)
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
          ctx.lineWidth = 1.2 * scale;
          ctx.beginPath();
          ctx.ellipse(sx, sy, radius * 1.6, radius * 0.45, Math.PI / 6, 0, 2 * Math.PI);
          ctx.stroke();

        } else {
          // Client nodes (Moons)
          if (n.type === 'server') {
            // Futuristic Monolithic Server cubes!
            const size = radius * 1.4;
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = n.color;
            ctx.lineWidth = 1 * scale;
            
            // Draw isometric or projected square
            ctx.beginPath();
            ctx.rect(sx - size/2, sy - size/2, size, size);
            ctx.fill();
            ctx.stroke();

            // Blinking green/blue lights on server monolith
            const blink = Math.sin(Date.now() * 0.006) > 0;
            ctx.fillStyle = blink ? '#10b981' : '#1e1b4b';
            ctx.fillRect(sx - size/3, sy - size/3, size/4, size/4);
            ctx.fillStyle = !blink ? '#06b6d4' : '#1e1b4b';
            ctx.fillRect(sx + size/12, sy - size/3, size/4, size/4);
          } else {
            // Spherical nodes
            const sphereGrad = ctx.createRadialGradient(
              sx - radius * 0.2, 
              sy - radius * 0.2, 
              Math.max(0.1, radius * 0.1), 
              sx, 
              sy, 
              Math.max(0.1, radius)
            );
            sphereGrad.addColorStop(0, '#ffffff');
            sphereGrad.addColorStop(0.3, n.color);
            sphereGrad.addColorStop(1, '#050a12');

            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
            ctx.fillStyle = sphereGrad;
            
            if (n.estado === 'Caído') {
              // Pulsing threat warning glow
              const alarmPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
              ctx.shadowColor = '#f43f5e';
              ctx.shadowBlur = (8 + alarmPulse * 12) * scale;
            } else {
              ctx.shadowColor = n.color;
              ctx.shadowBlur = 4 * scale;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Render Node labels (if node is close enough or hovered)
        const showLabel = isHovered || isSelected || scale > 0.82 || n.isSwitch || n.isMatched;
        if (showLabel) {
          ctx.fillStyle = isHovered ? '#38bdf8' : isSelected ? '#fbbf24' : '#94a3b8';
          ctx.font = `${Math.max(8.5, Math.min(11, 10 * scale))}px monospace`;
          ctx.font = `bold ${ctx.font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const textY = sy + radius + 4;
          const labelText = n.label.length > 15 ? n.label.substring(0, 13) + '..' : n.label;
          ctx.fillText(labelText, sx, textY);

          // Render secondary IP text
          if (n.ip && (isHovered || isSelected)) {
            ctx.fillStyle = '#64748b';
            ctx.font = `${8 * scale}px monospace`;
            ctx.fillText(n.ip, sx, textY + 12);
          }
        }

        ctx.restore();
      });

      // Update Hover states dynamically inside loop
      if (currentHoveredId !== hoveredNodeId) {
        setHoveredNodeId(currentHoveredId);
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodesModel, zoom, speed, tilt, yaw, isRotating, gravitySeparation, searchQuery, hoveredNodeId, selectedNodeId, cursorPos, stars]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If we dragged, ignore simple clicks to prevent resetting selection
    const dragDist = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.x, 2) + 
      Math.pow(e.clientY - dragStartRef.current.y, 2)
    );
    if (dragDist > 6) return;

    if (hoveredNodeId) {
      setSelectedNodeId(hoveredNodeId);
      // Try to find the matched device
      const client = nodesModel.clientNodes.find(c => c.id === hoveredNodeId);
      if (client && client.deviceObj) {
        onSelectDevice(client.deviceObj);
      } else if (hoveredNodeId === nodesModel.gatewayIp) {
        const gw = devices.find(d => d.ip === nodesModel.gatewayIp);
        if (gw) onSelectDevice(gw);
      }
    } else {
      setSelectedNodeId(null);
    }
  };

  // Find currently selected detailed node model
  const activeSelectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    if (selectedNodeId === nodesModel.gatewayIp) {
      return {
        id: nodesModel.gatewayIp,
        label: 'Gateway Router',
        ip: nodesModel.gatewayIp,
        mac: '00:1E:80:A2:4B:01',
        vendor: 'Cisco Systems',
        type: 'router' as const,
        estado: 'OK',
        ping: 1.5,
        download: 145.2,
        upload: 92.4,
        linkType: 'fiber' as const
      };
    }
    return nodesModel.clientNodes.find(c => c.id === selectedNodeId) || null;
  }, [selectedNodeId, nodesModel, devices]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative bg-[#010307] border border-cyan-950/50 p-4 rounded-md overflow-hidden animate-fade-in">
      
      {/* LEFT SIDEBAR: GLASS CONTROL HUD */}
      <div className="xl:col-span-4 bg-slate-950/80 border border-slate-900/60 p-4 rounded flex flex-col justify-between space-y-4 backdrop-blur-md z-30 select-none">
        <div className="space-y-4">
          
          {/* Header */}
          <div className="border-b border-cyan-950 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                Universo 3D Interactiva
              </span>
            </div>
            <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono uppercase">
              Capa Física
            </span>
          </div>

          {/* Explanation */}
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
            El <strong>Universo de Red 3D</strong> proyecta la topología LAN como un sistema estelar. El <strong>Router Gateway es el Sol central</strong>, los switches de distribución son planetas, y los dispositivos clientes orbitan en planos gravitacionales como lunas. Las órbitas y el flujo de fotones pulsan según la velocidad de tráfico real.
          </p>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded p-2 pl-8 text-xs text-slate-300 font-mono outline-none"
              placeholder="Buscar host / IP en el Cosmos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* HUD Slider Controls */}
          <div className="space-y-3.5 pt-1.5">
            
            {/* Zoom */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Escala (Zoom)</span>
                <span className="text-cyan-400 font-bold">{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
            </div>

            {/* Tilt (Pitch Angle) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Inclinación Galáctica</span>
                <span className="text-emerald-400 font-bold">{tilt}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                value={tilt}
                onChange={(e) => setTilt(parseInt(e.target.value))}
              />
            </div>

            {/* Yaw (Horizontal Camera Angle) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Giro Manual (Rotación)</span>
                <span className="text-amber-400 font-bold">{yaw}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                value={yaw}
                onChange={(e) => setYaw(parseInt(e.target.value))}
              />
            </div>

            {/* Orbit Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Velocidad de Órbitas</span>
                <span className="text-cyan-400 font-bold">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.1"
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
            </div>

            {/* Planet Separation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Distancia Gravitacional</span>
                <span className="text-indigo-400 font-bold">{gravitySeparation}px</span>
              </div>
              <input
                type="range"
                min="90"
                max="220"
                step="5"
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                value={gravitySeparation}
                onChange={(e) => setGravitySeparation(parseInt(e.target.value))}
              />
            </div>

          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-center pt-2">
            <button 
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 rounded border text-[10.5px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                isRotating 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20' 
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {isRotating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} /> : <Pause className="h-3.5 w-3.5" />}
              <span>{isRotating ? 'Giro Auto: ON' : 'Giro Auto: OFF'}</span>
            </button>
            <button 
              onClick={() => {
                setZoom(1.0);
                setSpeed(1.0);
                setTilt(30);
                setYaw(45);
                setGravitySeparation(140);
                setIsRotating(true);
                setSearchQuery('');
              }}
              className="p-1.5 rounded bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-850 text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restablecer</span>
            </button>
          </div>

        </div>

        {/* Selected Node Details Box (Holographic Cyber panel) */}
        <div className="pt-2 border-t border-cyan-950/60">
          {activeSelectedNode ? (
            <div className="bg-[#040915] border border-cyan-500/20 p-3 rounded space-y-2 relative overflow-hidden animate-slide-up">
              {/* Scanline overlay effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,185,129,0.1)_50%,rgba(0,0,0,0)_50%)] bg-[size:100%_4px]"></div>

              <div className="flex justify-between items-start border-b border-cyan-950 pb-1.5">
                <div>
                  <h4 className="text-[11.5px] font-bold text-white font-mono flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                      activeSelectedNode.estado === 'Caído' ? 'bg-red-500 animate-pulse' :
                      activeSelectedNode.estado === 'Advertencia' ? 'bg-amber-500 animate-pulse' :
                      'bg-emerald-400 animate-pulse'
                    }`} />
                    {activeSelectedNode.label}
                  </h4>
                  <span className="text-[9.5px] font-mono text-cyan-400/80">{activeSelectedNode.ip}</span>
                </div>
                <span className="text-[8.5px] bg-cyan-950 text-cyan-400 border border-cyan-900 px-1 py-0.2 rounded font-mono uppercase shrink-0">
                  {activeSelectedNode.type.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 leading-tight">
                <div>
                  <span className="text-slate-500 block">MAC FÍSICA</span>
                  <span className="text-slate-200 block truncate">{activeSelectedNode.mac}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">FABRICANTE</span>
                  <span className="text-slate-200 block truncate">{activeSelectedNode.vendor}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">LATENCIA</span>
                  <span className={`block font-bold ${
                    activeSelectedNode.ping === null ? 'text-rose-500' : 'text-emerald-400'
                  }`}>
                    {activeSelectedNode.ping !== null ? `${activeSelectedNode.ping} ms` : 'TIMEOUT'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">ESTADO</span>
                  <span className={`block font-bold uppercase ${
                    activeSelectedNode.estado === 'Caído' ? 'text-red-400' :
                    activeSelectedNode.estado === 'Advertencia' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {activeSelectedNode.estado}
                  </span>
                </div>
              </div>

              {/* Bandwidth Monitor */}
              {activeSelectedNode.download !== undefined && activeSelectedNode.estado !== 'Caído' && (
                <div className="border-t border-cyan-950/50 pt-1.5 text-[9.5px] font-mono text-slate-400 flex justify-between items-center bg-cyan-950/15 p-1 rounded">
                  <span className="text-slate-500">TRÁFICO</span>
                  <div className="flex gap-2 text-[9px]">
                    <span className="text-cyan-400 font-bold">↓ {activeSelectedNode.download.toFixed(1)} Mb</span>
                    <span className="text-amber-500 font-bold">↑ {activeSelectedNode.upload.toFixed(1)} Mb</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#02050c] border border-slate-900/60 p-3 rounded text-center text-slate-500 text-[10px] font-mono py-4">
              <span>Selecciona un nodo del universo para analizar su física 3D en tiempo real.</span>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT VIEWPORT: CANVAS GRAPHICS STAGE */}
      <div className="xl:col-span-8 bg-[#01040a] relative border border-slate-900 rounded overflow-hidden flex flex-col justify-between">
        
        {/* Stage Header */}
        <div className="absolute top-3 left-3 pointer-events-none z-20 space-y-1 select-none">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-900 p-1.5 px-2.5 rounded text-[10px] text-slate-300 font-mono">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-bold">UNIVERSE: {currentSubnetBase}.0/24</span>
          </div>
          <div className="text-[8.5px] text-slate-500 font-mono bg-slate-950/40 p-1 rounded">
            * Haz clic y arrastra para rotar la cámara en 3D
          </div>
        </div>

        {/* Legend overlays */}
        <div className="absolute top-3 right-3 pointer-events-none z-20 hidden md:flex flex-col bg-slate-950/80 border border-slate-900 p-2 rounded text-[9.5px] font-mono text-slate-450 space-y-0.75 select-none">
          <span className="font-bold text-slate-300 border-b border-slate-900 pb-1 mb-1 uppercase text-[8.5px]">Nomenclatura Cósmica</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
            Router Gateway (Sol Central)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            Switches L2/L3 (Planetas)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            Hosts Activos (OK)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse"></span>
            Alarmas / Caídos (Lunas Rotas)
          </span>
        </div>

        {/* CANVAS GRAPHIC ELEMENT */}
        <div className="relative w-full h-[540px] cursor-grab active:cursor-grabbing select-none overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClick={handleCanvasClick}
            className="block w-full h-full"
          />

          {/* Interactive cursor hover holographic tooltip */}
          {hoveredNodeId && cursorPos && (() => {
            let nodeLabel = '';
            let nodeIp = '';
            let nodeEstado = '';
            let nodePing: number | null = null;
            
            if (hoveredNodeId === nodesModel.gatewayIp) {
              nodeLabel = 'Router Gateway';
              nodeIp = nodesModel.gatewayIp;
              nodeEstado = 'OK';
              nodePing = 2;
            } else {
              const client = nodesModel.clientNodes.find(c => c.id === hoveredNodeId);
              if (client) {
                nodeLabel = client.label;
                nodeIp = client.ip;
                nodeEstado = client.estado;
                nodePing = client.ping;
              } else {
                const sw = nodesModel.parents.find(p => p.id === hoveredNodeId);
                if (sw) {
                  nodeLabel = sw.label;
                  nodeIp = 'Capa de Enlace (Switch)';
                  nodeEstado = 'OK';
                }
              }
            }

            if (!nodeLabel) return null;

            return (
              <div 
                className="absolute pointer-events-none select-none z-40 bg-slate-950/95 border border-cyan-500/30 p-2.5 rounded shadow-2xl font-mono text-left text-[10px] text-slate-300 space-y-0.75 animate-fade-in"
                style={{
                  left: `${cursorPos.x + 18}px`,
                  top: `${cursorPos.y - 45}px`
                }}
              >
                <div className="font-bold text-white border-b border-slate-900 pb-0.75 mb-0.75 truncate max-w-[140px]">
                  {nodeLabel}
                </div>
                <div>IP: <span className="text-cyan-400">{nodeIp}</span></div>
                {nodeEstado && (
                  <div>ESTADO: <span className={
                    nodeEstado === 'Caído' ? 'text-rose-400 font-bold' :
                    nodeEstado === 'Advertencia' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
                  }>{nodeEstado}</span></div>
                )}
                {nodePing !== null && (
                  <div>PING: <span className="text-slate-200">{nodePing} ms</span></div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer Technical Captions */}
        <div className="bg-[#02050b] border-t border-slate-900 p-3 px-4 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
            <span>Estabilidad orbital controlada. Fuerzas de arrastre electromagnético simuladas.</span>
          </div>
          <span className="hidden sm:inline">DEMOSTRADOR FÍSICO 3D (PROYECCIÓN VECTORIAL)</span>
        </div>

      </div>

    </div>
  );
}
