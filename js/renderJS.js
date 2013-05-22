(function (window, undefined) { // window == context
    var renderJS = function ctor() {
        this._id = 0;

        this._subs = {};
    };

    // event object......................................................................
    renderJS.prototype._create_event_handler = function event_handler_closure(event, fun) {
        var event_handler = function () {
            this.event = event;
            this.active = true;

            this.call_count = 0;
            this.call_limit = undefined;

            this.last_called = 0;
            this.delay = 0;

            this.do_once = false;

            this._inner_call = fun;

            // guards the actual function parameter
            this.call = function (args) {
                if (this.active && this._inner_call) {
                    var now = window.performance.now();
                    if (now - this.last_called < delay) return this.active;

                    var result = this._inner_call(args);
                    this.last_called = window.performance.now();
                    this.call_count += 1;

                    if (this.callback) {
                        this.callback(result);
                    };

                    // check for 'finished' condition
                    if (this.call_limit) {
                        if (this.call_count >= this.call_limit) {
                            this.active = false;
                        }
                    }

                    if (this.do_once) {
                        this.active = false;
                    }
                }

                return this.active;
            };

            this.callback = undefined; // callback recieved the result of event.call
        };

        return new event_handler();
    };

    renderJS.prototype._remove_event_handler = function (event) {
        var event_name = event.event;
        if (this._subs.hasOwnProperty(event_name)) {
            var index = this._subs[event_name].indexOf(event);

            if(index >= 0) this._subs[event_name].splice(index, 1);
        };
    };

    // standard on event, returns the event handler
    renderJS.prototype.on = function (event, func) {
        if (!this._subs.hasOwnProperty(event)) {
            this._subs['event'] = [];   // add an array for handlers
        }

        var handler = this._create_event_handler(event, fun);
        this._subs.push(handler);
        return handler;
    };

    renderJS.prototype.emit = function (event, args) {
        if (this._subs.hasOwnProperty(event)) {
            var toRemove = [];

            this._subs[event].forEach(function (event) {
                if (event.call(args)) toRemove.push(event);
            });

            toRemove.forEach(function (event) {
                this._remove_event_handler(event);
            });
        }
    };

    // the view object...................................................................
    renderJS.prototype.create_view = function view_closure(element_name, context_type) {
        var view = function ctor(element_name, context_type) {
            this._element = undefined;
            this._context = undefined;

            this.element_name = element_name;
            this.context_type = context_type;

            this.input = function () {
                this.on_mouse_move = undefined;
                this.on_mouse_down = undefined;
                this.on_mouse_up = undefined;

                this.on_key_down = undefined;
                this.on_key_up = undefined;
                this.on_key_press = undefined;
            };
        };

        view.prototype._setup = function () {
            if (this._element) {
                var self = this;    // save this context

                // size element, initially
                this._element.width = window.innerWidth;
                this._element.height = window.innerHeight;

                // input hooks
                this._element.onmousemove = function (e) {
                    if (self.input.on_mouse_move) {
                        var coords = self.window_to_view_coords(e.clientX, e.clientY);
                        self.input.on_mouse_move(coords);
                    }
                };

                this._element.onmousedown = function (e) {
                    if (self.input.on_mouse_down) {
                        var coords = self.window_to_view_coords(e.clientX, e.clientY);
                        self.input.on_mouse_down(coords);
                    }
                };

                // TODO -- hook more!
            };
        };

        // view element methods
        view.prototype.get_element_id = function () {
            return element_name;
        };

        view.prototype.get_element = function () {
            if (this._element === undefined) {
                this._element = window.document.getElementById(this.element_name);
                this._setup();
            };

            return this._element;
        };

        // view context methods
        view.prototype.get_context = function () {
            if (this._context === undefined) {
                this._context = this.get_element().getContext(this.context_type);
            };

            return this._context;
        };

        view.prototype.get_type = function () {
            return this.context_type;
        };

        view.prototype.window_to_view_coords = function (x, y) {
            var canvas = this.get_element();
            var rect = canvas.getBoundingClientRect();

            return {
                x: x - rect.left * (canvas.width / rect.width),
                y: y - rect.top * (canvas.height / rect.height)
            };
        };

        return new view(element_name, context_type);
    };

    // drawing pens and fonts............................................................
    renderJS.prototype.create_font = function(name, size, fillstyle, strokestyle, align, baseline) {
        var font = function() {
            this.font = size + "pt " + name;
            this.fillStyle = fillstyle;
            this.strokeStyle = strokestyle;

            this.textAlign = align || 'left';
            this.textBaseline = baseline || 'top';
        };

        return new font();
    };

    renderJS.prototype.create_pen = function (size, fillstyle, strokestyle) {
        var pen = function () {
            this.lineWidth = size;
            this.fillStyle = fillstyle || undefined;
            this.strokeStyle = strokestyle || 'black';
        };

        return new pen();
    }

    // render functions..................................................................
    renderJS.prototype.textsize = function (view, model) {
        var context = view.get_context(),
            result;

        context.save();

        context.font = model.font;
        result = context.measureText(model.text).width;

        context.restore();

        return result;
    };

    renderJS.prototype.text = function (view, text, font, position) {
        var context = view.get_context();
        context.save();

        context.font = font.font;
        context.fillStyle = font.fillStyle;
        context.strokeStyle = font.strokeStyle;

        context.textAlign = font.textAlign;
        context.textBaseline = font.textBaseline;

        context.fillText(text, position.x, position.y);
        context.strokeText(text, position.x, position.y);

        context.restore();
    };

    renderJS.prototype.circle_text = function (view, text, font, position, radius, start_angle, stop_angle) {
        var context = view.get_context(),
            length = text.length,
            angle_decrement = Math.min((start_angle - stop_angle) / (length - 1), 0.4),
            angle = parseFloat(start_angle),
            index = 0,
            character;

        context.save();

        context.font = font.font;
        context.fillStyle = font.fillStyle;
        context.strokeStyle = font.strokeStyle;

        context.textAlign = 'center';
        context.textBaseline = 'middle';

        while (index < length) {
            character = text.charAt(index);

            context.save();
            context.beginPath();

            context.translate(position.x + Math.cos(angle) * radius,
                              position.y - Math.sin(angle) * radius);
            context.rotate(Math.PI/2 - angle);

            context.fillText(character, 0, 0);
            context.strokeText(character, 0, 0);

            context.restore();

            angle -= angle_decrement;
            index = index + 1;
        }

        context.restore();
    };

    renderJS.prototype.circle = function (view, pen, position, radius) {
        var context = view.get_context();
        context.save();

        context.lineWidth = pen.lineWidth;
        if (pen.fillStyle) context.fillStyle = pen.fillStyle;
        context.strokeStyle = pen.strokeStyle;

        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2, true);
        context.stroke();

        if (pen.fillStyle) context.fill();

        context.restore();
    };

    renderJS.prototype.rect = function (view, pen, top_left, bot_right) {
        var context = view.get_context();
        context.save();

        context.lineWidth = pen.lineWidth;
        if (pen.fillStyle) context.fillStyle = pen.fillStyle;
        context.strokeStyle = pen.strokeStyle;

        context.beginPath();
        context.moveTo(top_left.x, top_left.y);
        context.lineTo(bot_right.x, top_left.y);
        context.lineTo(bot_right.x, bot_right.y);
        context.lineTo(top_left.x, bot_right.y);

        context.closePath();

        if (pen.fillStyle) context.fill();

        context.restore();
    };

    renderJS.prototype.triangle = function (view, pen, a, b, c) {
        var context = view.get_context();
        context.save();

        context.lineWidth = pen.lineWidth;
        if (pen.fillStyle) context.fillStyle = pen.fillStyle;
        context.strokeStyle = pen.strokeStyle;

        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.lineTo(c.x, c.y);

        context.closePath();

        if (pen.fillStyle) context.fill();

        context.restore();
    };

    window.renderJS = new renderJS();
})(this);
