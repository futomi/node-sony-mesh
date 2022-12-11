/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-md.js
* - MESH-100MD (MESH Motion)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockMd extends MeshBlock {
  constructor(peripheral, block_info) {
    super(peripheral, block_info);
    this._onresponse = () => { };
  }

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'MD') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00) {
      packet.type = 'motion';
      packet.data.requestid = buf[2];
      packet.data.state = (buf[3] === 0x01) ? true : false; // true: detected, false: not detected
      //packet.data.mode = buf[4];
      this._onresponse(packet);
    } else {
      return null;
    }

    return packet;
  }

  /* ------------------------------------------------------------------
  * getCurrentData(params)
  * - Get the current measurement data
  *
  * [Arguments]
  * - params  | Object  | Optional |
  *   - dtime | Integer | Optional | Detection time
  *           |         |          | (500 - 60000 msec) (Default: 500 msec)
  *
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     state: true, // true: detected, false: not detected
  *   }
  * ---------------------------------------------------------------- */
  async getCurrentData(params = {}) {
    const htime = 500;
    const htime_buf = Buffer.alloc(2);
    htime_buf.writeUInt16LE(htime, 0);

    let dtime = 500;
    if ('dtime' in params) {
      dtime = params.dtime;
      if (typeof (dtime) !== 'number' || dtime % 1 !== 0 || dtime < 500 || dtime > 60000) {
        throw new Error('The `dtime` must be an integer in the range of 500 to 60000.');
      }
    }
    const dtime_buf = Buffer.alloc(2);
    dtime_buf.writeUInt16LE(dtime, 0);

    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'motion', [
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid,
      0x10, // Notification mode: 0x10 = notify once
      htime_buf[0], // Detected state holding time (2 bytes)
      htime_buf[1],
      dtime_buf[0], // Detection time (2 bytes)
      dtime_buf[1]
    ]);

    return { state: packet.data.state };
  }

  /* ------------------------------------------------------------------
  * startNotification(params)
  * - Enable notification
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - htime    | Integer | Optional | Detected state holding time
  *              |         |          | (200 - 60000 msec) (Default: 500 msec)
  *   - periodic | Boolean | Optional | If `true`, the Block sends a notification every 250 ms. 
  *              |         |          | The default value is `false`.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async startNotification(params = {}) {
    const dtime = 500;
    const dtime_buf = Buffer.alloc(2);
    dtime_buf.writeUInt16LE(dtime, 0);

    let htime = 500;
    if ('htime' in params) {
      htime = params.htime;
      if (typeof (htime) !== 'number' || htime % 1 !== 0 || htime < 200 || htime > 60000) {
        throw new Error('The `htime` must be an integer in the range of 200 to 60000.');
      }
    }
    const htime_buf = Buffer.alloc(2);
    htime_buf.writeUInt16LE(htime, 0);


    let periodic = false;
    if ('periodic' in params) {
      periodic = params.periodic;
      if (typeof (periodic) !== 'boolean') {
        throw new Error('The `periodic` must be `true` or `false`.');
      }
    }

    const mode = (periodic === true) ? 0x20 : 0x03;

    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid,
      mode,
      htime_buf[0], // Detected state holding time (2 bytes)
      htime_buf[1],
      dtime_buf[0], // Detection time (2 bytes)
      dtime_buf[1]
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
    const htime = 500;
    const htime_buf = Buffer.alloc(2);
    htime_buf.writeUInt16LE(htime, 0);

    const dtime = 500;
    const dtime_buf = Buffer.alloc(2);
    dtime_buf.writeUInt16LE(dtime, 0);

    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      requestid,
      0x00, // Mode: 0x00 = Stop notification
      htime_buf[0], // Detected state holding time (2 bytes)
      htime_buf[1],
      dtime_buf[0], // Detection time (2 bytes)
      dtime_buf[1]
    ]);
  }

}

module.exports = MeshBlockMd;
