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
    console.log('Connected.');
  }
  console.log('---------------------------------');

  console.log('Monitoring notifications from the discovered blocks...');
  mesh.on('notify', (message) => {
    console.log(message);
  });
})();

