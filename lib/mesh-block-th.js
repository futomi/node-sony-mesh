/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-th.js
* - MESH-100TH (MESH Temperature & Humidity)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockTh extends MeshBlock {
  constructor(peripheral, block_info) {
    super(peripheral, block_info);
    this._onresponse = () => { };
  }

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'TH') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00) {
      let temp = buf.readUInt16LE(4);
      if (temp < 500) {
        temp = temp / 10;
      } else {
        temp = (temp - 65536) / 10;
      }

      packet.type = 'temperature-humidity';
      packet.data.requestid = buf[2];
      //packet.data.mode = buf[3];
      packet.data.temperature = temp; // degC
      packet.data.humidity = buf.readUInt16LE(6); // %RH
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
  *     temperature: 25.4,
  *     humidity: 60
  *   }
  * ---------------------------------------------------------------- */
  async getCurrentData() {
    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'temperature-humidity', [
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
      0x10 // Notification mode: 0x10 = notify once
    ]);

    return {
      temperature: packet.data.temperature,
      humidity: packet.data.humidity
    };
  }

  /* ------------------------------------------------------------------
  * startNotification(params)
  * - Enable notification
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - periodic | Boolean | Optional | If `true`, the Block sends a notification every 50 ms. 
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
      0x00 // Notification mode: 0x00 = Stop notification
    ]);
  }

}

module.exports = MeshBlockTh;
