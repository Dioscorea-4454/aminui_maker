/**
 * メインアプリケーションコントローラー
 * 
 * 役割:
 * - 各モジュール間の連携を管理
 * - アプリケーション全体の初期化
 * - イベントハンドリングの統括
 * - データフローの制御（入力 → 計算 → 表示）
 */

// アプリケーション状態管理
const AppState = {
  tableData: [],      // 2行の表データ
  pointCloud: [],     // 計算された点群
  shape3D: null,      // 生成された3D形状データ
  viewSettings: {     // 表示設定
    rotation: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
    showGrid: true,
    showAxes: true
  }
};

// モジュールインスタンス
let tableManager = null;
let pointCalculator = null;
let point2DRenderer = null;
let shape3DRenderer = null;

/**
 * アプリケーション初期化
 */
function initApp() {
  console.log('アプリケーション初期化中...');
  
  // 1. 表管理モジュールの初期化
  tableManager = new TableManager('table-container', 'table-controls');
  
  // 2. データ変更時のハンドラーを登録
  tableManager.onDataChange(onTableDataChanged);
  
  // 3. 生成ボタンのハンドラーを登録
  tableManager.onGenerate(onGeneratePointCloud);
  
  // 4. 点群計算モジュールの初期化
  pointCalculator = new PointCalculator();
  
  // 5. 2D描画モジュールの初期化
  point2DRenderer = new Point2DRenderer('canvas2d');
  
  // 6. 3D描画モジュールの初期化
  shape3DRenderer = new Shape3DRenderer('canvas3d');
  
  console.log('アプリケーション初期化完了');
}

/**
 * データフロー: 表入力 → 点群計算 → 3D形状生成 → 表示
 */
function updatePipeline() {
  console.log('パイプライン更新中...');
  
  // 1. 表データを取得
  const tableData = tableManager.getData();
  AppState.tableData = tableData;
  
  if (tableData.length === 0) {
    console.log('データがありません');
    return;
  }
  
  console.log('表データ:', tableData);
}

/**
 * 点群生成ハンドラー
 */
function onGeneratePointCloud(tableData) {
  console.log('点群生成開始:', tableData);
  
  // 1. 点群を計算
  const pointCloud = pointCalculator.calculate(tableData);
  AppState.pointCloud = pointCloud;
  
  console.log('生成された点群:', pointCloud);
  console.log('統計情報:', pointCalculator.getStats());
  
  // 2. 2D点群を描画
  point2DRenderer.render(pointCloud);
  
  // 3. 3D形状を生成・描画
  const shape3D = shape3DRenderer.generateShape(pointCloud);
  AppState.shape3D = shape3D;
  
  // 4. 情報パネルを更新
  updateInfoPanel(pointCalculator.getStats(), shape3D);
}

/**
 * 情報パネルを更新
 */
function updateInfoPanel(stats, shape3D) {
  const infoPanel = document.getElementById('info-panel');
  
  if (!stats) {
    infoPanel.innerHTML = '';
    return;
  }
  
  const points3DCount = shape3D ? shape3D.points.length : 0;
  const facesCount = shape3D ? shape3D.faces.length : 0;
  
  infoPanel.innerHTML = `
    <div class="info-content">
      <h3>📊 統計情報</h3>
      <div class="info-grid">
        <div class="info-item">
          <strong>2D点数:</strong> ${stats.pointCount}
        </div>
        <div class="info-item">
          <strong>3D点数:</strong> ${points3DCount}
        </div>
        <div class="info-item">
          <strong>面数:</strong> ${facesCount}
        </div>
        <div class="info-item">
          <strong>基準半径:</strong> ${stats.baseRadius.toFixed(2)}
        </div>
        <div class="info-item">
          <strong>X範囲:</strong> ${stats.xMin.toFixed(2)} ～ ${stats.xMax.toFixed(2)}
        </div>
        <div class="info-item">
          <strong>Y範囲:</strong> ${stats.yMin.toFixed(2)} ～ ${stats.yMax.toFixed(2)}
        </div>
      </div>
    </div>
  `;
}

/**
 * 表データ変更時のハンドラー
 */
function onTableDataChanged(newData) {
  console.log('表データが変更されました:', newData);
  updatePipeline();
}

/**
 * 視点変更時のハンドラー（後で実装）
 */
function onViewChanged(viewParams) {
  // AppState.viewSettings を更新
  // 3D表示を再描画
}

/**
 * データ保存（後で実装）
 */
function saveData() {
  const data = {
    tableData: AppState.tableData,
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shape_data_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  
  console.log('データを保存しました');
}

/**
 * データ読み込み（後で実装）
 */
function loadData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.tableData && Array.isArray(data.tableData)) {
        tableManager.setData(data.tableData);
        console.log('データを読み込みました');
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      alert('データの読み込みに失敗しました');
    }
  };
  reader.readAsText(file);
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', initApp);
