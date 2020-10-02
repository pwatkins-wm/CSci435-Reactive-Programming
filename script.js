////////////////////////////////////////////////////////////////////////////////////////////////////
// CONSTANTS ///////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

let SCREEN_WIDTH = 800;
let SCREEN_HEIGHT = 500;

let PADDLE_WIDTH = 6;
let PADDLE_HEIGHT = 46;
let PADDLE_OFFSET = 5;
let PADDLE_VELOCITY = 0.38;

let BALL_RADIUS = 3.5;
let BALL_VELOCITY = 0.69;

let GOAL_LINE = SCREEN_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;


////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP ///////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// get the canvas element which will become the game screen and set ups its canvas context
let screen = document.getElementById("screen");
let screen_context = screen.getContext("2d");

// set the screen's dimensions
screen.width = SCREEN_WIDTH;
screen.height = SCREEN_HEIGHT;
screen.style.width = SCREEN_WIDTH + "px";
screen.style.height = SCREEN_HEIGHT + "px";


////////////////////////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// draw the paddle and ball
function render() {

    // clear the screen
    screen_context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    screen_context.strokeStyle = "#ffffff";
    screen_context.fillStyle = "#ffffff";

    // draw the paddle
    screen_context.fillRect(GOAL_LINE, paddle_state.position, PADDLE_WIDTH, PADDLE_HEIGHT);

    // draw the ball
    screen_context.beginPath();
    screen_context.arc(ball_state.position.x, ball_state.position.y, BALL_RADIUS, 0, Math.PI * 2);
    screen_context.fill();
}

// given two times, t1 and t2 (t1 is earlier), x and y positions at t1, and x and y velocities at
// t1, extrapolate and return the x and y positions at t2.
function extrapolate_position(t1, t2, x, y, vx, vy) {
    dt = t2 - t1;
    return {
        x: x + vx * dt,
        y: y + vy * dt
    };
}

