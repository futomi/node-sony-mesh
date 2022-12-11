'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  await mesh.init();
  const block_list = await mesh.discover({ model: ['LE'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('No MESH LED was found.');
  }

  // BLE 接続
  await block.connect();

  // LED を黄色でふわっと点灯
  await block.turnOnLed({
    rgb: [255, 255, 0],
    //duration: 0xFFFF,
    //oncycle: 2000,
    //offcycle: 1000,
    pattern: 2
  });

  // 5 秒待つ
  await mesh.wait(5000);

  // 消灯
  await block.turnOffLed();

  // BLE 切断
  await block.disconnect();
}) ();

