'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // 人感ブロックだけを発見
  const block_list = await mesh.discover({ model: ['MD'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('人感ブロックが見つかりませんでした。');
  }

  // BLE 接続
  await block.connect();

  // 通知を開始
  await block.startNotification();

  // notify イベントのリスナーをセット
  block.on('notify', (message) => {
    if (message.data.state === true) {
      console.log('検知状態になりました');
    } else {
      console.log('未検地状態になりました');
    }
  });
})();

