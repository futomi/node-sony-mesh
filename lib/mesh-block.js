/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block.js
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const EventEmitter = require('events')

class MeshBlock extends EventEmitter {
  /* ------------------------------------------------------------------
  * Constructor
  *
  * [Arguments]
  * - peripheral | Object | Required | `Peripheral` object of noble
  * - block_info | Object | Required | Block model information
  * 
  * The `block_info` object must have the members as follows:
  * {
  *   model: {
  *     id: "BU",
  *     type: 0x02,
  *     number: "MESH-100BU",
  *     name: "MESH Button"
  *   },
  *   serial: "1009323"
  * }
  * ---------------------------------------------------------------- */
  constructor(peripheral, block_info) {
    super();

    this._id = peripheral.id;
    this._peripheral = peripheral;
    this._model = block_info.model;
    this._serial = block_info.serial;
    this._version = '';
    this._battery = 0;

    this._SERVICE_UUID = '72c9000157a94d40b746534e22ec9f9e';
    this._CHAR_WRITE_UUID = '72c9000457a94d40b746534e22ec9f9e';
    this._CHAR_INDICATE_UUID = '72c9000557a94d40b746534e22ec9f9e';
    this._CHAR_NOTIFY_UUID = '72c9000357a94d40b746534e22ec9f9e';

    this._CONN_TIMEOUT = 3000; // msec
    this._CONN_INTERVAL = 500; // msec
    this._CONN_TRY_MAX = 10;

    this._ACTIVATION_TIMEOUT = 500; // msec
    this._WRITE_TIMEOUT = 500; // msec
    this._WRITE_INTERVAL = 200; // msec
    this._WRITE_TRY_MAX = 5;

    this._REQUEST_TIMEOUT = 1000; // msec

    this._connected = false;
    this._ondisconnect = () => { };

    this._chars = {
      write: null,
      indicate: null,
      notify: null
    };

    this._requestid = -1;
    this._onresponse = () => { };
  }

  get id() {
    return this._id;
  }

  get serial() {
    return this._serial;
  }

  get model() {
    return JSON.parse(JSON.stringify(this._model));
  }

  get version() {
    return this._version;
  }

  get battery() {
    return this._battery;
  }

  get connected() {
    return this._connected;
  }


  _assingRequestId() {
    this._requestid = (this._requestid + 1) % 0xFF;
    return this._requestid;
  }

