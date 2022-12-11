'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  console.log('Initializing...');
  await mesh.init();
  console.log('Discovering...');
  const block_list = await mesh.discover({ duration: 5000 });
  console.log(block_list.length + ' MESH blocks were discovered:');

  for (const block of block_list) {
    console.log('---------------------------------');
    console.log(block.id);
    console.log(block.model);

    console.log('Connecting...');
    await block.connect();

    console.log('Enabling the status bar...');
    await block.enableStatusBar();

    console.log('Turning on the status bar...');
    await block.turnOnStatusBar();

    console.log('Disconnecting...');
    await block.disconnect();
  }
  console.log('---------------------------------');

})();

