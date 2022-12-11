/* ------------------------------------------------------------------
* node-sony-mesh - mesh-block-gp.js
* - MESH-100GP (MESH-100GP)
*
* Copyright (c) 2022, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const MeshBlock = require('./mesh-block.js');

class MeshBlockGp extends MeshBlock {
  constructor(peripheral, block_info) {
    super(peripheral, block_info);
    this._onresponse = () => { };

    this._io_mode_params = {
      din1: false,
      din2: false,
      din3: false,
      dout1: false,
      dout2: false,
      dout3: false,
      pwm: 0,
      vout: false,
      ainmax: 3,
      ainmin: 0,
      aincond: 0x00
    };
  }

  _parseMessagePacketBlock(buf) {
    const mid = this._model.id;
    if (mid !== 'GP') {
      return null;
    }

    const etype = buf[1]; // Event Type ID
    const packet = {
      type: '',
      data: {}
    };

    if (etype === 0x00) {
      // Event notification of digital input
      packet.type = 'din-event';
      packet.data.pin = buf[2] + 1; // 1 - 3
      packet.data.state = (buf[3] === 0x01) ? false : true; // true: Low to High, false: High to Low
      this._onresponse(packet);

    } else if (etype === 0x01) {
      // Event notification of analog input
      packet.type = 'ain-event';
      packet.data.pin = buf[2] + 1; // 1
      packet.data.level = Math.round(100 * 3 * buf[5] / 255) / 100; // 0.0 - 3.0 V
      this._onresponse(packet);

    } else if (etype === 0x02) {
      // State notification of digital input
      packet.type = 'din-state';
      packet.data.requestid = buf[2];
      packet.data.pin = buf[3] + 1; // 1 - 3
      packet.data.state = (buf[4] === 0x01) ? false : true; // true: High, false: Low

    } else if (etype === 0x03) {
      // State notification of analog input
      packet.type = 'ain-state';
      packet.data.requestid = buf[2];
      packet.data.pin = buf[3] + 1; // 1
      packet.data.level = Math.round(100 * 3 * buf[4] / 255) / 100; // 0.0 - 3.0 V
      //packet.data.mode = buf[5]; // 0x00: Stopped (Initial value), 0x01: once, 0x02: every 50ms

    } else if (etype === 0x04) {
      // State notification of VOUT
      packet.type = 'vout-state';
      packet.data.requestid = buf[2];
      packet.data.pin = buf[3] + 1; // 1
      packet.data.state = buf[4] ? true : false; // true: ON, false: OFF

    } else if (etype === 0x05) {
      // State notification of DOUT
      packet.type = 'dout-state';
      packet.data.requestid = buf[2];
      packet.data.pin = buf[3] + 1; // 1 - 3
      packet.data.state = buf[4] ? true : false; // true: ON, false: OFF

    } else if (etype === 0x06) {
      // State notification of PWM
      packet.type = 'pwm-state';
      packet.data.requestid = buf[2];
      packet.data.pin = buf[3] + 1; // 1 - 3
      packet.data.level = buf[4]; // 0-255

    } else {
      return null;
    }

    this._onresponse(packet);
    return packet;
  }

  /* ------------------------------------------------------------------
  * startDinNotification()
  * - Enable notification of DIN 1 - 3
  *
  * [Arguments]
  * - None
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async startDinNotification() {
    await this.setIoMode({ din1: true, din2: true, din3: true });
  }

  /* ------------------------------------------------------------------
  * stopDinNotification()
  * - Disable notification of DIN 1 - 3
  *
  * [Arguments]
  * - None
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async stopDinNotification() {
    await this.setIoMode({ din1: false, din2: false, din3: false });
  }

  /* ------------------------------------------------------------------
  * setDout(pin, state)
  * - Set the state of the specified DOUT pin number
  *
  * [Arguments]
  * - pin   | Integer | Required | PIN number of DOUT (1 - 3)
  * - state | Boolean | Required | Set specified DOUT to High (true) or Low (false)
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async setDout(pin, state) {
    if (typeof (pin) !== 'number' || !(pin === 1 || pin === 2 || pin === 3)) {
      throw new Error('The `pin` must be 1, 2, or 3.');
    }
    if (typeof (state) !== 'boolean') {
      throw new Error('The `state` must be `true` or `false`.');
    }
    const params = {};
    params['dout' + pin] = state;
    await this.setIoMode(params);
  }

  /* ------------------------------------------------------------------
  * setPwm(level)
  * - Set the level of the PWM
  *
  * [Arguments]
  * - level | Integer | Required | Duty cycle of PWM (0 - 255)
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async setPwm(level) {
    if (typeof (level) !== 'number' || level % 1 !== 0 || level < 0 || level > 255) {
      throw new Error('The `level` must be a number in the range of 0 to 255.');
    }
    await this.setIoMode({ pwm: level });
  }

  /* ------------------------------------------------------------------
  * setVout(state)
  * - Set the state of the VOUT
  *
  * [Arguments]
  * - state | Boolean | Required | `true`: ON, `false`: OFF
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`:
  * ---------------------------------------------------------------- */
  async setVout(state) {
    if (typeof (state) !== 'boolean') {
      throw new Error('The `state` must be `true` or `false`.');
    }
    await this.setIoMode({ vout: state });
  }

  /* ------------------------------------------------------------------
  * setIoMode(params)
  * - Set the I/O mode of the block
  *
  * [Arguments]
  * - params    | Object  | Optional |
  *   - din1    | Boolean | Optional | Enable or disable DIN1 state change detection (default: true)
  *   - din2    | Boolean | Optional | Enable or disable DIN2 state change detection (default: true)
  *   - din3    | Boolean | Optional | Enable or disable DIN3 state change detection (default: true)
  *   - dout1   | Boolean | Optional | Set DOUT1 to High (true) or Low (false) (default: false)
  *   - dout2   | Boolean | Optional | Set DOUT2 to High (true) or Low (false) (default: false)
  *   - dout3   | Boolean | Optional | Set DOUT3 to High (true) or Low (false) (default: false)
  *   - pwm     | Integer | Optional | Duty cycle of PWM: 0 - 255 (default: 0)
  *   - vout    | Boolean | Optional | Enable or disable VOUT (default: true)
  *   - ainmax  | Float   | Optional | Maximum voltage of AIN: 0.0 - 3.0 V (default: 3.0 V)
  *   - ainmin  | Float   | Optional | Minimum voltage of AIN: 0.0 - 3.0 V (default: 0.0 V)
  *   - aincond | Integer | Optional | Condition of AIN notification
  *             |         |          | - 0x00: Disable notification (default)
  *             |         |          | - 0x11: Notify when the value gets outside the range
  *             |         |          | - 0x22: Notify when the value gets inside the range
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async setIoMode(params = {}) {
    const vals = JSON.parse(JSON.stringify(this._io_mode_params));

    for (const k of ['din1', 'din2', 'din3', 'dout1', 'dout2', 'dout3', 'vout']) {
      if (k in params) {
        let val = params[k];
        if (typeof (val) !== 'boolean') {
          throw new Error('The `' + k + '` must be `true` or `false`.');
        }
        vals[k] = val;
      }
    }

    if ('pwm' in params) {
      let val = params.pwm;
      if (typeof (val) !== 'number' || val % 1 !== 0 || val < 0 || val > 255) {
        throw new Error('The `pwm` must be an integer in the range of 0 to 255.');
      }
      vals.pwm = val;
    }

    for (const k of ['ainmax', 'ainmin']) {
      if (k in params) {
        let val = params[k];
        if (typeof (val) !== 'number' || val < 0 || val > 3) {
          throw new Error('The `' + k + '` must be a number in the range of 0.0 to 3.0.');
        }
        vals[k] = val;
      }
    }

    if ('aincond' in params) {
      let val = params.aincond;
      if (typeof (val) !== 'number' || !(val === 0x00 || val === 0x11 || val === 0x22)) {
        throw new Error('The `aincond` must be any one of 0x00, 0x11, 0x22.');
      }
      vals.aincond = val;
    }


    let din_byte = 0x00;
    if (vals.din1) {
      din_byte = din_byte | 0b00000001;
    }
    if (vals.din2) {
      din_byte = din_byte | 0b00000010;
    }
    if (vals.din3) {
      din_byte = din_byte | 0b00000100;
    }

    let dout_byte = 0x00;
    if (vals.dout1) {
      dout_byte = dout_byte | 0b00000001;
    }
    if (vals.dout2) {
      dout_byte = dout_byte | 0b00000010;
    }
    if (vals.dout3) {
      dout_byte = dout_byte | 0b00000100;
    }

    await this._writeCommand([
      0x01, // Message Type ID
      0x01, // Event Type ID
      din_byte,
      din_byte,
      dout_byte,
      vals.pwm,
      (vals.vout === true) ? 0x01 : 0x02,
      Math.round(255 * vals.ainmax / 3),
      Math.round(255 * vals.ainmin / 3),
      vals.aincond
    ]);

    this._io_mode_params = JSON.parse(JSON.stringify(vals));
  }

  /* ------------------------------------------------------------------
  * getDin(pin)
  * - Get the current state of the specified DIN
  *
  * [Arguments]
  * - pin | Integer | Required | PIN number of DIN: 1 - 3
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     state: true, // `true`: High, `false`: Low
  *   }
  * ---------------------------------------------------------------- */
  async getDin(pin) {
    if (typeof (pin) !== 'number' || pin % 1 !== 0 || pin < 1 || pin > 3) {
      throw new Error('The `pin` must be 1, 2, or 3.');
    }

    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'din-state', [
      0x01,      // Message Type ID
      0x02,      // Event Type ID
      requestid, // Request ID
      pin - 1    // DIN PIN number (0x00 - 0x02)
    ]);

    return { state: packet.data.state };
  }

  /* ------------------------------------------------------------------
  * getAin()
  * - Get the current state of the AIN
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     level: 2.45 // Volt
  *   }
  * ---------------------------------------------------------------- */
  async getAin() {
    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'ain-state', [
      0x01,      // Message Type ID
      0x03,      // Event Type ID
      requestid, // Request ID
      0x01       // Notification mode: 0x01 = Notify once
    ]);

    return { level: packet.data.level };
  }

  /* ------------------------------------------------------------------
  * startAinNotification()
  * - Set the AIN notification mode to notify every 50 ms.
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async startAinNotification() {
    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01,      // Message Type ID
      0x03,      // Event Type ID
      requestid, // Request ID
      0x02       // Notification mode: 0x02 = Notify every 50 ms
    ]);
  }

  /* ------------------------------------------------------------------
  * stopAinNotification()
  * - Set the AIN notification mode to the stopped state.
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async stopAinNotification() {
    const requestid = this._assingRequestId();

    await this._writeCommand([
      0x01,      // Message Type ID
      0x03,      // Event Type ID
      requestid, // Request ID
      0x00       // Notification mode: 0x00 = stopped state
    ]);
  }

  /* ------------------------------------------------------------------
  * getVout()
  * - Get the current state of the VOUT
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     state: true
  *   }
  * ---------------------------------------------------------------- */
  async getVout() {
    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'vout-state', [
      0x01,      // Message Type ID
      0x04,      // Event Type ID
      requestid, // Request ID
      0x00       // VOUT PIN number (0x00 fixed)
    ]);

    return { state: packet.data.state };
  }

  /* ------------------------------------------------------------------
  * getDout(pin)
  * - Get the current state of the specified DOUT
  *
  * [Arguments]
  * - pin | Integer | Required | PIN number of DOUT: 1 - 3
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     state: true, // true: ON, false: OFF
  *   }
  * ---------------------------------------------------------------- */
  async getDout(pin) {
    if (typeof (pin) !== 'number' || pin % 1 !== 0 || pin < 1 || pin > 3) {
      throw new Error('The `pin` must be 1, 2, or 3.');
    }

    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'dout-state', [
      0x01,      // Message Type ID
      0x05,      // Event Type ID
      requestid, // Request ID
      pin - 1    // DOUT PIN number (0x00 - 0x02)
    ]);

    return { state: packet.data.state };
  }

  /* ------------------------------------------------------------------
  * getPwm()
  * - Get the current state of the PWM
  *
  * [Arguments]
  * - None
  * 
  * [Returen value]
  * - Promise object
  *   An object below will be passed to the `resolve()`:
  *   {
  *     level: 255
  *   }
  * ---------------------------------------------------------------- */
  async getPwm() {
    const requestid = this._assingRequestId();

    const packet = await this._request(requestid, 'pwm-state', [
      0x01,      // Message Type ID
      0x06,      // Event Type ID
      requestid, // Request ID
      0x02       // PWM pin number (0x02 fixed)
    ]);

    return { level: packet.data.level };
  }

}

module.exports = MeshBlockGp;
