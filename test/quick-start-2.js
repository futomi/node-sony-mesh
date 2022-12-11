'use strict';

// node-sony-mesh をロードし、`Mesh` コンストラクタオブジェクトを取得
const Mesh = require('../lib/mesh.js');

// `Mesh` オブジェクトを生成
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // MESH ブロックを発見
  const block_list = await mesh.discover();
  console.log(block_list.length + ' 個の MESH ブロックを発見しました。');

  for (const block of block_list) {
    // MESH ブロックの商品名とシリアル番号を出力
    console.log('- ' + block.model.name + ' (' + block.serial + ')');

    // MESH ブロックに BLE 接続
    await block.connect();
  }

  // 全 MESH ブロックからの通知を受信する
  mesh.on('notify', (message) => {
    // 通知の内容を出力する
    console.log('---------------------------------');
    console.log(message.model.name + ' (' + message.serial + ')');
    console.log('メッセージタイプ: ' + message.type);
    console.log(JSON.stringify(message.data, null, '  '));
  });
})();

