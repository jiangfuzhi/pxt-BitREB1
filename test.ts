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


enum Dir {
    //% block="Forward"
    forward = 0x1,
    //% block="Backward"
    backward = 0x2,
    //% block="TurnRight"
    turnRight = 0x3,
    //% block="TurnLeft"
    turnLeft = 0x4,
    //% block="stop"
    stop = 0x5,
}


//% weight=10 color=#0fbc11 icon="\uf135" block="BitRover"
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
        setFrequency(1000);
        setPwm(0, 0, 4095);
        for (let idx = 1; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFrequency(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
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

    //% blockId=BitRover_motor_Speed block="Motor|%index|speed %speed"
    //% speed eg: 50
    //% weight=100
    //% speed.min=-255 speed.max=255
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
                setPwm(2, 0, 4095)
                setPwm(3, 0, 4095)
            } else {
                setPwm(2, 0, 4095)
                setPwm(3, -speed, 0)
            }
        } else if (index == 2) {
            if (speed > 0) {
                setPwm(0, 0, 4095)
                setPwm(1, speed, 0 )
            } else if (speed == 0) {
                setPwm(0, 0, 4095)
                setPwm(1, 0, 4095)
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
                setPwm(5, 0, 4095)
                setPwm(4, 0, 4095)
            } else {
                setPwm(5, 0, 4095)
                setPwm(4, -speed, 0 )
            }

        } else if (index == 4) {
            if (speed > 0) {
                setPwm(7, 0, 4095)
                setPwm(6, speed, 0 )
            } else if (speed == 0) {
                setPwm(7, 0, 4095)
                setPwm(6, 0, 4095)
            } else {
                setPwm(7, -speed, 0)
                setPwm(6, 0, 4095)
            }
        }
    }
	/**
	 * Execute single motors 
	 * @param speed [-255-255] speed of motor; eg: 150
	*/
    //% blockId=BitRover_run block="|%index|speed %speed"
    //% speed eg: 50
    //% weight=95
    //% speed.min=-255 speed.max=255 eg: 150
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
	 * @param speed [-255-255] speed of motor; eg: 150
	 * @param time dalay second time; eg: 2
	*/
    //% blockId=BitRover_run_delay block="|%index|speed %speed|for %time|sec"
    //% speed eg: 150
    //% weight=90
    //% speed.min=-255 speed.max=255 eg: 150
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function RunDelay(index: Dir, speed: number, time: number): void {
        Run(index, speed);
        basic.pause(time * 1000);
        Run(Dir.stop, 0);
    }

}