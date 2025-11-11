/**
 * 点群計算モジュール (PointCalculator)
 * 
 * 機能:
 * - 表データから点群を計算
 * - 円周→半径変換
 * - 基準半径に基づく点配置アルゴリズム
 */

class PointCalculator {
  constructor() {
    // 計算パラメータの初期化
    this.baseRadius = 0;      // 基準半径
    this.radiusArray = [];    // 半径配列
    this.pointCloud = [];     // 点座標配列
  }

  /**
   * 点群を計算
   * @param {Array} tableData - 表データ（2行目の値の配列）
   * @returns {Array} - 計算された点群 [{x, y, index}, ...]
   */
  calculate(tableData) {
    if (!tableData || tableData.length === 0) {
      return [];
    }

    // 1. 円周から半径に変換
    this.radiusArray = tableData.map((circumference, index) => ({
      index: index + 1,
      radius: this.circumferenceToRadius(circumference)
    }));

    // 2. 基準半径を設定（最初の値）
    this.baseRadius = this.radiusArray[0].radius;

    // 3. 点群を生成
    this.pointCloud = [];
    
    for (let i = 0; i < this.radiusArray.length; i++) {
      const { index, radius } = this.radiusArray[i];
      
      if (i === 0) {
        // 最初の点: x=0, y=半径
        this.pointCloud.push({
          x: 0,
          y: radius,
          index: index
        });
      } else {
        // 次の点: 前の点から基準半径の距離、y=半径
        const prevPoint = this.pointCloud[i - 1];
        const newPoint = this.calculateNextPoint(prevPoint, radius);
        this.pointCloud.push({
          ...newPoint,
          index: index
        });
      }
    }

    return this.pointCloud;
  }

  /**
   * 円周から半径に変換
   * @param {number} circumference - 円周
   * @returns {number} - 半径
   */
  circumferenceToRadius(circumference) {
    // 円周 = 2πr → r = 円周 / (2π)
    return circumference / (2 * Math.PI);
  }

  /**
   * 次の点を計算
   * @param {Object} prevPoint - 前の点 {x, y}
   * @param {number} targetY - 目標のy座標（半径）
   * @returns {Object} - 新しい点 {x, y}
   */
  calculateNextPoint(prevPoint, targetY) {
    // 条件:
    // 1. y = targetY
    // 2. 前の点からの距離 = baseRadius / 3
    // 
    // 式: √((x - prevX)² + (targetY - prevY)²) = baseRadius
    // (x - prevX)² + (targetY - prevY)² = (baseRadius)²
    // (x - prevX)² = (baseRadius)² - (targetY - prevY)²

    const distance = this.baseRadius *1.3;  // 距離を基準半径に設定
    const dy = targetY - prevPoint.y;
    const discriminant = distance * distance - dy * dy;

    let newX;
    if (discriminant >= 0) {
      // 前の点から右側（x方向正）に配置
      const dx = Math.sqrt(discriminant);
      newX = prevPoint.x + dx;
    } else {
      // 距離条件を満たせない場合、できるだけ近い位置に配置
      // この場合、x座標は変えずにy方向のみ移動
      newX = prevPoint.x;
      console.warn(`点の配置で距離条件を満たせません: 距離=${distance.toFixed(2)}, dy=${dy.toFixed(2)}`);
    }

    return {
      x: newX,
      y: targetY
    };
  }

  /**
   * 点群データを取得
   * @returns {Array} - 点群配列
   */
  getPointCloud() {
    return this.pointCloud;
  }

  /**
   * 半径配列を取得
   * @returns {Array} - 半径配列
   */
  getRadiusArray() {
    return this.radiusArray;
  }

  /**
   * 基準半径を取得
   * @returns {number} - 基準半径
   */
  getBaseRadius() {
    return this.baseRadius;
  }

  /**
   * 点群の統計情報を取得
   * @returns {Object} - 統計情報
   */
  getStats() {
    if (this.pointCloud.length === 0) {
      return null;
    }

    const xValues = this.pointCloud.map(p => p.x);
    const yValues = this.pointCloud.map(p => p.y);

    return {
      pointCount: this.pointCloud.length,
      baseRadius: this.baseRadius,
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues)
    };
  }
}
