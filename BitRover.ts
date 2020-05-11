// 在此处测试；当此软件包作为插件使用时，将不会编译此软件包。
//test

enum Motors {
    //% block="LM-1"
    M1 = 0x1,
    //% block="LM-2"
    M2 = 0x2,
    //% block="RM-1"
    M3 = 0x3,
    //% block="RM-2"
    M4 = 0x4,
}

/**
 * The user defines the motor rotation direction.
 */
enum Dir_Stepper {
    //% blockId="CW" block="CW"
    CW = 1,
    //% blockId="CCW" block="CCW"
    CCW = -1,
}

/**
 * The user can select a two-path stepper motor controller.
 */
enum Steppers {
    //% blockId="M1" block="Motor1"
    M1 = 0x1,
    //% blockId="M2" block="Motor2"
    M2 = 0x2
}

enum DirRotate {
    left,
    right
}
/**
 * Custom blocks
 */
//% weight=50 color=#e7660b icon="\uf1b9" block="BitREB"
//% groups="['Motors', 'BitRover', 'IR', 'NEOPIXEL']"
namespace BitREB {
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

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    const BYG_CHA_L = 3071
    const BYG_CHA_H = 1023

    const BYG_CHB_L = 1023
    const BYG_CHB_H = 3071

    const BYG_CHC_L = 4095
    const BYG_CHC_H = 2047

    const BYG_CHD_L = 2047
    const BYG_CHD_H = 4095


    /**
     * The user can select the 8 steering gear controller.
     */
    export enum Servos {
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        S5 = 0x05,
        S6 = 0x06,
        S7 = 0x07,
        S8 = 0x08
    }

    /**
     * The user can select the 9 steering gear controller.
     */
    export enum Dir {
        //% block=" up-left"
        upleft,
        //% block=" forward"
        forward,
        //% block=" up-right"
        upright,
        //% block=" left"
        left,
        //% block=" stop"
        stop,
        //% block=" right"
        right,
        //% block=" down-left"
        downleft,
        //% block=" backward"
        backward,
        //% block=" down-right"
        downright,
    }

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

