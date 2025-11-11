/**
 * 3D形状レンダラーモジュール (Shape3DRenderer)
 * 
 * 機能:
 * - 点群をy=0中心に回転させて3D点群を生成
 * - アルファシェイプ（凸包）による3D形状生成
 * - Canvas 3Dによる描画
 * - 視点の回転、ズーム操作
 */

class Shape3DRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // 描画設定
    this.rotation = { x: 0, y: 0, z: 0 };
    this.zoom = 1;
    this.autoRotate = false;
    
    // マウス操作
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // 3Dデータ
    this.points3D = [];
    this.faces = [];
    this.centroid = { x: 0, y: 0, z: 0 };  // 重心
    
    // 回転分割数（荒くして包み込む形状に）
    this.rotationDivisions = 16;  // 32から16に減少
    
    // 補間設定
    this.interpolationSteps = 0;  // 補間なし
    
    // アルファシェイプ設定
    this.alphaRadius = 1.5;  // 点からの膨張係数（大きいほど荒く包む）
    this.envelopeSmoothing = 0.3;  // 包絡線のスムージング係数
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.attachEventListeners();
    this.animate();
  }

  /**
   * イベントリスナーの登録
   */
  attachEventListeners() {
    // タッチ操作用の変数
    this.touches = [];
    this.lastTouchDistance = 0;
    
    // マウスドラッグで回転
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        this.rotation.y += deltaX * 0.01;
        this.rotation.x += deltaY * 0.01;
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    // ホイールでズーム
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom *= (1 - e.deltaY * 0.001);
      this.zoom = Math.max(0.1, Math.min(5, this.zoom));
    });
    
    // タッチ操作対応
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touches = Array.from(e.touches);
      
      if (this.touches.length === 1) {
        // 1本指: 回転
        this.isDragging = true;
        this.lastMouseX = this.touches[0].clientX;
        this.lastMouseY = this.touches[0].clientY;
      } else if (this.touches.length === 2) {
        // 2本指: ズーム
        this.isDragging = false;
        this.lastTouchDistance = this.getTouchDistance();
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.touches = Array.from(e.touches);
      
      if (this.touches.length === 1 && this.isDragging) {
        // 1本指: 回転
        const deltaX = this.touches[0].clientX - this.lastMouseX;
        const deltaY = this.touches[0].clientY - this.lastMouseY;
        
        this.rotation.y += deltaX * 0.01;
        this.rotation.x += deltaY * 0.01;
        
        this.lastMouseX = this.touches[0].clientX;
        this.lastMouseY = this.touches[0].clientY;
      } else if (this.touches.length === 2) {
        // 2本指: ピンチズーム
        const currentDistance = this.getTouchDistance();
        const delta = currentDistance - this.lastTouchDistance;
        
        this.zoom *= (1 + delta * 0.01);
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));
        
        this.lastTouchDistance = currentDistance;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touches = Array.from(e.touches);
      
      if (this.touches.length === 0) {
        this.isDragging = false;
        this.lastTouchDistance = 0;
      } else if (this.touches.length === 1) {
        // 2本指から1本指に変わった場合
        this.isDragging = true;
        this.lastMouseX = this.touches[0].clientX;
        this.lastMouseY = this.touches[0].clientY;
        this.lastTouchDistance = 0;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.isDragging = false;
      this.touches = [];
      this.lastTouchDistance = 0;
    }, { passive: false });
  }
  
  /**
   * 2つのタッチポイント間の距離を計算
   * @returns {number} - 距離
   */
  getTouchDistance() {
    if (this.touches.length < 2) return 0;
    
    const dx = this.touches[0].clientX - this.touches[1].clientX;
    const dy = this.touches[0].clientY - this.touches[1].clientY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 2D点群から3D形状を生成
   * @param {Array} pointCloud2D - 2D点群 [{x, y}, ...]
   * @returns {Object} - 3D形状データ
   */
  generateShape(pointCloud2D) {
    console.log('3D形状生成開始:', pointCloud2D);
    
    // 0. 点群を囲む包絡線を生成（荒いアルファシェイプ）
    const envelopePoints = this.generateEnvelope(pointCloud2D);
    console.log('包絡線点数:', envelopePoints.length);
    
    // 1. 包絡線をx=0中心に回転させて3D点群を生成
    this.points3D = this.generate3DPoints(envelopePoints);
    
    // 2. メッシュを生成
    this.faces = this.generateMesh(envelopePoints);
    
    // 3. 重心を計算
    this.centroid = this.calculateCentroid();
    
    console.log('3D点数:', this.points3D.length);
    console.log('面数:', this.faces.length);
    console.log('重心:', this.centroid);
    
    return {
      points: this.points3D,
      faces: this.faces,
      centroid: this.centroid
    };
  }

  /**
   * 点群を囲む包絡線を生成（荒いアルファシェイプ）
   * @param {Array} pointCloud2D - 元の2D点群
   * @returns {Array} - 包絡線の点群
   */
  generateEnvelope(pointCloud2D) {
    if (pointCloud2D.length < 2) {
      return pointCloud2D;
    }

    let envelope = [];  // const から let に変更
    
    // 点群を少数のサンプル点に間引く
    const sampleStep = Math.max(1, Math.floor(pointCloud2D.length / 8));  // 最大8点程度にサンプリング
    
    for (let i = 0; i < pointCloud2D.length; i += sampleStep) {
      const point = pointCloud2D[i];
      
      // 各点を膨張させる（アルファ半径で外側に拡張）
      const expandedY = point.y * this.alphaRadius;
      
      envelope.push({
        x: point.x,
        y: expandedY
      });
    }
    
    // 最後の点を必ず含める
    if (envelope[envelope.length - 1] !== pointCloud2D[pointCloud2D.length - 1]) {
      const lastPoint = pointCloud2D[pointCloud2D.length - 1];
      envelope.push({
        x: lastPoint.x,
        y: lastPoint.y * this.alphaRadius
      });
    }
    
    // スムージング処理（Moving Average）
    if (this.envelopeSmoothing > 0) {
      envelope = this.smoothEnvelope(envelope);
    }
    
    return envelope;
  }

  /**
   * 包絡線をスムージング
   * @param {Array} envelope - 包絡線の点群
   * @returns {Array} - スムージングされた点群
   */
  smoothEnvelope(envelope) {
    if (envelope.length < 3) {
      return envelope;
    }

    const smoothed = [];
    
    for (let i = 0; i < envelope.length; i++) {
      const prev = envelope[Math.max(0, i - 1)];
      const curr = envelope[i];
      const next = envelope[Math.min(envelope.length - 1, i + 1)];
      
      // 3点の加重平均
      const weight = this.envelopeSmoothing;
      smoothed.push({
        x: curr.x * (1 - weight) + (prev.x + next.x) * weight / 2,
        y: curr.y * (1 - weight) + (prev.y + next.y) * weight / 2
      });
    }
    
    return smoothed;
  }

  /**
   * 2D点群を回転させて3D点群を生成
   * @param {Array} pointCloud2D - 2D点群
   * @returns {Array} - 3D点群
   */
  generate3DPoints(pointCloud2D) {
    const points3D = [];
    const divisions = this.rotationDivisions;
    
    // 各2D点について
    pointCloud2D.forEach((point, pointIndex) => {
      const x2D = point.x;
      const y2D = point.y;
      
      // x=0を中心に回転（x軸周りの回転）
      for (let i = 0; i < divisions; i++) {
        const angle = (2 * Math.PI * i) / divisions;
        
        // x軸周りの回転: y' = y*cos(θ) - z*sin(θ), z' = y*sin(θ) + z*cos(θ)
        // 初期位置がxy平面上なので、z=0として
        const x3D = x2D;
        const y3D = y2D * Math.cos(angle);
        const z3D = y2D * Math.sin(angle);
        
        points3D.push({
          x: x3D,
          y: y3D,
          z: z3D,
          originalIndex: pointIndex,
          rotationIndex: i
        });
      }
    });
    
    return points3D;
  }

  /**
   * 点群を補間して滑らかにする
   * @param {Array} pointCloud2D - 元の2D点群
   * @returns {Array} - 補間された2D点群
   */
  interpolatePoints(pointCloud2D) {
    if (pointCloud2D.length < 2) {
      return pointCloud2D;
    }

    const interpolated = [];
    
    for (let i = 0; i < pointCloud2D.length; i++) {
      const current = pointCloud2D[i];
      interpolated.push({ ...current });
      
      // 最後の点以外は次の点との間を補間
      if (i < pointCloud2D.length - 1) {
        const next = pointCloud2D[i + 1];
        
        // Catmull-Rom スプライン補間（より滑らか）
        for (let j = 1; j <= this.interpolationSteps; j++) {
          const t = j / (this.interpolationSteps + 1);
          
          // 前後の点も考慮した補間
          const p0 = i > 0 ? pointCloud2D[i - 1] : current;
          const p1 = current;
          const p2 = next;
          const p3 = i < pointCloud2D.length - 2 ? pointCloud2D[i + 2] : next;
          
          const x = this.catmullRomInterpolate(p0.x, p1.x, p2.x, p3.x, t);
          const y = this.catmullRomInterpolate(p0.y, p1.y, p2.y, p3.y, t);
          
          interpolated.push({ x, y });
        }
      }
    }
    
    return interpolated;
  }

  /**
   * Catmull-Rom スプライン補間
   * @param {number} p0, p1, p2, p3 - 4つの制御点
   * @param {number} t - 補間パラメータ (0-1)
   * @returns {number} - 補間された値
   */
  catmullRomInterpolate(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * メッシュを生成（回転体の側面と前後面）
   * @param {Array} pointCloud2D - 2D点群
   * @returns {Array} - 面データ
   */
  generateMesh(pointCloud2D) {
    const faces = [];
    const divisions = this.rotationDivisions;
    const pointCount = pointCloud2D.length;
    
    // 側面の生成
    for (let i = 0; i < pointCount - 1; i++) {
      for (let j = 0; j < divisions; j++) {
        const nextJ = (j + 1) % divisions;
        
        // 現在の輪の点インデックス
        const idx1 = i * divisions + j;
        const idx2 = i * divisions + nextJ;
        
        // 次の輪の点インデックス
        const idx3 = (i + 1) * divisions + nextJ;
        const idx4 = (i + 1) * divisions + j;
        
        // 四角形を2つの三角形に分割
        faces.push({
          indices: [idx1, idx2, idx3],
          color: this.getColorForFace(i, j)
        });
        
        faces.push({
          indices: [idx1, idx3, idx4],
          color: this.getColorForFace(i, j)
        });
      }
    }
    
    // 始端の面の生成（x=最小の面）
    if (pointCloud2D.length > 0 && pointCloud2D[0].x !== 0) {
      // 中心点を追加
      const centerIndex = this.points3D.length;
      this.points3D.push({ x: pointCloud2D[0].x, y: 0, z: 0 });
      
      for (let j = 0; j < divisions; j++) {
        const nextJ = (j + 1) % divisions;
        faces.push({
          indices: [centerIndex, nextJ, j],
          color: '#666666'
        });
      }
    }
    
    return faces;
  }

  /**
   * 面の色を取得
   */
  getColorForFace(ringIndex, segmentIndex) {
    const hue = (ringIndex * 30 + segmentIndex * 5) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }

  /**
   * 重心を計算
   * @returns {Object} - 重心座標 {x, y, z}
   */
  calculateCentroid() {
    if (this.points3D.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    this.points3D.forEach(point => {
      sumX += point.x;
      sumY += point.y;
      sumZ += point.z;
    });

    return {
      x: sumX / this.points3D.length,
      y: sumY / this.points3D.length,
      z: sumZ / this.points3D.length
    };
  }

  /**
   * 描画
   */
  render() {
    if (this.points3D.length === 0) {
      this.clear();
      this.drawMessage('3D形状データがありません');
      return;
    }
    
    this.clear();
    
    // 3D→2D投影
    const projectedPoints = this.points3D.map(p => this.project3DTo2D(p));
    
    // 面を描画（Z-sortingで奥から手前へ）
    const facesWithDepth = this.faces.map(face => {
      const avgZ = face.indices.reduce((sum, idx) => {
        const p = this.points3D[idx];
        const rotated = this.rotatePoint(p);
        return sum + rotated.z;
      }, 0) / face.indices.length;
      
      return { face, avgZ };
    });
    
    // 奥から手前にソート
    facesWithDepth.sort((a, b) => a.avgZ - b.avgZ);
    
    // 面を描画
    facesWithDepth.forEach(({ face }) => {
      this.drawFace(face, projectedPoints);
    });
    
    // ワイヤーフレーム描画
    this.drawWireframe(projectedPoints);
  }

  /**
   * 面を描画
   */
  drawFace(face, projectedPoints) {
    const points = face.indices.map(idx => projectedPoints[idx]);
    
    if (!points.every(p => p)) return;
    
    this.ctx.fillStyle = face.color;
    this.ctx.globalAlpha = 0.7;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => this.ctx.lineTo(p.x, p.y));
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * ワイヤーフレームを描画
   */
  drawWireframe(projectedPoints) {
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.3;
    
    this.faces.forEach(face => {
      const points = face.indices.map(idx => projectedPoints[idx]);
      if (!points.every(p => p)) return;
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => this.ctx.lineTo(p.x, p.y));
      this.ctx.closePath();
      this.ctx.stroke();
    });
    
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * 点を回転（重心を中心として回転）
   */
  rotatePoint(point) {
    // 重心を原点に移動
    let x = point.x - this.centroid.x;
    let y = point.y - this.centroid.y;
    let z = point.z - this.centroid.z;
    
    // X軸周りの回転
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    
    // Y軸周りの回転
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    let x2 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;
    
    // 重心を元に戻す
    return { 
      x: x2 + this.centroid.x, 
      y: y1 + this.centroid.y, 
      z: z2 + this.centroid.z 
    };
  }

  /**
   * 3D→2D投影（重心を画面中心に配置）
   */
  project3DTo2D(point) {
    const rotated = this.rotatePoint(point);
    
    // 重心からの相対位置を計算
    const relX = rotated.x - this.centroid.x;
    const relY = rotated.y - this.centroid.y;
    const relZ = rotated.z - this.centroid.z;
    
    // 透視投影
    const perspective = 500;
    const scale = perspective / (perspective + relZ) * this.zoom * 50;
    
    const x2D = this.canvas.width / 2 + relX * scale;
    const y2D = this.canvas.height / 2 - relY * scale;
    
    return { x: x2D, y: y2D, z: relZ };
  }

  /**
   * キャンバスをクリア
   */
  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * メッセージを描画
   */
  drawMessage(message) {
    this.ctx.fillStyle = '#666';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.textAlign = 'left';
  }

  /**
   * アニメーションループ
   */
  animate() {
    if (this.autoRotate) {
      this.rotation.y += 0.01;
    }
    
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  /**
   * 自動回転の切り替え
   */
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }

  /**
   * リサイズ
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
