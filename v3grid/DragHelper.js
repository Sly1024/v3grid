ClassDef('v3grid.DragHelper', ['v3grid.Adapter'], function (Adapter) {
    var emptyFn = Adapter.emptyFn;
    return {
        // public properties
        endDragOnLeave: true,
        startDragOnDown: false,
        tolerance: 5,
        dragStart: emptyFn,
        dragMove: emptyFn,
        dragEnd: emptyFn,
        scope: window,
        captureMouse: false,

        isDragging: false,
//        tangent:    Math.tan(22.5/180*Math.PI),

        ctor: function DragHelper(config) {
            Adapter.merge(this, config);

            if (Adapter.hasTouch) {
                Adapter.addListener(this.element, 'touchstart', this.onMouseDown, this);
            } else {
                Adapter.addListener(this.element, 'mousedown', this.onMouseDown, this);
            }

            this.eventElement = this.captureMouse ? document.body : this.element;
            Adapter.addListener(this.element, 'click', this.preventClick, this, true);
        },

        // destroy() ??

        onMouseDown: function (evt) {
            Adapter.fixPageCoords(evt);

            this.lastX = evt.pageX;
            this.lastY = evt.pageY;

//        console.log('[DH]mdown ', this.lastX);

            var evtEl = this.eventElement;

            if (Adapter.hasTouch) {
                Adapter.addListener(evtEl, 'touchend', this.onMouseUp, this);
                Adapter.addListener(evtEl, 'touchmove', this.onMouseMove, this);
            } else {
                Adapter.addListener(evtEl, 'mouseup', this.onMouseUp, this);
                Adapter.addListener(evtEl, 'mousemove', this.onMouseMove, this);
                Adapter.addListener(evtEl, 'mouseleave', this.onMouseLeave, this);
            }

            if (this.startDragOnDown) {
                this.isDragging = true;
                this.dragStart.call(this.scope, evt);
                this.firstX = evt.pageX;
                this.firstY = evt.pageY;
            } else {
                this.downEvt = evt;
            }
        },

        preventClick: function (evt) {
//            console.log('preventClick');
            var wd = this.wasDragging;
            this.wasDragging = false;

            if (wd) {
                if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
                return false;
            }
        },

        onMouseUp: function (evt) {
//            console.log('mouseUp');
            Adapter.fixPageCoords(evt);

            var evtEl = this.eventElement;
            if (Adapter.hasTouch) {
                Adapter.removeListener(evtEl, 'touchend', this.onMouseUp, this);
                Adapter.removeListener(evtEl, 'touchmove', this.onMouseMove, this);
            } else {
                Adapter.removeListener(evtEl, 'mouseup', this.onMouseUp, this);
                Adapter.removeListener(evtEl, 'mousemove', this.onMouseMove, this);
                Adapter.removeListener(evtEl, 'mouseleave', this.onMouseLeave, this);
            }

            this.wasDragging = this.isDragging;

            if (this.isDragging) {
                this.isDragging = false;
                this.dragEnd.call(this.scope, evt);
            }
        },

        onMouseLeave: function (evt) {
            if (this.endDragOnLeave) this.onMouseUp(evt);
        },

        onMouseMove: function (evt) {
            Adapter.fixPageCoords(evt);

            var x = evt.pageX, lx = this.lastX,
                y = evt.pageY, ly = this.lastY,
                dx = x - lx, dy = y - ly;

            if (this.isDragging) {
//            console.log('[DH]dragging', lx, x);
                if (Adapter.hasTouch) {
                    var adx = Math.abs(x - this.firstX);
                    var ady = Math.abs(y - this.firstY);
                    if (adx > ady*2) {
                        dy = 0;
                    } else if (ady > adx*2) {
                        dx = 0;
                    }
                }

                this.dragMove.call(this.scope, dx, dy, evt);
                this.lastX = x;
                this.lastY = y;
            } else {
                var t = this.tolerance;
                if (dx > t || -dx > t || dy > t || -dy > t) {
//                console.log('[DH]tolerance reached', lx, x);
                    if (this.dragStart.call(this.scope, this.downEvt) === false) {
                        this.onMouseUp(evt);
                        return;
                    }
                    this.isDragging = true;

                    this.dragMove.call(this.scope, dx, dy, evt);
                    this.lastX = x;
                    this.lastY = y;
                    this.firstX = x;
                    this.firstY = y;
                }
            }

            if (evt.preventDefault) evt.preventDefault();
            return false;
        }
    };
});
