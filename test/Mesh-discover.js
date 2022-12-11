'use strict';

// node-sony-mesh をロードし、`Mesh` コンストラクタオブジェクトを取得
const Mesh = require('../lib/mesh.js');

// `Mesh` オブジェクトを生成
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // MESH ブロックを発見
  const block_list = await mesh.discover({
    duration: 5000,
    //model: ['LE']
  });
  console.log(block_list.length + ' 個の MESH ブロックを発見しました。');

  for (const block of block_list) {
    // MESH ブロックの id とシリアル番号とモデル情報を出力
    console.log('-------------------------------------');
    console.log('- ID          : ' + block.id);
    console.log('- シリアル番号: ' + block.serial);
    console.log('- モデルID    : ' + block.model.id);
    console.log('- モデルコード: ' + block.model.code);
    console.log('- モデル番号  : ' + block.model.number);
    console.log('- モデル名    : ' + block.model.name);
  }
})();

