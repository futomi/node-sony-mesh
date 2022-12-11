'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // 温度・湿度ブロックだけを発見
  const block_list = await mesh.discover({ model: ['TH'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('温度・湿度ブロックが見つかりませんでした。');
  }

  // BLE 接続
  await block.connect();

  // センサー計測結果を取得して出力
  const res = await block.getCurrentData();
  console.log(`- 温度: ${res.temperature} degC`);
  console.log(`- 湿度: ${res.humidity} %RH`);

  // BLE 接続を切断
  await block.disconnect();
})();
