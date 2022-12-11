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

  console.log('Setting the VOUT to ON...');
  await block.setVout(true);

  console.log('Starting the AIN notification...');
  await block.startAinNotification();

  mesh.on('notify', (message) => {
    console.log(message);
  });

  await mesh.wait(30000);

  console.log('Stopping the AIN notification...');
  await block.stopAinNotification();

  await mesh.wait(30000);
  console.log('Done.');

})();

