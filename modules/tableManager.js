/**
 * 表管理モジュール (TableManager)
 * 
 * 機能:
 * - インデックス付き2行の表の動的生成
 * - 基数ベースの値入力システム
 * - Up/Stay/Downボタンによる値の追加
 * - Reset/Check/Resumeボタンによる操作制御
 */

class TableManager {
  constructor(containerId, controlsId) {
    this.container = document.getElementById(containerId);
    this.controlsContainer = document.getElementById(controlsId);
    
    // 状態管理
    this.baseNumber = 1;          // 基数（最初の列の値）
    this.currentValue = 1;        // 現在表示されている値
    this.tableData = [];          // 表データ [値1, 値2, ...]
    this.isBaseSet = false;       // 基数が設定されたか
    
    // 変更通知用コールバック
    this.changeCallback = null;
    this.generateCallback = null;
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.renderControls();
    this.renderTable();
  }

  /**
   * コントロール部分を描画
   */
  renderControls() {
    this.controlsContainer.innerHTML = `
      <div class="input-controls">
        <!-- 数値表示エリア -->
        <div class="value-display-area">
          <div class="value-display" id="valueDisplay">${this.currentValue}</div>
          <div class="value-buttons">
            <button id="upBtn" class="control-btn">▲ Up</button>
            <button id="stayBtn" class="control-btn" style="display: none;">■ Stay</button>
            <button id="downBtn" class="control-btn">▼ Down</button>
          </div>
        </div>
        
        <!-- アクションボタン -->
        <div class="action-buttons">
          <button id="resetBtn" class="action-btn reset-btn">🔄 Reset</button>
          <button id="checkBtn" class="action-btn check-btn">✓ Check</button>
          <button id="resumeBtn" class="action-btn resume-btn" disabled>↶ Resume</button>
        </div>
      </div>
    `;
    
    this.attachControlEvents();
  }

  /**
   * コントロールのイベントリスナーを登録
   */
  attachControlEvents() {
    const upBtn = document.getElementById('upBtn');
    const stayBtn = document.getElementById('stayBtn');
    const downBtn = document.getElementById('downBtn');
    const checkBtn = document.getElementById('checkBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    // Up/Downボタン（基数設定前）
    upBtn.addEventListener('click', () => this.handleUpDown(1));
    downBtn.addEventListener('click', () => this.handleUpDown(-1));
    
    // Stayボタン（基数設定後）
    stayBtn.addEventListener('click', () => this.handleStay());
    
    // Checkボタン
    checkBtn.addEventListener('click', () => this.handleCheck());
    
    // Resetボタン
    resetBtn.addEventListener('click', () => this.handleReset());
    
    // Resumeボタン
    resumeBtn.addEventListener('click', () => this.handleResume());
  }

  /**
   * Up/Downボタンの処理
   */
  handleUpDown(delta) {
    if (!this.isBaseSet) {
      // 基数設定前：1ずつ増減
      this.currentValue = Math.max(1, this.currentValue + delta);
      this.updateValueDisplay();
    } else {
      // 基数設定後：基数ずつ増減して表に追加
      const previousValue = this.tableData.length > 0 
        ? this.tableData[this.tableData.length - 1] 
        : this.baseNumber;
      this.currentValue = previousValue + (delta * this.baseNumber);
      this.addToTable(this.currentValue);
    }
  }

  /**
   * Stayボタンの処理
   */
  handleStay() {
    if (this.isBaseSet && this.tableData.length > 0) {
      // 前の列と同じ値を設定
      this.currentValue = this.tableData[this.tableData.length - 1];
      this.addToTable(this.currentValue);
    }
  }

  /**
   * Checkボタンの処理
   */
  handleCheck() {
    if (!this.isBaseSet) {
      // 最初のCheck：基数を設定
      this.baseNumber = this.currentValue;
      this.isBaseSet = true;
      
      // 表に追加
      this.addToTable(this.currentValue);
      
      // UIを更新
      document.getElementById('checkBtn').style.display = 'none';
      document.getElementById('stayBtn').style.display = 'block';
      
    } else {
      // 2列目以降のCheck：現在値を追加
      this.addToTable(this.currentValue);
    }
  }

  /**
   * 表にデータを追加
   */
  addToTable(value) {
    this.tableData.push(value);
    this.renderTable();
    this.updateValueDisplay();
    
    // Resumeボタンを有効化
    document.getElementById('resumeBtn').disabled = false;
    
    // 変更を通知
    if (this.changeCallback) {
      this.changeCallback(this.tableData);
    }
  }

  /**
   * Resumeボタンの処理（1つ前に戻る）
   */
  handleResume() {
    if (this.tableData.length > 0) {
      // 最後の列を削除
      this.tableData.pop();
      
      if (this.tableData.length === 0) {
        // すべて削除された場合、初期状態に戻る
        this.isBaseSet = false;
        this.currentValue = 1;
        document.getElementById('checkBtn').style.display = 'block';
        document.getElementById('stayBtn').style.display = 'none';
        document.getElementById('resumeBtn').disabled = true;
      } else {
        // 現在値を前の列の値に設定
        this.currentValue = this.tableData[this.tableData.length - 1];
      }
      
      this.renderTable();
      this.updateValueDisplay();
      
      // 変更を通知
      if (this.changeCallback) {
        this.changeCallback(this.tableData);
      }
    }
  }

  /**
   * Resetボタンの処理
   */
  handleReset() {
    const confirmed = confirm('表をリセットしてもよろしいですか？\nすべてのデータが削除されます。');
    
    if (confirmed) {
      // すべてリセット
      this.baseNumber = 1;
      this.currentValue = 1;
      this.tableData = [];
      this.isBaseSet = false;
      
      // UIをリセット
      document.getElementById('checkBtn').style.display = 'block';
      document.getElementById('stayBtn').style.display = 'none';
      document.getElementById('resumeBtn').disabled = true;
      
      this.renderTable();
      this.updateValueDisplay();
      
      // 変更を通知
      if (this.changeCallback) {
        this.changeCallback(this.tableData);
      }
    }
  }

  /**
   * 値表示を更新
   */
  updateValueDisplay() {
    const display = document.getElementById('valueDisplay');
    if (display) {
      display.textContent = this.currentValue;
    }
  }

  /**
   * 表を描画
   */
  renderTable() {
    if (this.tableData.length === 0) {
      this.container.innerHTML = '<div class="empty-table">データがありません</div>';
      return;
    }
    
    let html = '<table class="data-table">';
    
    // 1行目：インデックス
    html += '<tr class="index-row">';
    this.tableData.forEach((_, index) => {
      html += `<th>${index + 1}</th>`;
    });
    html += '</tr>';
    
    // 2行目：値
    html += '<tr class="value-row">';
    this.tableData.forEach((value) => {
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
    
    html += '</table>';
    
    // 生成ボタンとエクスポート/インポートボタンを追加
    html += '<div class="generate-button-container">';
    html += '<button id="generateBtn" class="generate-btn">🎯 点群を生成</button>';
    html += '<button id="exportBtn" class="io-btn export-btn">📤 出力</button>';
    html += '<button id="importBtn" class="io-btn import-btn">📥 読み込み</button>';
    html += '</div>';
    
    this.container.innerHTML = html;
    
    // 生成ボタンのイベントリスナーを登録
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (this.generateCallback) {
          this.generateCallback(this.tableData);
        }
      });
    }
  }

