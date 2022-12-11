'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  console.log('Initializing...');
  await mesh.init();
  console.log('Discovering...');
  const block_list = await mesh.discover({ model: ['GP'] });
  const block = block_list[0];

  if (!block) {
    console.log('No MESH GPIO was found.');
  }

  console.log('A MESH GPIO was found.');
  console.log(block.id);
  console.log(block.model);

  console.log('Connecting...');
  await block.connect();

  for (let i = 0; i <= 5; i++) {
    if (i % 2 === 0) {
      console.log('Setting the VOUT to ON...');
      await block.setVout(true);
    } else {
      console.log('Setting the VOUT to OFF...');
      await block.setVout(false);
    }

    console.log('Getting the state of the VOUT...');
    const res = await block.getVout();
    console.log(res);

    await mesh.wait(3000);
  }

  console.log('Done.');
})();

