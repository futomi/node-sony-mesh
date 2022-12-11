'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  await mesh.init();
  const block_list = await mesh.discover({ model: ['AC'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('No MESH Move was found.');
  }

  // BLE 接続
  await block.connect();

  // notify イベントのリスナーをセット
  block.on('notify', (message) => {
    console.log(message);
  });
})();