  /**
   * データを取得
   * @returns {Array} - 表データ
   */
  getData() {
    return [...this.tableData];
  }

  /**
   * データを設定
   * @param {Array} data - 設定するデータ
   */
  setData(data) {
    if (Array.isArray(data) && data.length > 0) {
      this.tableData = [...data];
      this.baseNumber = data[0];
      this.currentValue = data[data.length - 1];
      this.isBaseSet = true;
      
      document.getElementById('checkBtn').style.display = 'none';
      document.getElementById('stayBtn').style.display = 'block';
      document.getElementById('resumeBtn').disabled = false;
      
      this.renderTable();
      this.updateValueDisplay();
    }
  }

  /**
   * 変更イベントリスナーを登録
   * @param {Function} callback - コールバック関数
   */
  onDataChange(callback) {
    this.changeCallback = callback;
  }

  /**
   * 生成ボタンイベントリスナーを登録
   * @param {Function} callback - コールバック関数
   */
  onGenerate(callback) {
    this.generateCallback = callback;
  }

  /**
   * バリデーション
   * @returns {boolean} - データが有効かどうか
   */
  validate() {
    return this.tableData.length > 0 && this.tableData.every(v => Number.isInteger(v) && v >= 1);
  }

  /**
   * 表データをJSON形式で出力
   * @returns {string} - JSON文字列
   */
  exportToJson() {
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      baseNumber: this.baseNumber,
      currentValue: this.currentValue,
      isBaseSet: this.isBaseSet,
      tableData: this.tableData
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSON形式のデータから表を復元
   * @param {string} jsonString - JSON文字列
   * @returns {boolean} - 成功/失敗
   */
  importFromJson(jsonString) {
    try {
      const importData = JSON.parse(jsonString);
      
      // バリデーション
      if (!importData.tableData || !Array.isArray(importData.tableData)) {
        throw new Error('無効なデータ形式です');
      }
      
      if (importData.tableData.length === 0) {
        throw new Error('データが空です');
      }
      
      // データを復元
      this.tableData = [...importData.tableData];
      this.baseNumber = importData.baseNumber || importData.tableData[0];
      this.currentValue = importData.currentValue || importData.tableData[importData.tableData.length - 1];
      this.isBaseSet = importData.isBaseSet !== undefined ? importData.isBaseSet : true;
      
      // UIを更新
      if (this.isBaseSet) {
        document.getElementById('checkBtn').style.display = 'none';
        document.getElementById('stayBtn').style.display = 'block';
        document.getElementById('resumeBtn').disabled = false;
      } else {
        document.getElementById('checkBtn').style.display = 'block';
        document.getElementById('stayBtn').style.display = 'none';
        document.getElementById('resumeBtn').disabled = true;
      }
      
      this.renderTable();
      this.updateValueDisplay();
      
      // 変更を通知
      if (this.changeCallback) {
        this.changeCallback(this.tableData);
      }
      
      return true;
    } catch (error) {
      console.error('JSON読み込みエラー:', error);
      alert(`データの読み込みに失敗しました:\n${error.message}`);
      return false;
    }
  }
}