// return a value such that the ranges [x1, value, x2] and [t_lower, t, t_upper] are scalarly
// similar. e.g. given x1 = 0, x2 = 10, t_lower = 50, t_upper = 100, t = 75, the value 5 would be
// returned.
function interpolate(x1, x2, t_lower, t_upper, t) {
    let range = t_upper - t_lower;
    // check for possible division by 0
    if (range === 0)
        range = 0.00001;
    return (x2 - x1) * (t - t_lower) / range + x1;
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// BALL AND PADDLE OBJECTS /////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// object to hold the state (position, velocity, and last updated timestamp) of the ball. Also
// contains methods for updating and resetting the ball's state.
ball_state = {

    timestamp: 0, // time at which the state has last updated
    position: {x: 0, y: 0}, // position at timestamp
    velocity: {x: 0, y: 0}, // velocity at timestamp

    // given a timestamp t, update the ball's state values
    update: function(t) {

        // determine the position the ball should be at, but don't assign it to the ball yet because
        // it could be out of bounds.
        let new_position = extrapolate_position(
            this.timestamp, t, this.position.x, this.position.y, this.velocity.x, this.velocity.y
        );

        // handle collisions
        // left wall
        if (new_position.x - BALL_RADIUS < 0) {
            new_x = BALL_RADIUS;
            new_position.y = interpolate(
                this.position.y, new_position.y, this.position.x, new_position.x, new_x
            );
            new_position.x = new_x;
            if (this.velocity.x < 0)
                this.velocity.x *= -1;

        // right wall -- this is the wall which the paddle is on
        } else if (new_position.x + BALL_RADIUS > GOAL_LINE) {

            new_x = GOAL_LINE - BALL_RADIUS;
            new_y = interpolate(
                this.position.y, new_position.y, this.position.x, new_position.x, new_x
            );

            // determine if the ball made contact with the paddle
            if (new_y >= paddle_state.position && new_y <= paddle_state.position + PADDLE_HEIGHT) {
                new_position.x = new_x;
                new_position.y = new_y;
                if (this.velocity.x > 0)
                    this.velocity.x *= -1;
            } else {
                // the paddle failed to make contact -- reset the ball
                this.reset();
                return;
            }

        // top wall
        } else if (new_position.y - BALL_RADIUS < 0) {
            new_y = BALL_RADIUS;
            new_position.x = interpolate(
                this.position.x, new_position.x, this.position.y, new_position.y, new_y
            );
            new_position.y = new_y;
            if (this.velocity.y < 0)
                this.velocity.y *= -1;
        
        // bottom wall
        } else if (new_position.y + BALL_RADIUS > SCREEN_HEIGHT) {
            new_y = SCREEN_HEIGHT - BALL_RADIUS;
            new_position.x = interpolate(
                this.position.x, new_position.x, this.position.y, new_position.y, new_y
            );
            new_position.y = new_y;
            if (this.velocity.y > 0)
                this.velocity.y *= -1;
        }

        // update state values
        this.position = new_position;
        this.timestamp = t;

        // if the ball's velocity is 0, then reset; this only happens just when the webpage opens
        if (this.velocity.x === 0 && this.velocity.y === 0)
            this.reset();
    },

    // reset the ball to the left side of the screen and give it a random velocity toward the right
    reset: function() {

        this.position.x = 50;
        this.position.y = Math.random() * SCREEN_HEIGHT * 0.75 + SCREEN_HEIGHT * 0.125;

        let angle = (Math.random() * 15 + 40) * Math.PI / 180 * (Math.random() > 0.5 ? 1 : -1);
        this.velocity.x = Math.cos(angle) * BALL_VELOCITY;
        this.velocity.y = Math.sin(angle) * BALL_VELOCITY;
    }
};

// object to hold the state (position, velocity, and last updated timestamp) of the paddle. Also
// contains a method to update the paddle's state. Note that the paddle's x position is always
// fixed, so it is not stored here.
paddle_state = {

    timestamp: 0, // time which the state was last updated
    position: SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2, // y position of paddle at timestamp
    velocity: 0, // velocity of paddle at timestamp

    // given a timestamp and optionally a new velocity, update the state of the paddle
    update: function(t, v = this.velocity) {

        // determine the paddle's new position
        this.position = extrapolate_position(
            this.timestamp, t, null, this.position, null, this.velocity
        ).y;
        this.timestamp = t;
        this.velocity = v;

        // keep the paddle in bounds
        if (this.position < 0)
            this.position = 0;
        else if (this.position + PADDLE_HEIGHT > SCREEN_HEIGHT)
            this.position = SCREEN_HEIGHT - PADDLE_HEIGHT;
    }
};


////////////////////////////////////////////////////////////////////////////////////////////////////
// REACTIVE CODE GOES HERE /////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// stream which emits keydown events from the up and down arrow keys
let keydown_stream = rxjs.fromEvent(document, "keydown").pipe(
    rxjs.operators.filter(x => x.code === "ArrowUp" || x.code === "ArrowDown"),
    rxjs.operators.map(x => x.code === "ArrowUp" ? "UpPressed" : "DownPressed")
)

// stream which emits keyup events from the up and down arrow keys
let keyup_stream = rxjs.fromEvent(document, "keyup").pipe(
    rxjs.operators.filter(x => x.code === "ArrowUp" || x.code === "ArrowDown"),
    rxjs.operators.map(x => x.code === "ArrowUp" ? "UpReleased" : "DownReleased")
)

// merge the keydown and keyup streams to emit values that can be used in determining what the
// paddle's velocity should be
let key_stream = rxjs.merge(keydown_stream, keyup_stream).pipe(
    rxjs.operators.distinctUntilChanged(),
    rxjs.operators.startWith([0, 0]),
    rxjs.operators.scan((acc, x) => {
        switch (x) {
            case "UpPressed":    return [1, acc[1]];
            case "UpReleased":   return [0, acc[1]];
            case "DownPressed":  return [acc[0], 1];
            case "DownReleased": return [acc[0], 0];
            default:             return acc;
        }
    }),
    rxjs.operators.timestamp()
)

// act on the emitted values from key_stream to update the paddle's velocity
key_stream.subscribe(x => {
    paddle_state.update(x.timestamp, (x.value[1] - x.value[0]) * PADDLE_VELOCITY);
});

// schedule a job to occur every time the browser is ready to repaint the screen
rxjs.animationFrameScheduler.schedule(function() {

    timestamp = Date.now();

    // update the objects' states and draw them
    paddle_state.update(timestamp);
    ball_state.update(timestamp);
    render();

    // schedule the next rendering
    this.schedule();

}, 0, 0);