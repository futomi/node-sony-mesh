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

  for (let i = 25; i >= 0; i--) {
    const level = i * 10;
    console.log(`Setting the PWM to level ${level}...`);
    await block.setPwm(level);

    console.log('Getting the state of the PWM...');
    const res = await block.getPwm();
    console.log(res);

    await mesh.wait(1000);
  }

  console.log('Done.');

})();

