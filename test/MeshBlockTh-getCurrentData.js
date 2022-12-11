'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  await mesh.init();
  const block_list = await mesh.discover({ model: ['TH'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('No MESH Brightness was found.');
  }

  // BLE 接続
  await block.connect();

  // 5 秒おきにセンサー計測結果を取得
  setInterval(async () => {
    const res = await block.getCurrentData();
    console.log(res);
  }, 5000);
})();
