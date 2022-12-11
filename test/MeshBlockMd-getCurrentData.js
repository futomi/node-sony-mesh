'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  await mesh.init();
  const block_list = await mesh.discover({ model: ['MD'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('No MESH Motion was found.');
  }

  // BLE 接続
  await block.connect();

  // 5 秒おきに動き検知状態を取得
  setInterval(async () => {
    //const res = await block.getCurrentData({ dtime: 60000 });
    const res = await block.getCurrentData();
    console.log(res);
  }, 5000);
})();