    function setStepper_28(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H);
                setPwm(2, STP_CHB_L, STP_CHB_H);
                setPwm(1, STP_CHC_L, STP_CHC_H);
                setPwm(3, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(3, STP_CHA_L, STP_CHA_H);
                setPwm(1, STP_CHB_L, STP_CHB_H);
                setPwm(2, STP_CHC_L, STP_CHC_H);
                setPwm(0, STP_CHD_L, STP_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H);
                setPwm(6, STP_CHB_L, STP_CHB_H);
                setPwm(5, STP_CHC_L, STP_CHC_H);
                setPwm(7, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(7, STP_CHA_L, STP_CHA_H);
                setPwm(5, STP_CHB_L, STP_CHB_H);
                setPwm(6, STP_CHC_L, STP_CHC_H);
                setPwm(4, STP_CHD_L, STP_CHD_H);
            }
        }
    }

    function setStepper_42(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(3, BYG_CHA_L, BYG_CHA_H);
                setPwm(2, BYG_CHB_L, BYG_CHB_H);
                setPwm(1, BYG_CHC_L, BYG_CHC_H);
                setPwm(0, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(3, BYG_CHC_L, BYG_CHC_H);
                setPwm(2, BYG_CHD_L, BYG_CHD_H);
                setPwm(1, BYG_CHA_L, BYG_CHA_H);
                setPwm(0, BYG_CHB_L, BYG_CHB_H);
            }
        } else {
            if (dir) {
                setPwm(7, BYG_CHA_L, BYG_CHA_H);
                setPwm(6, BYG_CHB_L, BYG_CHB_H);
                setPwm(5, BYG_CHC_L, BYG_CHC_H);
                setPwm(4, BYG_CHD_L, BYG_CHD_H);
            } else {
                setPwm(7, BYG_CHC_L, BYG_CHC_H);
                setPwm(6, BYG_CHD_L, BYG_CHD_H);
                setPwm(5, BYG_CHA_L, BYG_CHA_H);
                setPwm(4, BYG_CHB_L, BYG_CHB_H);
            }
        }
    }

    /**
     * set motors speed 
     * @param speed [-255-255]； eg:100
     * @param speed1 [-255-255]； eg:100
     */
    //% blockId=BitRover_SetMotorRun block="set speed %index %speed %index1 %speed1"
    //% inlineInputMode=inline
    //% speed eg: 100
    //% speed1 eg: 100
    //% weight=60 blockGap=8
    //% speed.min=-255 speed.max=255 speed eg: 100
    //% speed1.min=-255 speed1.max=255 speed eg: 100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% index1.fieldEditor="gridpicker" index1.fieldOptions.columns=4
    //% group="Motors"
    export function MotorRun(index: Motors, speed: number, index1: Motors, speed1: number, ): void {
        MotorSpeed(index, speed);
        MotorSpeed(index1, speed1);
    }


    /**
	 * Execute single motors 
	 * @param speed [-255-255] speed of motor; eg: 100
	*/
    //% blockId=BitRover_motor_Speed block="set|%index|speed to %speed"
    //% speed eg: 100
    //% weight=50 blockGap=8
    //% speed.min=-255 speed.max=255 speed eg: 100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Motors"
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

        if (index == 1) //LM-1
        {
            if (speed > 0) {
                setPwm(0, speed, 0)
                setPwm(1, 0, 4095)
            } else if (speed == 0) {
                setPwm(0, 0, 0)
                setPwm(1, 0, 0)
            } else {
                setPwm(0, 0, 4095)
                setPwm(1, -speed, 0)
            }
        }
        else if (index == 2) //LM-2
        {
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
        }
        else if (index == 3) //RM-1
        {
            if (speed > 0) {
                setPwm(5, 0, 4095)
                setPwm(4, speed, 0)
            } else if (speed == 0) {
                setPwm(5, 0, 0)
                setPwm(4, 0, 0)
            } else {
                setPwm(5, -speed, 0)
                setPwm(4, 0, 4095)
            }
        }
        else if (index == 4) //RM-2
        {
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

    //% blockId=BitRover_StopMotor block="stop |%index"
    //% weight=50 blockGap=8
    //% index eg: Motors.M1
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Motors"
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

    //% blockId=BitRover_StopAllMotor block="stop all motors"
    //% weight=50 blockGap=8
    //% group="Motors"
    export function StopAllMotor(): void {
        MotorSpeed(Motors.M1, 0);
        MotorSpeed(Motors.M2, 0);
        MotorSpeed(Motors.M3, 0);
        MotorSpeed(Motors.M4, 0);
    }

    /**
      * Steering gear control function.
      * S1~S8.
      * @param degree [0-180] degree of servo; eg: 90
     */
    //% blockId=motor_servo block="set servo|%index|angle to|%degree"
    //% weight=40 blockGap=8
    //% degree.min=0 degree.max=180
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Motors"
    export function servo(index: Servos, degree: number): void {
        if (index < 0 || index > 15)
            return;
        if (!initialized) {
            initPCA9685()
        }
        // 50hz
        let v_us = (degree * 1800 / 180 + 600) // 0.6ms ~ 2.4ms
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * Servo Execute
     * @param Speed [-100-100] Speed of servo; eg: 50
    */
    //% blockId=Bit.REB_servo block="360° servo |%index|run at|%degree"
    //% Speed eg：50
    //% weight=40 blockGap=8
    //% Speed.min=-100 Speed.max=100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Motors"
    export function _360_servo(index: Servos, Speed: number): void {
        if (index < 0 || index > 15)
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
        setPwm(index + 7, 0, value)
    }

    /**
     * Servo stop
    */
    //% blockId=Bit.REB_servo_stop block="360° servo |%index|stop"
    //% weight=40 blockGap=8
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=4
    //% group="Motors"
    export function _360_servo_stop(index: Servos): void {
        if (index < 0 || index > 15)
            return;
        if (!initialized) {
            initPCA9685()
        }
        setPwm(index + 7, 0, 0)
    }

    /**
      * Execute a 42 step motor turn speed time.
      * @param speed [0-100] speed of stepper; eg: 50
     */
    //% blockId=stepperTurn_42_speed_time block="Stepper 42 %index dir %direction speed to %speed for %time seconds"
    //% speed.min=0 speed.max=100  eg:50
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% weight=30 blockGap=8
    //% inlineInputMode=inline
    //% group="Motors"
    export function stepperTurn_42_speed_time(index: Steppers, direction: Dir_Stepper, speed: number, time: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (time == 0) {
            return;
        }
        if (speed == 0) {
            stepperDegree_42(index, direction, 0)
            return;
        }
        setFrequency(speed + 50)
        let Degree = Math.abs(time);
        Degree = time * direction;
        setStepper_42(index, Degree > 0);
        basic.pause(time * 1000);
        if (index == 1) {
            MotorSpeed(Motors.M1, 0);
            MotorSpeed(Motors.M2, 0);
        } else {
            MotorSpeed(Motors.M3, 0);
            MotorSpeed(Motors.M4, 0);
        }
    }


    /**
	 * Execute a 42BYGH1861A-C step motor(Degree).
     * M1/M2.
    */
    //% weight=30 blockGap=8
    //% blockId=motor_stepperDegree_42 block="Stepper 42|%index|dir|%direction|degree|%degree"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Motors"
    export function stepperDegree_42(index: Steppers, direction: Dir_Stepper, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // let Degree = Math.abs(degree);
        // Degree = Degree * direction;
        //setFreq(100);
        setStepper_42(index, direction > 0);
        if (degree == 0) {
            return;
        }
        let Degree = Math.abs(degree);
        basic.pause((50000 * Degree) / (360 * 50));  //100hz
        if (index == 1) {
            MotorSpeed(Motors.M1, 0);
            MotorSpeed(Motors.M2, 0);
        } else {
            MotorSpeed(Motors.M3, 0);
            MotorSpeed(Motors.M4, 0);
        }
        //setFreq(50);
    }

    /**
	 * Execute a 42BYGH1861A-C step motor(Turn).
     * M1/M2.
    */
    //% weight=30 blockGap=8
    //% blockId=motor_stepperTurn_42 block="Stepper 42|%index|dir|%direction|turn|%turn"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Motors"
    export function stepperTurn_42(index: Steppers, direction: Dir_Stepper, turn: number): void {
        if (turn == 0) {
            return;
        }
        let degree = turn * 360;
        stepperDegree_42(index, direction, degree);
    }

    /**
	 * Execute a 28BYJ-48 step motor(Degree).
    */
    //% weight=20 blockGap=8
    //% blockId=motor_stepperDegree_28 block="Stepper 28|%index|dir|%direction|degree|%degree"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Motors"
    export function stepperDegree_28(index: Steppers, direction: Dir_Stepper, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (degree == 0) {
            return;
        }
        let Degree = Math.abs(degree);
        Degree = Degree * direction;
        //setFrequency(150)
        setStepper_28(index, Degree > 0);
        Degree = Math.abs(Degree);
        basic.pause((10000 * Degree) / 360);
        if (index == 1) {
            MotorSpeed(Motors.M1, 0);
            MotorSpeed(Motors.M2, 0);
        } else {
            MotorSpeed(Motors.M3, 0);
            MotorSpeed(Motors.M4, 0);
        }
        //setFreq(50);
    }

    /**
       * Execute a 28BYJ-48 step motor(Turn).
      */
    //% weight=20 blockGap=8
    //% blockId=motor_stepperTurn_28 block="Stepper 28|%index|dir|%direction|turn|%turn"
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% group="Motors"
    export function stepperTurn_28(index: Steppers, direction: Dir_Stepper, turn: number): void {
        if (turn == 0) {
            return;
        }
        let degree = turn * 360;
        stepperDegree_28(index, direction, degree);
    }

    /**
       * Execute a 28BYJ-48 step motor turn speed time.
       * @param speed [0-100] speed of servo; eg: 50
      */
    //% blockId=stepperTurn_28_speed_time block="Stepper 28 %index dir %direction speed to %speed for %time seconds"
    //% speed.min=0 speed.max=100  eg:50
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% direction.fieldEditor="gridpicker" direction.fieldOptions.columns=2
    //% weight=10 blockGap=8
    //% inlineInputMode=inline
    //% group="Motors"
    export function stepperTurn_28_speed_time(index: Steppers, direction: Dir_Stepper, speed: number, time: number): void {
        if (!initialized) {
            initPCA9685()
        }
        if (time == 0) {
            return;
        }
        if (speed == 0) {
            stepperDegree_28(index, direction, 0)
            return;
        }
        setFrequency(speed + 50)
        let Degree = Math.abs(time);
        Degree = time * direction;
        setStepper_28(index, Degree > 0);
        basic.pause(time * 1000);
        if (index == 1) {
            MotorSpeed(Motors.M1, 0);
            MotorSpeed(Motors.M2, 0);
        } else {
            MotorSpeed(Motors.M3, 0);
            MotorSpeed(Motors.M4, 0);
        }
    }


	/**
    * Execute bitrover rotate
     * @param index ; eg: DirRotate.left
	 * @param speed [-255-255]; eg: 100
	*/
    //% blockId=BitRover_rotate block="rotate |%index|speed %speed|"
    //% index eg: DirRotate.left
    //% speed eg: 100
    //% weight=40 blockGap=8
    //% speed.min=-255 speed.max=255 eg: 100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% group="BitRover"
    export function Rotate(index: DirRotate, speed: number): void {
        if (index == DirRotate.left) {
            MotorSpeed(Motors.M1, -speed);
            MotorSpeed(Motors.M2, -speed);
            MotorSpeed(Motors.M3, speed);
            MotorSpeed(Motors.M4, speed);
        }
        else {
            MotorSpeed(Motors.M1, speed);
            MotorSpeed(Motors.M2, speed);
            MotorSpeed(Motors.M3, -speed);
            MotorSpeed(Motors.M4, -speed);
        }
    }

	/**
    * Execute bitrover rotate
     * @param index ; eg: DirRotate.left
	 * @param speed [-255-255]; eg: 100
	 * @param time dalay second time; eg: 1
	*/
    //% blockId=BitRover_Rotate_time block="rotate |%index|speed %speed|for %time|second"
    //% speed eg: 100
    //% weight=30 blockGap=8
    //% speed.min=-255 speed.max=255 eg: 100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=2
    //% group="BitRover"
    export function Rotate_time(index: DirRotate, speed: number, time: number): void {
        Rotate(index, speed);
        basic.pause(time * 1000);
        StopAllMotor();
    }




    /**
       * set the motor Run
       * @param index ; eg: Dir.forward
       * @param speed [-255-255]； eg:100
    */
    //% blockId=BitRover_run
    //% block="translate |%index|speed %speed"
    //% index eg: Dir.forward
    //% speed eg: 100
    //% speed.min=-255 speed.max=255 eg: 100
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=3
    //% weight=70 blockGap=8
    //% group="BitRover" 
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
            case Dir.left:
                MotorSpeed(Motors.M1, -speed);
                MotorSpeed(Motors.M2, speed);
                MotorSpeed(Motors.M3, speed);
                MotorSpeed(Motors.M4, -speed);
                break;
            case Dir.right:
                MotorSpeed(Motors.M1, speed);
                MotorSpeed(Motors.M2, -speed);
                MotorSpeed(Motors.M3, -speed);
                MotorSpeed(Motors.M4, speed);
                break;
            case Dir.upleft:
                MotorSpeed(Motors.M1, 35);
                MotorSpeed(Motors.M2, speed);
                MotorSpeed(Motors.M3, speed);
                MotorSpeed(Motors.M4, 35);
                break;
            case Dir.upright:
                MotorSpeed(Motors.M1, speed);
                MotorSpeed(Motors.M2, 35);
                MotorSpeed(Motors.M3, 35);
                MotorSpeed(Motors.M4, speed);
                break;
            case Dir.downleft:
                MotorSpeed(Motors.M1, -speed);
                MotorSpeed(Motors.M2, -35);
                MotorSpeed(Motors.M3, -35);
                MotorSpeed(Motors.M4, -speed);
                break;
            case Dir.downright:
                MotorSpeed(Motors.M1, -35);
                MotorSpeed(Motors.M2, -speed);
                MotorSpeed(Motors.M3, -speed);
                MotorSpeed(Motors.M4, -35);
                break;
            case Dir.stop:
                MotorSpeed(Motors.M1, 0);
                MotorSpeed(Motors.M2, 0);
                MotorSpeed(Motors.M3, 0);
                MotorSpeed(Motors.M4, 0);
                break;
        }
    }

	/**
    * Execute single motors 
     * @param index ; eg: Dir.forward
	 * @param speed [-255-255]; eg: 100
	 * @param time dalay second time; eg: 1
	*/
    //% blockId=BitRover_run_delay block="translate |%index|speed %speed|for %time|second"
    //% index eg: Dir.forward
    //% speed eg: 100
    //% speed.min=-255 speed.max=255 eg: 100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=3
    //% weight=50 blockGap=8
    //% group="BitRover"
    export function RunDelay(index: Dir, speed: number, time: number): void {
        Run(index, speed);
        basic.pause(time * 1000);
        StopAllMotor();
    }

}
