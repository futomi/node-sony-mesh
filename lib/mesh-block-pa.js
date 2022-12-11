/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-pa.js
* - MESH-100PA (MESH Brightness)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockPa extends MeshBlock {
  constructor(peripheral, block_info) {
    super(peripheral, block_info);
    this._onresponse = () => { };
  }

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'PA') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00) {
      packet.type = 'brightness';
      packet.data.requestid = buf[2];
      //packet.data.mode = buf[3];
      packet.data.proximity = buf.readUInt16LE(4);
      packet.data.illuminance = buf.readUInt16LE(6) * 10; // lx
      this._onresponse(packet);
    } else {
      return null;
    }

    return packet;
  }

  /* ------------------------------------------------------------------
  * getCurrentData()
  * - Get the current measurement data
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     proximity: 1,
  *     illuminance: 443
  *   }
  * ---------------------------------------------------------------- */
  async getCurrentData() {
    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'brightness', [
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid, // Request ID
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x02,
      0x02,
      0x02,
      0x10 // Notification mode: 0x10 = notify once
    ]);

    return {
      illuminance: packet.data.illuminance,
      proximity: packet.data.proximity
    };
  }

  /* ------------------------------------------------------------------
  * startNotification(params)
  * - Enable notification
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - periodic | Boolean | Optional | If `true`, the Block sends a notification every 500 ms. 
  *              |         |          | The default value is `false`.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async startNotification(params = {}) {
    let periodic = false;
    if ('periodic' in params) {
      periodic = params.periodic;
      if (typeof (periodic) !== 'boolean') {
        throw new Error('The `periodic` must be `true` or `false`.');
      }
    }

    const mode = (periodic === true) ? 0x20 : (0x04 | 0x08);

    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid, // Request ID
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x02,
      0x02,
      0x02,
      mode
    ]);
  }

  /* ------------------------------------------------------------------
  * stopNotification()
  * - Disable notification
  *
  * [Arguments]
  * - None
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async stopNotification() {
    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid, // Request ID
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x02,
      0x02,
      0x02,
      0x00 // Notification mode: 0x00 = Stop notification
    ]);
  }

}

module.exports = MeshBlockPa;