  /* ------------------------------------------------------------------
  * connect()
  * - Establish a BLE connection and activate the block
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async connect() {
    if (this._connected === true) {
      return;
    }

    let last_error = null;

    for (let n = 0; n < this._CONN_TRY_MAX; n++) {
      try {
        this._chars = await this._connect();
        this._connected = true;
        await this._activate();
        last_error = null;
        break;
      } catch (error) {
        this._connected = false;
        last_error = error;
      }
      await this._wait(this._CONN_INTERVAL);
    }

    if (last_error) {
      this._connected = false;
      throw new Error('Failed to connect to the Block: ' + last_error.message);
    }

    this._chars.notify.on('data', (buf) => {
      const message = this._parseMessage(buf);
      if (message) {
        this.emit('notify', message);
      }
    });

    this.emit('connect');

    this._peripheral.once('disconnect', async () => {
      this._connected = false;
      await this._clean();
      this._ondisconnect();
      this.emit('disconnect');
    });
  }

  _connect() {
    return new Promise(async (resolve, reject) => {
      let timer = null;
      let aborted = false;

      let clean = async () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this._peripheral.removeAllListeners('disconnect');
      };

      let abort = async () => {
        aborted = true;
        await clean();
        this._peripheral.disconnect();
        await this._wait(100);
      };

      timer = setTimeout(async () => {
        timer = null;
        await abort();
        reject(new Error('CONNECTION TIMEOUT'));
      }, this._CONN_TIMEOUT);

      try {
        await this._peripheral.connectAsync();

        this._peripheral.once('disconnect', async () => {
          await abort();
          reject(new Error('DISCONNECTED'));
        });

        this._wait(100);
        if (aborted) { return; }

        const suuids = [this._SERVICE_UUID];
        const cuuids = [this._CHAR_WRITE_UUID, this._CHAR_INDICATE_UUID, this._CHAR_NOTIFY_UUID];
        const { characteristics } = await this._peripheral.discoverSomeServicesAndCharacteristicsAsync(suuids, cuuids);
        if (aborted) { return; }
        const chars = {};
        for (const char of characteristics) {
          if (char.uuid === this._CHAR_WRITE_UUID) {
            chars.write = char;
          } else if (char.uuid === this._CHAR_INDICATE_UUID) {
            chars.indicate = char;
          } else if (char.uuid === this._CHAR_NOTIFY_UUID) {
            chars.notify = char;
          }
        }

        if (!chars.write || !chars.indicate || !chars.notify) {
          throw new Error('The characteristics were not found.');
        }

        await clean();
        resolve(chars);

      } catch (error) {
        await abort();
        reject(error);
      }
    });
  }

  _activate() {
    return new Promise(async (resolve, reject) => {
      let timer = null;

      let clean = async () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this._peripheral.removeAllListeners('disconnect');
      };

      let abort = async () => {
        await clean();
        this._peripheral.disconnect();
        await this._wait(100);
      };

      this._chars.indicate.on('data', async (buf) => {
        const packet = this._parseMessage(buf);
        if (!packet) {
          return;
        }
        if (packet.type !== 'blockbasicinfo') {
          return;
        }

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        this._chars.indicate.removeAllListeners('data');

        try {
          await this._writeCommand([0x00, 0x02, 0x01]);
          await clean();
          resolve();

        } catch (error) {
          await abort();
          reject(error);
        }
      });

      this._peripheral.once('disconnect', async () => {
        await abort();
        reject(new Error('DISCONNECTED'));
      });

      try {
        timer = setTimeout(() => {
          timer = null;
          reject(new Error('ACTIVATION TIMEOUT'));
        }, this._ACTIVATION_TIMEOUT);
        await this._chars.indicate.subscribeAsync();
        await this._chars.notify.subscribeAsync();

      } catch (error) {
        this.disconnect();
        this._wait(100);
        reject(error);
      }
    });
  }

  async _writeCommand(bytes) {
    let last_error = null;
    for (let i = 0; i < this._WRITE_TRY_MAX; i++) {
      try {
        await this._write(bytes);
        last_error = null;
        break;
      } catch (error) {
        last_error = error;
      }
      this._wait(this._WRITE_INTERVAL);
    }
    if(last_error) {
      throw last_error;
    }
  }

  _write(bytes) {
    return new Promise(async (resolve, reject) => {
      if (!this._connected) {
        reject(new Error('The MESH block is not connected.'));
        return;
      }

      let timer = null;

      const clean = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this._ondisconnect = () => { };
      };

      timer = setTimeout(() => {
        timer = null;
        clean();
        reject(new Error('WRITE TIMEOUT'));
      }, this._WRITE_TIMEOUT);

      this._ondisconnect = () => {
        clean();
        reject(new Error('The BLE connection was lost.'));
      };

      // Calculate the checksum
      const checksum = this._calcChecksum(bytes);

      try {
        const wbuf = Buffer.from([...bytes, checksum]);
        await this._chars.write.writeAsync(wbuf, false);
        clean();
        resolve();
      } catch (error) {
        if (timer) {
          clean();
          reject(error);
        }
      }
    });
  }

  async _request(requestid, type, bytes) {
    return new Promise(async (resolve, reject) => {
      let timer = null;
      let resolved = false;

      const clean = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      this._onresponse = (packet) => {
        if (packet.type === type && packet.data.requestid === requestid) {
          clean();
          resolved = true;
          resolve(packet);
        }
      };

      try {
        await this._writeCommand(bytes);
        if (!resolved) {
          timer = setTimeout(() => {
            this._onresponse = () => { };
            timer = null;
            reject(new Error('REQUEST TIMEOUT'));
          }, this._REQUEST_TIMEOUT);
        }
      } catch (error) {
        this._onresponse = () => { };
        clean();
        reject(error);
      }
    });
  }

  _wait(msec) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, msec);
    });
  }


  _parseMessage(buf) {
    if (!buf || buf.length < 4 || buf.length > 20) {
      return null;
    }

    // Checksum
    let sum = 0;
    for (let i = 0; i < buf.length - 1; i++) {
      sum += buf[i];
    }
    const check_sum = buf[buf.length - 1];
    if (sum % 256 !== check_sum) {
      return null;
    }

    const mtype = buf[0]; // Message Type ID

    let packet = null;
    if (mtype === 0x00) {
      // ブロック共通機能
      packet = this._parseMessagePacketCommon(buf);
    } else if (mtype === 0x01) {
      // 各ブロックの機能
      packet = this._parseMessagePacketBlock(buf);
    } else {
      return null;
    }

    if (!packet) {
      return null;
    }

    delete packet.data.requestid;

    const message = {
      id: this._id,
      serial: this._serial,
      model: JSON.parse(JSON.stringify(this._model))
    };
    Object.assign(message, packet);
    return message;
  }

  _parseMessagePacketCommon(buf) {
    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00) {
      // 定時通信
      if (buf.length !== 4) {
        return null;
      }

      packet.type = 'periodicreport';
      packet.data.battery = buf[2] * 10;

    } else if (etype === 0x01) {
      // アイコンイベント検知
      if (buf.length !== 4) {
        return null;
      }

      packet.type = 'icon';
      packet.data.press = '';

      const state = buf[2]; // アイコンイベント (0x00: 1回押し, 0x01: 長押し (電源オフの操作))
      if (state === 0x00) {
        packet.data.press = 'single';
      } else if (state === 0x01) {
        packet.data.press = 'long';
      }

    } else if (etype === 0x02) {
      // ブロック基本情報通知
      if (buf.length !== 16) {
        return null;
      }

      const model_code = buf[2];

      const model = {
        code: model_code,
        number: '',
        name: ''
      };

      if (model_code === 0x00) {
        model.number = 'MESH-100LE';
        model.name = 'MESH LED';
      } else if (model_code === 0x01) {
        model.number = 'MESH-100AC';
        model.name = 'MESH Move';
      } else if (model_code === 0x02) {
        model.number = 'MESH-100BU';
        model.name = 'MESH Button';
      } else if (model_code === 0x09) {
        model.number = 'MESH-100GP';
        model.name = 'MESH GPIO';
      } else if (model_code === 0x10) {
        model.number = 'MESH-100MD';
        model.name = 'MESH Motion';
      } else if (model_code === 0x11) {
        model.number = 'MESH-100PA';
        model.name = 'MESH Brightness';
      } else if (model_code === 0x12) {
        model.number = 'MESH-100TH';
        model.name = 'MESH Temperature & Humidity';
      }

      const serial = buf.readUInt32LE(3).toString();
      const version = [buf[7], buf[8], buf[9]].join('.');
      const battery = buf[14] * 10;

      packet.type = 'blockbasicinfo';
      packet.data.model = model;
      packet.data.serial = serial;
      packet.data.version = version;
      packet.data.battery = battery;

      this._serial = serial;
      this._version = version;
      this._battery = battery;

    } else {
      return null;
    }

    return packet;
  }

  _parseMessagePacketBlock(buf) {
    // Do nothing in this module.
    // See the block-specific module for details, such as mesh-block-bu.js
  }

  /* ------------------------------------------------------------------
  * disconnect()
  * - Close the BLE connection
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async disconnect() {
    if (this._connected === true) {
      await this._clean();
      await this._peripheral.disconnectAsync();
      this.emit('disconnect');
      this._connected = false;
    }
  }

  async _clean() {
    if (this._chars.indicate) {
      await this._chars.indicate.unsubscribeAsync();
      this._chars.indicate.removeAllListeners();
    }
    if (this._chars.notify) {
      await this._chars.notify.unsubscribeAsync();
      this._chars.notify.removeAllListeners();
    }
    if (this._chars.write) {
      this._chars.write.removeAllListeners();
    }
    this._peripheral.removeAllListeners();

    this._chars = {
      write: null,
      indicate: null,
      notify: null
    };
  }

  /* ------------------------------------------------------------------
  * turnOnStatusBar(params)
  * - Turn on the status bar LED
  *
  * [Arguments]
  * - params | Object  | Optional |
  *   - r    | Boolean | Optional | Red component (Default: true)
  *   - g    | Boolean | Optional | Green component (Default: true)
  *   - b    | Boolean | Optional | Blue component (Default: true)
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async turnOnStatusBar(params = {}) {
    if (typeof (params) !== 'object') {
      throw new Error('The `params` must be an object.');
    }

    const rgb = { r: true, g: true, b: true };
    for (let k of Object.keys(rgb)) {
      if (k in params) {
        if (typeof (params[k]) === 'boolean') {
          rgb[k] = params[k];
        } else {
          throw new Error('The `' + k + '` must be a boolean.');
        }
      }
    }

    await this._writeCommand([
      0x00, // Message Type ID
      0x00, // Event Type ID
      rgb.r ? 0x01 : 0x00, // Red component
      rgb.g ? 0x01 : 0x00, // Green component
      rgb.b ? 0x01 : 0x00, // Blue component
      0x01  // Turn on LED: 0x01
    ]);
  }

  _calcChecksum(bytes) {
    let sum = 0;
    for (const n of bytes) {
      sum += n;
    }
    return sum % 256;
  }

  /* ------------------------------------------------------------------
  * turnOffStatusBar()
  * - Turn off the status bar LED
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async turnOffStatusBar() {
    await this._writeCommand([
      0x00, // Message Type ID
      0x00, // Event Type ID
      0x00, // Red component
      0x00, // Green component
      0x00, // Blue component
      0x00  // Turn off LED: 0x00
    ]);
  }

  /* ------------------------------------------------------------------
  * enableStatusBar()
  * - Enable the status bar LED
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * 
  * [Note]
  * - This method does not affect the block at all somehow.
  * ---------------------------------------------------------------- */
  async enableStatusBar() {
    await this._writeCommand([
      0x00, // Message Type ID
      0x04, // Event Type ID
      0x01  // 0x00: disable, 0x01: enable
    ]);
  }

  /* ------------------------------------------------------------------
  * disableStatusBar()
  * - Disable the status bar LED
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * 
  * [Note]
  * - This method does not affect the block at all somehow.
  * ---------------------------------------------------------------- */
  async disableStatusBar() {
    await this._writeCommand([
      0x00, // Message Type ID
      0x04, // Event Type ID
      0x00  // 0x00: disable, 0x01: enable
    ]);
  }

  /* ------------------------------------------------------------------
  * powerOff()
  * - Power off the Block
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async powerOff() {
    await this._writeCommand([
      0x00, // Message Type ID
      0x05, // Event Type ID
      0x00, // Power off: 0x00
    ]);
  }
}

module.exports = MeshBlock;
