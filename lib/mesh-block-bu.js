/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-bu.js
* - MESH-100BU (MESH Button)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockBu extends MeshBlock {

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'BU') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: 'button',
      data: {}
    };

    if (etype === 0x00) {
      // ボタンイベント検知
      const state = buf[2];
      if(state === 0x01) {
        packet.data.press = 'single'; // 1 回押し
      } else if(state === 0x02) {
        packet.data.press = 'long'; // 長押し
      } else if(state === 0x03) {
        packet.data.press = 'double'; // 2 回押し
      } else {
        return null;
      }
    } else {
      return null;
    }

    return packet;
  }

}

module.exports = MeshBlockBu;
