// 在此处测试；当此软件包作为插件使用时，将不会编译此软件包。
//test

enum Motors {
    //% block="LeftFrontMotor"
    M1 = 0x1,
    //% block="RightFrontMotor"
    M2 = 0x2,
    //% block="LeftBackMotor"
    M3 = 0x3,
    //% block="RightBackMotor"
    M4 = 0x4,
}

enum IR {
    //% block="LeftFrontMotor"
    LF = 0x1,
    //% block="RightFrontMotor"
    RF = 0x2,
    //% block="LeftBackMotor"
    LB = 0x3,
    //% block="RightBackMotor"
    RB = 0x4,
}

enum Dir {
    //% block="Forward"
    forward = 0x1,
    //% block="Backward"
    backward = 0x2,
    //% block="TurnRight"
    turnRight = 0x3,
    //% block="TurnLeft"
    turnLeft = 0x4,
}

/**
 * Custom blocks
 */
//% weight=50 color=#e7660b icon="\uf1b9" block="BitRover"
namespace BitRover {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    let initialized = false
    let last_value = 0; // assume initially that the line is left.

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFrequency(50);
        //setPwm(0, 0, 4095);
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFrequency(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;//6103.5
        prescaleval /= freq;//122.07
        //prescaleval -= 1;//121.07
        //let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let prescale = (prescaleval + 6);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }

	/**
	 * Servo Execute
	 * @param Speed [-100-100] Speed of servo; eg: 10
	*/
    //% blockId=Bit.REB_servo block="360 Servo channel|%channel|Speed %degree"
    //% channel eg: 0
    //% Speed eg：0
    //% weight=85
    //% Speed.min=-100 Speed.max=100
    export function Servo(channel: number, Speed: number): void {
        if (channel < 0 || channel > 15)
            return;
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        //let cur_speed = (-180 * Speed)/255+180 //-255~0  0-1500  255-2500
        //let v_us = (Speed * 1800 / 180 + 600) // 0.6 ~ 2.4
        let cur_speed = (-180 * Speed) / 100 + 180
        let v_us = (Math.floor((cur_speed) * 2000 / 350) + 500)
        let value = v_us * 4096 / 20000
        setPwm(channel, 0, value)
    }
    
    /**
	 * Execute single motors 
	 * @param speed [-255-255] speed of motor; eg: 50
	*/
    //% blockId=BitRover_motor_Speed block="Motor|%index|speed %speed"
    //% speed eg: 50
    //% weight=100
    //% speed.min=-255 speed.max=255 speed eg: 50
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorSpeed(index: Motors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        //LF
        if (index == 1) {
            if (speed > 0) {
                setPwm(2, speed, 0)
                setPwm(3, 0, 4095)
            } else if (speed == 0) {
                setPwm(2, 0, 0)
                setPwm(3, 0, 0)
            } else {
                setPwm(2, 0, 4095)
                setPwm(3, -speed, 0)
            }
        } else if (index == 2) {
            if (speed > 0) {
                setPwm(0, 0, 4095)
                setPwm(1, speed, 0)
            } else if (speed == 0) {
                setPwm(0, 0, 0)
                setPwm(1, 0, 0)
            } else {
                setPwm(0, -speed, 0)
                setPwm(1, 0, 4095)
            }
            //LB
        } else if (index == 3) {
            if (speed > 0) {
                setPwm(5, speed, 0)
                setPwm(4, 0, 4095)
            } else if (speed == 0) {
                setPwm(5, 0, 0)
                setPwm(4, 0, 0)
            } else {
                setPwm(5, 0, 4095)
                setPwm(4, -speed, 0)
            }

        } else if (index == 4) {
            if (speed > 0) {
                setPwm(7, 0, 4095)
                setPwm(6, speed, 0)
            } else if (speed == 0) {
                setPwm(7, 0, 0)
                setPwm(6, 0, 0)
            } else {
                setPwm(7, -speed, 0)
                setPwm(6, 0, 4095)
            }
        }
    }

    /**
     * set motors speed 
     * @param speed_M1 [-255-255]； eg:50
     * @param speed_M2 [-255-255]； eg:50
     * @param speed_M3 [-255-255]； eg:50
     * @param speed_M4 [-255-255]； eg:50
     */
    //% blockId=BitRover_SetMotorRun block="LFMotor %speed_M1 RFMotor %speed_M2 LBMotor %speed_M3 RBMotor %speed_M4"
    //% inlineInputMode=inline
    //% speed_M1 eg: 50
    //% speed_M2 eg: 50
    //% speed_M3 eg: 50
    //% speed_M4 eg: 50
    //% weight=100
    //% speed_M1.min=-255 speed_M1.max=255 speed_M1 eg: 50
    //% speed_M2.min=-255 speed_M2.max=255 speed_M2 eg: 50
    //% speed_M3.min=-255 speed_M3.max=255 speed_M3 eg: 50
    //% speed_M4.min=-255 speed_M4.max=255 speed_M4 eg: 50
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(speed_M1: number, speed_M2: number, speed_M3: number, speed_M4: number, ): void {
        MotorSpeed(Motors.M1, speed_M1);
        MotorSpeed(Motors.M2, speed_M2);
        MotorSpeed(Motors.M3, speed_M3);
        MotorSpeed(Motors.M4, speed_M4);
    }


	/**
	 * Execute motors direction 
	 * @param speed [-255-255] speed of motor; eg: 50
     * @param Dir select direction； eg:Dir.forward
	*/
    //% blockId=BitRover_run block="|%index|speed %speed"
    //% speed eg: 50
    //% weight=95
    //% speed.min=-255 speed.max=255 speed eg: 50
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Run(index: Dir, speed: number): void {
        switch (index) {
            case Dir.forward:
                MotorSpeed(Motors.M1, speed);
                MotorSpeed(Motors.M2, speed);
                MotorSpeed(Motors.M3, speed);
                MotorSpeed(Motors.M4, speed);
                break;
            case Dir.backward:
                MotorSpeed(Motors.M1, -speed);
                MotorSpeed(Motors.M2, -speed);
                MotorSpeed(Motors.M3, -speed);
                MotorSpeed(Motors.M4, -speed);
                break;
            case Dir.turnRight:
                MotorSpeed(Motors.M1, speed);
                MotorSpeed(Motors.M2, -speed);
                MotorSpeed(Motors.M3, speed);
                MotorSpeed(Motors.M4, -speed);
                break;
            case Dir.turnLeft:
                MotorSpeed(Motors.M1, -speed);
                MotorSpeed(Motors.M2, speed);
                MotorSpeed(Motors.M3, -speed);
                MotorSpeed(Motors.M4, speed);
                break;
        }
    }

    //% blockId=BitRover_StopMotor block="StopMotor |%index"
    //% weight=95
    //% index eg: Motors.M1
    export function StopMotor(index: Motors): void {
        switch (index) {
            case Motors.M1:
                MotorSpeed(Motors.M1, 0);
                break;
            case Motors.M2:
                MotorSpeed(Motors.M2, 0);
                break;
            case Motors.M3:
                MotorSpeed(Motors.M3, 0);
                break;
            case Motors.M4:
                MotorSpeed(Motors.M4, 0);
                break;
        }
    }


    //% blockId=BitRover_StopAllMotor block="StopAllMotor"
    //% weight=95
    export function StopAllMotor(): void {
        MotorSpeed(Motors.M1, 0);
        MotorSpeed(Motors.M2, 0);
        MotorSpeed(Motors.M3, 0);
        MotorSpeed(Motors.M4, 0);
    }

	/**
	 * Execute single motors 
	 * @param speed [-255-255] speed of motor; eg: 50
	 * @param time dalay second time; eg: 1
	*/
    //% blockId=BitRover_run_delay block="|%index|speed %speed|for %time|sec"
    //% speed eg: 50
    //% weight=90
    //% speed.min=-255 speed.max=255 eg: 50
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function RunDelay(index: Dir, speed: number, time: number): void {
        Run(index, speed);
        basic.pause(time * 50);
        StopAllMotor();
    }

    /**
     * IR pin
     * @param pin [13-16] choose 13 to 16; eg: 14
     */
    //% blockId=Infrared sensors detect obstacles block="|%pin|Infrared sensors detect obstacles"
    export function getIrSensor(pin: IR): boolean {
        let result = 0;
        switch (pin) {
            case (IR.LF):
                result = pins.digitalReadPin(DigitalPin.P14);
                break;
            case (IR.RF):
                result = pins.digitalReadPin(DigitalPin.P13);
                break;
            case (IR.LB):
                result = pins.digitalReadPin(DigitalPin.P16);
                break;
            case (IR.RB):
                result = pins.digitalReadPin(DigitalPin.P15);
                break;
        }
        if (result == 0) {
            return true;
        }
        else {
            return false;
        }
    }


}

