/* ------------------------------------------------------------------
* node-sony-mesh - mesh.js
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

const EventEmitter = require('events')
const MeshBlock = require('./mesh-block.js');
const MeshBlockAc = require('./mesh-block-ac.js');
const MeshBlockBu = require('./mesh-block-bu.js');
const MeshBlockGp = require('./mesh-block-gp.js');
const MeshBlockLe = require('./mesh-block-le.js');
const MeshBlockMd = require('./mesh-block-md.js');
const MeshBlockPa = require('./mesh-block-pa.js');
const MeshBlockTh = require('./mesh-block-th.js');

class Mesh extends EventEmitter {
  /* ------------------------------------------------------------------
  * Cotructor
  *
  * [Arguments]
  * - None
  * ---------------------------------------------------------------- */
  constructor() {
    super();
    this._noble = null;
    this._SERVICE_UUID = '72c9000157a94d40b746534e22ec9f9e';
    this._DISCOVERY_DUR_DEFAULT = 5000; // msec
    this._ondiscover = async () => { };
    this._initialized = false;
    this._is_discovering = false;
    this._blocks = {};
  }

  /* ------------------------------------------------------------------
  * init()
  * - Initialize this object.
  * 
  * [Arguments]
  * - None
  *  
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  init() {
    return new Promise((resolve, reject) => {
      this._noble = require('@abandonware/noble');
      this._initialized = false;
      if (this._noble.state === 'poweredOn') {
        this._setDiscoverEventListener();
        this._initialized = true;
        resolve();
      } else {
        this._noble.once('stateChange', (state) => {
          if (state === 'poweredOn') {
            this._setDiscoverEventListener();
            this._initialized = true;
            resolve();
          } else {
            reject(new Error('Failed to initialize the Noble object: ' + state));
          }
        });
      }
    });
  }

  _setDiscoverEventListener() {
    this._noble.on('discover', async (peripheral) => {
      await this._ondiscover(peripheral);
    });
  }

  /* ------------------------------------------------------------------
  * discover([params])
  * - Scan MESH blocks.
  * 
  * [Arguments]
  * - params     | Object  | Optional |
  *   - duration | Integer | Optional | Duration for discovery process (msec).
  *              |         |          | The default value is 5000.
  *              |         |          | The value must be in the range of 1000 to 60000.
  *   - model    | Array   |          | List of Model ID (e.g., ["LE", "PA"])
  * 
  * [Returen value]
  * - Promise object
  *   An Array object will be passed to the `resolve()`, which includes
  *   `MeshBlock` objects representing the found MESH blocks 
  * ---------------------------------------------------------------- */
  async discover(params = {}) {
    if (this._initialized === false) {
      reject(new Error('The `init()` method has not been called yet.'));
      return;
    }

    if (this._is_discovering === true) {
      reject(new Error('The discovery process is in progress.'));
      return;
    }

    let duration = this._DISCOVERY_DUR_DEFAULT;
    if ('duration' in params) {
      duration = params.duration;
      if (typeof (duration) !== 'number' || duration % 1 !== 0 || duration < 1000 || duration > 60000) {
        reject(new Error('The `duration` must be an integer in the range of 1000 to 60000.'));
        return;
      }
    }

    let model = null;
    if('model' in params) {
      model = params.model;
      if(!Array.isArray(model)) {
        reject(new Error('The `model` must be an Array object.'));
      }
    }

    this._is_discovering = true;
    const block_list = [];

    this._ondiscover = async (peripheral) => {
      const id = peripheral.id;
      let mesh_block = this._blocks[id];
      if (mesh_block) {
        mesh_block.removeAllListeners();
        await mesh_block.destroy();
      }
      const block_info = this._getMeshBlockInfo(peripheral);
      if (!block_info) {
        return;
      }

      const mid = block_info.model.id;

      if(model) {
        if(!model.includes(mid)) {
          return;
        }
      }

      if (mid === 'AC') {
        mesh_block = new MeshBlockAc(peripheral, block_info);
      } else if (mid === 'BU') {
        mesh_block = new MeshBlockBu(peripheral, block_info);
      } else if (mid === 'GP') {
        mesh_block = new MeshBlockGp(peripheral, block_info);
      } else if (mid === 'LE') {
        mesh_block = new MeshBlockLe(peripheral, block_info);
      } else if (mid === 'MD') {
        mesh_block = new MeshBlockMd(peripheral, block_info);
      } else if (mid === 'PA') {
        mesh_block = new MeshBlockPa(peripheral, block_info);
      } else if (mid === 'TH') {
        mesh_block = new MeshBlockTh(peripheral, block_info);
      } else {
        mesh_block = new MeshBlock(peripheral, block_info);
      }

      this._blocks[id] = mesh_block;
      this._blocks[id].on('notify', (packet) => {
        this.emit('notify', packet);
      });

      this.emit('discover', mesh_block);
      block_list.push(mesh_block);
    };

    try {
      await this._noble.startScanningAsync([this._SERVICE_UUID], false);
      await this.wait(duration);
      await this._noble.stopScanningAsync();
      return block_list;
    } catch (error) {
      throw error;
    } finally {
      this._ondiscover = async () => { };
      this._is_discovering = false;
    }
  }

  _getMeshBlockInfo(peripheral) {
    if (!peripheral) {
      return null;
    }

    const ad = peripheral.advertisement;

    // Check the local name
    const lname = ad.localName;
    if (!lname || !lname.startsWith('MESH-100')) {
      return null;
    }

    // Check the manufacturer specific data
    const man = ad.manufacturerData;
    if (!man || !Buffer.isBuffer(man) || man.length < 4) {
      return null;
    }
    if (man[0] !== 0x2D || man[1] !== 0x01 || man[2] !== 0x17 || man[3] !== 0x00) {
      return null;
    }

    const model_number = lname.substring(0, 10);
    const serial = lname.substring(10);

    const id = lname.substring(8, 10);
    const info = {
      model: {
        id: id,
        code: 0x00,
        number: model_number,
        name: ''
      },
      serial: serial
    };

    if (id === 'LE') {
      info.model.code = 0x00
      info.model.name = 'MESH LED';
    } else if (id === 'AC') {
      info.model.code = 0x01;
      info.model.name = 'MESH Move';
    } else if (id === 'BU') {
      info.model.code = 0x02;
      info.model.name = 'MESH Button';
    } else if (id === 'GP') {
      info.model.code = 0x09;
      info.model.name = 'MESH GPIO';
    } else if (id === 'MD') {
      info.model.code = 0x10;
      info.model.name = 'MESH Motion';
    } else if (id === 'PA') {
      info.model.code = 0x11;
      info.model.name = 'MESH Brightness';
    } else if (id === 'TH') {
      info.model.code = 0x12;
      info.model.name = 'MESH Temperature & Humidity';
    } else {
      return null;
    }

    return info;
  }

  /* ------------------------------------------------------------------
  * wait(msec) {
  * - Wait for the specified time (msec)
  *
  * [Arguments]
  * - msec | Integer | Required | Msec.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  wait(msec) {
    return new Promise((resolve, reject) => {
      if (typeof (msec) === 'number' && msec > 0 && msec % 1 === 0) {
        setTimeout(resolve, msec);
      } else {
        reject(new Error('The `msec` must be an integer grater than 0.'));
      }
    });
  }
}

module.exports = Mesh;
