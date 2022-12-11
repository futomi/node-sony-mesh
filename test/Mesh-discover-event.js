'use strict';

// node-sony-mesh をロードし、`Mesh` コンストラクタオブジェクトを取得
const Mesh = require('../lib/mesh.js');

// `Mesh` オブジェクトを生成
const mesh = new Mesh();

(async () => {
  // `Mesh` オブジェクトを初期化
  await mesh.init();

  // discover イベントのリスナーをセット
  let cnt = 0;
  mesh.on('discover', (block) => {
    console.log('- ' + block.model.name + ' (' + block.serial + ')');
    cnt++;
  });

  // MESH ブロックの発見処理を開始
  await mesh.discover({ duration: 5000 });
  console.log('以上 ' + cnt + ' 個の MESH ブロックが発見されました。');
})();

