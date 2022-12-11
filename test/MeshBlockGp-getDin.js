'use strict';
const Mesh = require('../lib/mesh.js');
const mesh = new Mesh();

(async () => {
  await mesh.init();
  const block_list = await mesh.discover({ model: ['GP'] });
  const block = block_list[0];

  if (!block) {
    throw new Error('No MESH GPIO was found.');
  }
  await block.connect();

  console.log('Setting the VOUT to ON...');
  await block.setVout(true);

  setInterval(async () => {
    console.log('Getting the state of the DIN.');
    const res = await block.getDin(1);
    console.log(res);
  }, 3000);

})();

