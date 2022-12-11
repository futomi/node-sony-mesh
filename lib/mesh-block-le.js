/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-le.js
* - MESH-100LE (MESH LED)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockLe extends MeshBlock {

  /* ------------------------------------------------------------------
  * turnOnLed(params)
  * - Turn on the LED
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - rgb      | Array   | Optional | RGB values (Default: [255, 255, 255])
  *              |         |          | Each value is in the range of 0 to 255.
  *   - duration | Integer | Optional | Tolal lighting time (1 - 65535) (Default: 65535)
  *   - oncycle  | Integer | Optional | ON cycle time (0 - 65535) (Default: 65535)
  *   - offcycle | Integer | Optional | OFF cycle time (0 - 65535) (Default: 0)
  *   - pattern  | Integer | Optional | 1: blink, 2: transition (Default: 1)
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async turnOnLed(params) {
    if (!params || typeof (params) !== 'object') {
      throw new Error('The `params` must be an object.');
    }

    let rgb = [255, 255, 255];
    if ('rgb' in params) {
      rgb = params.rgb;
      if (!Array.isArray(rgb) || rgb.length !== 3) {
        throw new Error('The `rgb` is invalid.');
      }
      for (let val of rgb) {
        if (typeof (val) !== 'number' || val % 1 !== 0 || val < 0 || val > 255) {
          throw new Error('The `rgb` is invalid.');
        }
      }
    }
    const red = (rgb[0] % 2) ? (rgb[0] - 1) / 2 : rgb[0] / 2;
    const green = (rgb[1] % 2) ? (rgb[1] - 1) / 2 : rgb[1] / 2;
    const blue = (rgb[2] % 2) ? (rgb[2] - 1) / 2 : rgb[2] / 2;

    let duration = 65535;
    if ('duration' in params) {
      duration = params.duration;
      if (typeof (duration) !== 'number' || duration % 1 !== 0 || duration < 1 || duration > 65535) {
        throw new Error('The `duration` is invalid.');
      }
    }
    const duration_buf = Buffer.alloc(2);
    duration_buf.writeUInt16LE(duration, 0);

    let oncycle = 65535;
    if ('oncycle' in params) {
      oncycle = params.oncycle;
      if (typeof (oncycle) !== 'number' || oncycle % 1 !== 0 || oncycle < 0 || oncycle > 65535) {
        throw new Error('The `oncycle` is invalid.');
      }
    }
    const oncycle_buf = Buffer.alloc(2);
    oncycle_buf.writeUInt16LE(oncycle, 0);

    let offcycle = 0;
    if ('offcycle' in params) {
      offcycle = params.offcycle;
      if (typeof (offcycle) !== 'number' || offcycle % 1 !== 0 || offcycle < 0 || offcycle > 65535) {
        throw new Error('The `oncycle` is invalid.');
      }
    }
    const offcycle_buf = Buffer.alloc(2);
    offcycle_buf.writeUInt16LE(offcycle, 0);

    let pattern = 1;
    if ('pattern' in params) {
      pattern = params.pattern;
      if (typeof (pattern) !== 'number' || !(pattern === 1 || pattern === 2)) {
        throw new Error('The `pattern` is invalid.');
      }
    }

    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      red, // Red
      0x00,
      green, // Green
      0x00,
      blue, // Blue,
      duration_buf[0], // Duration (2 bytes)
      duration_buf[1],
      oncycle_buf[0], // On cycle (2 bytes)
      oncycle_buf[1],
      offcycle_buf[0], // Off cycle (2 bytes)
      offcycle_buf[1],
      pattern // Pattern
    ]);
  }

  /* ------------------------------------------------------------------
  * turnOffLed()
  * - Turn off the LED
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async turnOffLed() {
    await this._writeCommand([
      0x01, // Message Type ID
      0x00, // Event Type ID
      0x00, // Red
      0x00,
      0x00, // Green
      0x00,
      0x00, // Blue,
      0xFF, // Duration (2 bytes)
      0xFF,
      0x00, // On cycle (2 bytes)
      0x00,
      0x00, // Off cycle (2 bytes)
      0x00,
      0x02  // Pattern
    ]);
  }

}

module.exports = MeshBlockLe;
