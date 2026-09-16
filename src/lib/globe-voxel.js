/* HeyChamba — mundo voxel isométrico, estilo del ícono de marca.
   Cámara ortográfica en vista de esquina (azimut 45°, elevación 35.26°):
   se ven tres caras a la vez. Luz principal arriba-izquierda-frente, relleno
   tenue del lado opuesto y costura oscura por cara como oclusión. */
import * as THREE from "three";

export function installVoxelGlobe() {
  const LAND = [
    [48, 72, -168, -58], [30, 49, -125, -70], [15, 31, -107, -88], [8, 18, -92, -77],
    [60, 83, -55, -22],
    [-5, 12, -80, -50], [-23, -5, -73, -35], [-40, -23, -73, -53], [-55, -40, -75, -64],
    [12, 35, -17, 35], [0, 12, -17, 48], [-18, 0, 10, 42], [-35, -18, 13, 37], [-25, -12, 43, 50],
    [36, 60, -10, 40], [60, 71, 5, 30],
    [40, 75, 40, 180], [20, 40, 45, 125], [8, 22, 70, 90], [8, 20, 95, 110], [30, 45, 128, 145],
    [-10, 5, 95, 140],
    [-38, -11, 113, 153], [-46, -35, 166, 179],
    [-90, -70, -180, 180]
  ];
  const isLand = (lat, lon) => LAND.some(b => lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]);

  const CP = [
    [1, 16, 'Ciudad de México', 19.43, -99.13],
    [20, 20, 'Aguascalientes', 21.88, -102.29],
    [21, 22, 'Baja California', 32.52, -117.02],
    [23, 23, 'Baja California Sur', 24.14, -110.31],
    [24, 24, 'Campeche', 19.85, -90.53],
    [25, 27, 'Coahuila', 25.42, -101.0],
    [28, 28, 'Colima', 19.24, -103.72],
    [29, 30, 'Chiapas', 16.75, -93.11],
    [31, 33, 'Chihuahua', 28.63, -106.07],
    [34, 35, 'Durango', 24.02, -104.66],
    [36, 38, 'Guanajuato', 21.02, -101.26],
    [39, 41, 'Guerrero', 17.55, -99.5],
    [42, 43, 'Hidalgo', 20.12, -98.73],
    [44, 49, 'Jalisco', 20.67, -103.35],
    [50, 57, 'Estado de México', 19.29, -99.65],
    [58, 61, 'Michoacán', 19.7, -101.19],
    [62, 62, 'Morelos', 18.92, -99.23],
    [63, 63, 'Nayarit', 21.51, -104.89],
    [64, 67, 'Nuevo León', 25.69, -100.32],
    [68, 71, 'Oaxaca', 17.07, -96.72],
    [72, 75, 'Puebla', 19.04, -98.2],
    [76, 76, 'Querétaro', 20.59, -100.39],
    [77, 77, 'Quintana Roo', 21.16, -86.85],
    [78, 79, 'San Luis Potosí', 22.16, -100.98],
    [80, 82, 'Sinaloa', 24.81, -107.39],
    [83, 85, 'Sonora', 29.07, -110.96],
    [86, 86, 'Tabasco', 17.99, -92.93],
    [87, 89, 'Tamaulipas', 23.74, -99.14],
    [90, 90, 'Tlaxcala', 19.31, -98.24],
    [91, 96, 'Veracruz', 19.19, -96.14],
    [97, 97, 'Yucatán', 20.97, -89.62],
    [98, 99, 'Zacatecas', 22.77, -102.58]
  ];
  function lookup(cp) {
    if (!/^\d{5}$/.test(String(cp || ''))) return null;
    const p = parseInt(String(cp).slice(0, 2), 10);
    const r = CP.find(x => p >= x[0] && p <= x[1]);
    return r ? { estado: r[2], lat: r[3], lon: r[4] } : null;
  }
  window.HC_CP = cp => { const r = lookup(cp); return r ? r.estado : null; };

  const loadThree = async () => THREE;

  const GREEN = '#3FBE63';
  const BLUE = '#7DCDF5';
  /* Luz cocida por cara (orden de BoxGeometry: +X, -X, +Y, -Y, +Z, -Z).
     Principal arriba-izquierda-frente: techo pleno, frente y flanco medios,
     derecha en sombra. Determinista: no depende de luces ni puede saturar. */
  const FACE = [0.68, 0.92, 1.0, 0.5, 0.86, 0.6];
  const R = 7.2;          /* radio de la bola, en bloques */
  const DEPTH_MAX = 6;    /* usado solo para asentar la banderita */
  const ISO_X = 0.529;    /* 30.3°: cámara sobre el hemisferio norte, a la altura de Texas */
  const ISO_Y = Math.PI / 4;                 /* 45° */

  /* Caja con la luz ya escrita en sus vértices. */
  function shadedBox(THREE, w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const f = FACE[Math.floor(i / 4)];
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = f;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }

  function seamTexture(THREE) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 64, 64);
    /* Grieta entre cubos: borde oscuro que actúa como oclusión ambiental. */
    const g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    x.strokeStyle = g;
    x.lineWidth = 5;
    x.strokeRect(2.5, 2.5, 59, 59);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  class VoxelGlobe extends HTMLElement {
    static get observedAttributes() { return ['cp']; }

    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.width = '100%';
      this.style.height = '100%';
      this._init();
    }

    disconnectedCallback() {
      this._dead = true;
      this._live = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._io) this._io.disconnect();
      if (this._vis) document.removeEventListener('visibilitychange', this._vis);
      if (this._ro) this._ro.disconnect();
      if (this._renderer) this._renderer.dispose();
    }

    attributeChangedCallback(name, _old, val) {
      if (name === 'cp') this._plant(val);
    }
    set cp(v) { this.setAttribute('cp', v == null ? '' : String(v)); }
    get cp() { return this.getAttribute('cp'); }

    async _init() {
      let THREE;
      try { THREE = await loadThree(); } catch (e) { this._fallback(); return; }
      if (this._dead) return;
      if (!THREE || !THREE.WebGLRenderer) { this._fallback(); return; }
      this.THREE = THREE;

      const w = this.clientWidth || 320;
      const h = this.clientHeight || 240;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      this.appendChild(renderer.domElement);
      this._renderer = renderer;

      const scene = new THREE.Scene();

      /* Ortográfica: paralelas se mantienen paralelas, sin distorsión. */
      const SPAN = R * 2.72;
      const aspect = w / h;
      const camera = new THREE.OrthographicCamera(
        -SPAN * Math.max(1, aspect) / 2, SPAN * Math.max(1, aspect) / 2,
        SPAN * Math.max(1, 1 / aspect) / 2, -SPAN * Math.max(1, 1 / aspect) / 2,
        -200, 400
      );
      camera.position.set(0, 0, 60);
      this._scene = scene;
      this._camera = camera;
      this._span = SPAN;

      /* Luz principal arriba-izquierda-frente: cara superior e izquierda
         iluminadas, derecha en sombra. Relleno tenue para que no vaya a negro. */
      /* Vista de esquina fija; el giro pasa por dentro, en el eje vertical. */
      const tilt = new THREE.Group();
      tilt.rotation.set(ISO_X, ISO_Y, 0);
      scene.add(tilt);
      const spin = new THREE.Group();
      tilt.add(spin);
      this._tilt = tilt;
      this._spin = spin;

      const seam = seamTexture(THREE);
      this._seam = seam;

      /* Bola de bloques: cascarón de dos capas para que la vista de esquina
         tenga masa desde cualquier ángulo, y lat/lon por vóxel para que los
         continentes envuelvan la esfera. */
      const cells = [];
      const lim = Math.ceil(R);
      for (let i = -lim; i <= lim; i++) {
        for (let j = -lim; j <= lim; j++) {
          for (let n = -lim; n <= lim; n++) {
            const x = i + 0.5, y = j + 0.5, z = n + 0.5;
            const d = Math.sqrt(x * x + y * y + z * z);
            if (d > R || d < R - 2.1) continue;
            const lat = Math.asin(y / d) * 180 / Math.PI;
            const lon = Math.atan2(x, z) * 180 / Math.PI - 9;
            const land = isLand(lat, ((lon + 540) % 360) - 180);
            cells.push([x, y, z, land]);
          }
        }
      }

      const geo = shadedBox(THREE, 0.98, 0.98, 0.98);
      const mat = new THREE.MeshBasicMaterial({ map: seam, vertexColors: true });
      const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
      const m4 = new THREE.Matrix4();
      const cLand = new THREE.Color(GREEN);
      const cSea = new THREE.Color(BLUE);
      cells.forEach((c, idx) => {
        m4.makeTranslation(c[0], c[1], c[2]);
        mesh.setMatrixAt(idx, m4);
        mesh.setColorAt(idx, c[3] ? cLand : cSea);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      spin.add(mesh);

      const resize = () => {
        const cw = this.clientWidth || w, ch = this.clientHeight || h;
        const a = cw / ch;
        camera.left = -SPAN * Math.max(1, a) / 2;
        camera.right = SPAN * Math.max(1, a) / 2;
        camera.top = SPAN * Math.max(1, 1 / a) / 2;
        camera.bottom = -SPAN * Math.max(1, 1 / a) / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch, false);
      };
      resize();
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);

      let lastSpin = performance.now();
      let last = lastSpin;
      let acc = 0;
      const FRAME = 1000 / 30;
      const tick = now => {
        this._raf = 0;
        if (this._dead || !this._live) return;
        acc += now - last;
        last = now;
        if (acc < FRAME) { this._raf = requestAnimationFrame(tick); return; }
        acc = 0;
        const dt = Math.min(0.06, (now - lastSpin) / 1000);
        lastSpin = now;
        const f = this._focus;
        if (f) {
          const el = now - f.t0;
          const p = Math.min(1, el / 900);
          const e = 1 - Math.pow(1 - p, 3);
          spin.rotation.y = f.from + (f.to - f.from) * e;
          if (el > 3200) { this._focus = null; lastSpin = now; }
        } else {
          spin.rotation.y += dt * 0.4;
        }
        if (this._marker && this._marker.userData.born) {
          const p = Math.min(1, (now - this._marker.userData.born) / 520);
          const sc = 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
          this._marker.scale.setScalar(Math.max(0.001, sc));
        }
        renderer.render(scene, camera);
        this._raf = requestAnimationFrame(tick);
      };

      this._render = () => renderer.render(scene, camera);
      /* Visibilidad por observador: sin medir el layout en cada cuadro. */
      this._onScreen = false;
      this._io = new IntersectionObserver(es => {
        this._onScreen = es.some(e => e.isIntersecting);
        if (this._onScreen) this._start(); else this._stop();
      }, { rootMargin: '160px' });
      this._io.observe(this);
      this._live = false;
      this._start = () => {
        if (this._dead || this._live || this._raf || document.hidden) return;
        if (!this._onScreen) return;
        this._live = true;
        last = performance.now();
        lastSpin = last;
        acc = FRAME;
        this._raf = requestAnimationFrame(tick);
      };
      this._stop = () => {
        this._live = false;
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
      };
      this._vis = () => { if (document.hidden) this._stop(); else this._start(); };
      document.addEventListener('visibilitychange', this._vis);
      renderer.render(scene, camera);

      if (this._pending) { const p = this._pending; this._pending = null; this._plant(p); }
      else if (this.getAttribute('cp')) this._plant(this.getAttribute('cp'));
    }

    /* Sin WebGL o sin red: el render del ícono, girando en su eje. */
    _fallback() {
      if (this._fb) return;
      this._fb = true;
      if (!document.getElementById('hc-globe-kf')) {
        const st = document.createElement('style');
        st.id = 'hc-globe-kf';
        st.textContent = '@keyframes hcGlobeSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }
      const img = document.createElement('img');
      img.src = (window.HC_ICON && window.HC_ICON('globe-ref')) || './img/globe-ref.png';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;animation:hcGlobeSpin 14s linear infinite';
      this.appendChild(img);
    }

    _plant(cp) {
      const info = lookup(cp);
      if (!this._spin) { this._pending = cp; return; }
      const THREE = this.THREE;
      if (this._marker) { this._spin.remove(this._marker); this._marker = null; }
      if (!info) return;

      const latR = info.lat * Math.PI / 180;
      const lonR = (((info.lon + 9 + 540) % 360) - 180) * Math.PI / 180;
      const dir = new THREE.Vector3(
        Math.cos(latR) * Math.sin(lonR),
        Math.sin(latR),
        Math.cos(latR) * Math.cos(lonR)
      ).normalize();

      const box = (w, h, d, color) => new THREE.Mesh(
        shadedBox(THREE, w, h, d),
        new THREE.MeshBasicMaterial({ map: this._seam, vertexColors: true, color: new THREE.Color(color) })
      );

      const g = new THREE.Group();
      const base = box(1.9, 0.6, 1.9, '#5251F7');
      base.position.y = 0.3;
      g.add(base);
      for (let i = 0; i < 4; i++) {
        const seg = box(0.5, 0.7, 0.5, '#F3F0E9');
        seg.position.y = 0.6 + 0.7 * i + 0.35;
        g.add(seg);
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          const f = box(0.72, 0.72, 0.3, '#E5322D');
          f.position.set(0.61 + 0.72 * i, 3.0 - 0.72 * j, 0);
          g.add(f);
        }
      }
      g.position.copy(dir).multiplyScalar(R - 0.3);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.userData.born = performance.now();
      g.scale.setScalar(1);
      this._spin.add(g);
      this._marker = g;
      /* Gira lo justo para cancelar la longitud del pin y el azimut isométrico,
         así la bandera queda de frente a la cámara y no en el borde. */
      const from = this._spin.rotation.y;
      const az = Math.atan2(dir.x, dir.z);
      let to = -az - ISO_Y;
      to += Math.round((from - to) / (Math.PI * 2)) * Math.PI * 2;
      this._focus = { t0: performance.now(), from: from, to: to };
      if (this._start) this._start();
      if (this._render) this._render();
    }
  }

  if (!window.customElements.get('voxel-globe')) {
    window.customElements.define('voxel-globe', VoxelGlobe);
  }
}
