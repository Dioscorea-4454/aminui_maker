/**
 * 2D点群レンダラーモジュール (Point2DRenderer)
 * 
 * 機能:
 * - 点群を2Dキャンバスに描画
 * - グリッドと座標軸の表示
 * - 点の接続線の描画
 * - ラベル表示
 */

class Point2DRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // 描画設定
    this.padding = 50;
    this.pointRadius = 6;
    this.showGrid = true;
    this.showAxes = true;
    this.showLabels = true;
    this.showLines = true;
    
    this.pointCloud = [];
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * 点群を描画
   * @param {Array} pointCloud - 点群データ [{x, y, index}, ...]
   */
  render(pointCloud) {
    if (!pointCloud || pointCloud.length === 0) {
      this.clear();
      this.drawMessage('点群データがありません');
      return;
    }

    this.pointCloud = pointCloud;
    this.calculateViewport();
    this.clear();
    
    if (this.showGrid) {
      this.drawGrid();
    }
    
    if (this.showAxes) {
      this.drawAxes();
    }
    
    if (this.showLines) {
      this.drawLines();
    }
    
    this.drawPoints();
  }

  /**
   * ビューポートを計算（自動スケーリング）
   */
  calculateViewport() {
    if (this.pointCloud.length === 0) return;

    const xValues = this.pointCloud.map(p => p.x);
    const yValues = this.pointCloud.map(p => p.y);
    
    const xMin = Math.min(...xValues, 0);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues, 0);
    const yMax = Math.max(...yValues);
    
    const dataWidth = xMax - xMin;
    const dataHeight = yMax - yMin;
    
    const canvasWidth = this.canvas.width - 2 * this.padding;
    const canvasHeight = this.canvas.height - 2 * this.padding;
    
    // スケールを計算（余裕を持たせる）
    const scaleX = canvasWidth / (dataWidth * 1.2 || 1);
    const scaleY = canvasHeight / (dataHeight * 1.2 || 1);
    this.scale = Math.min(scaleX, scaleY);
    
    // オフセットを計算（中心揃え）
    this.offsetX = this.padding + (canvasWidth - dataWidth * this.scale) / 2 - xMin * this.scale;
    this.offsetY = this.canvas.height - this.padding - (canvasHeight - dataHeight * this.scale) / 2 + yMin * this.scale;
  }

  /**
   * データ座標をキャンバス座標に変換
   */
  toCanvasCoords(x, y) {
    return {
      x: this.offsetX + x * this.scale,
      y: this.offsetY - y * this.scale  // Y軸を反転
    };
  }

  /**
   * キャンバスをクリア
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * グリッドを描画
   */
  drawGrid() {
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    // 縦線
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    // 横線
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * 座標軸を描画
   */
  drawAxes() {
    const origin = this.toCanvasCoords(0, 0);
    
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    
    // X軸
    this.ctx.beginPath();
    this.ctx.moveTo(0, origin.y);
    this.ctx.lineTo(this.canvas.width, origin.y);
    this.ctx.stroke();
    
    // Y軸
    this.ctx.beginPath();
    this.ctx.moveTo(origin.x, 0);
    this.ctx.lineTo(origin.x, this.canvas.height);
    this.ctx.stroke();
    
    // 軸ラベル
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('X', this.canvas.width - 20, origin.y - 10);
    this.ctx.fillText('Y', origin.x + 10, 20);
  }

  /**
   * 点間の接続線を描画
   */
  drawLines() {
    if (this.pointCloud.length < 2) return;
    
    this.ctx.strokeStyle = '#4ECDC4';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let i = 0; i < this.pointCloud.length; i++) {
      const point = this.pointCloud[i];
      const canvasCoords = this.toCanvasCoords(point.x, point.y);
      
      if (i === 0) {
        this.ctx.moveTo(canvasCoords.x, canvasCoords.y);
      } else {
        this.ctx.lineTo(canvasCoords.x, canvasCoords.y);
      }
    }
    
    this.ctx.stroke();
  }

  /**
   * 点を描画
   */
  drawPoints() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
                    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84'];
    
    this.pointCloud.forEach((point, i) => {
      const canvasCoords = this.toCanvasCoords(point.x, point.y);
      const color = colors[i % colors.length];
      
      // 点を描画
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(canvasCoords.x, canvasCoords.y, this.pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 外枠
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      if (this.showLabels) {
        // インデックスラベル
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(`${point.index}`, canvasCoords.x + 10, canvasCoords.y - 10);
        
        // 座標値
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.fillText(
          `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
          canvasCoords.x + 10,
          canvasCoords.y + 5
        );
      }
    });
  }

  /**
   * メッセージを描画
   */
  drawMessage(message) {
    this.ctx.fillStyle = '#999';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.textAlign = 'left';
  }

  /**
   * 設定を更新
   */
  updateSettings(settings) {
    Object.assign(this, settings);
    if (this.pointCloud.length > 0) {
      this.render(this.pointCloud);
    }
  }

  /**
   * リサイズ処理
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.pointCloud.length > 0) {
      this.render(this.pointCloud);
    }
  }
}
