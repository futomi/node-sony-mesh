'use strict';

// node-sony-mesh をロードし、`Mesh` コンストラクタオブジェクトを取得
const Mesh = require('../lib/mesh.js');

// `Mesh` オブジェクトを生成
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // MESH ブロックの発見
  const block_list = await mesh.discover({ duration: 3000 });

  // 最初に見つかった MESH ブロック
  const block = block_list[0];
  console.log(block.connected); // false

  block.on('connect', () => {
    console.log('接続しました。');
  });

  block.on('disconnect', () => {
    console.log('切断されました。');
  });

  // MESH ブロックに接続
  await block.connect();
  console.log(block.connected); // true

  // MESH ブロックの id とシリアル番号とモデル情報を出力
  console.log('-------------------------------------');
  console.log('- ID          : ' + block.id);
  console.log('- シリアル番号: ' + block.serial);
  console.log('- モデルID    : ' + block.model.id);
  console.log('- モデルタイプ: ' + block.model.type);
  console.log('- モデル番号  : ' + block.model.number);
  console.log('- モデル名    : ' + block.model.name);
  console.log('- バージョン  : ' + block.version);
  console.log('- バッテリー  : ' + block.battery);

  // MESH ブロックを切断
  await block.disconnect();
  console.log(block.connected); // false

})();

