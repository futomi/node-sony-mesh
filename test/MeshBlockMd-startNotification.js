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

  // 通知を開始
  //await block.startNotification({ htime: 1000 });
  await block.startNotification({ periodic: true });

  // notify イベントのリスナーをセット
  block.on('notify', (message) => {
    console.log(message);
  });
})();

