// logic/PIDController.js
class PIDController {
    constructor(kp, ki, kd, setpoint, integralMax = 50) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.setpoint = setpoint;
        this.integral = 0;
        this.previousError = 0;
        this.lastTime = Date.now();
        this.integralMax = integralMax;
    }

    update(currentValue) {
        let dt = (Date.now() - this.lastTime) / 1000;
        if (dt <= 0) return 0;
        dt = Math.min(dt, 2.0); // Обмеження dt для стабільності

        const error = this.setpoint - currentValue;

        // Скидання інтеграла при перетині нульової помилки для зменшення перерегулювання
        if (Math.sign(error) !== Math.sign(this.previousError)) {
            this.integral = 0;
        }

        this.integral += error * dt;
        this.integral = Math.max(-this.integralMax, Math.min(this.integral, this.integralMax));

        const derivative = (error - this.previousError) / dt;

        this.previousError = error;
        this.lastTime = Date.now();

        return this.kp * error + this.ki * this.integral + this.kd * derivative;
    }

    reset() {
        this.integral = 0;
        this.previousError = 0;
        this.lastTime = Date.now();
    }
}

module.exports = PIDController;
