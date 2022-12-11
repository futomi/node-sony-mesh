/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-ac.js
* - MESH-100AC (MESH Move)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockAc extends MeshBlock {

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'AC') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00 || etype === 0x01 || etype === 0x02 || etype === 0x03) {

      if (etype === 0x00) {
        // タップイベント検知 (振動を感知したら通知)
        packet.type = 'tap';

      } else if (etype === 0x01) {
        // シェイクイベント検知 (振られたときに通知)
        packet.type = 'shake';

      } else if (etype === 0x02) {
        // フリップイベント検知 (ひっくり返されたときに通知)
        packet.type = 'flip';

      } else if (etype === 0x03) {
        // オリエンテーションイベント検知 (向きが変わったときに通知)
        packet.type = 'orientation';
        packet.data.orientation = buf[2]; // 上を向いている面
      }
    } else {
      return null;
    }

    packet.data.x = this._calcAccValue(buf.readUInt16LE(4)); // x方向加速度
    packet.data.y = this._calcAccValue(buf.readUInt16LE(6)); // y方向加速度
    packet.data.z = this._calcAccValue(buf.readUInt16LE(8)); // z方向加速度 

    return packet;
  }

  _calcAccValue(val) {
    if (val <= 2047) {
      return val / 1024;
    } else {
      return (val - 65536) / 1024;
    }
  }
}

module.exports = MeshBlockAc;
