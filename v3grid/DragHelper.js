define('v3grid/DragHelper', ['v3grid/Adapter'], function (Adapter) {
    var emptyFn = Adapter.emptyFn,
        addListener = Adapter.addListener,
        removeListener = Adapter.removeListener;

    var DragHelper = function (config) {
        Adapter.merge(this, config);

        if (Adapter.hasTouch) {
            addListener(this.element, 'touchstart', this.onMouseDown, this);
        } else {
            addListener(this.element, 'mousedown', this.onMouseDown, this);
        }

        this.eventElement = this.captureMouse ? document.body : this.element;
        addListener(this.element, 'click', this.preventClick, this, true);
    };

    DragHelper.prototype = {
        // public properties
        endDragOnLeave: true,
        startDragOnDown: false,
        tolerance: 5,
        dragMove: emptyFn,
        dragStart: emptyFn,
        dragEnd: emptyFn,
        scope: window,
        captureMouse: false,

        isDragging: false,
        tangent:    Math.tan(22.5/180*Math.PI),

        // destroy() ??

        onMouseDown: function (evt) {
            Adapter.fixPageCoords(evt);

            this.lastX = evt.pageX;
            this.lastY = evt.pageY;

//        console.log('[DH]mdown ', this.lastX);

            addListener(this.eventElement, 'mouseup', this.onMouseUp, this);
            addListener(this.eventElement, 'mousemove', this.onMouseMove, this);
            addListener(this.eventElement, 'mouseleave', this.onMouseLeave, this);

            if (Adapter.hasTouch) {
                addListener(this.eventElement, 'touchend', this.onMouseUp, this);
                addListener(this.eventElement, 'touchmove', this.onMouseMove, this);
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

            removeListener(this.eventElement, 'mouseup', this.onMouseUp, this);
            removeListener(this.eventElement, 'mousemove', this.onMouseMove, this);
            removeListener(this.eventElement, 'mouseleave', this.onMouseLeave, this);

            if (Adapter.hasTouch) {
                removeListener(this.eventElement, 'touchend', this.onMouseUp, this);
                removeListener(this.eventElement, 'touchmove', this.onMouseMove, this);
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
                y = evt.pageY, ly = this.lastY;

            if (this.isDragging) {
//            console.log('[DH]dragging', lx, x);
                var dx = x - lx, dy = y - ly;
                if (Adapter.hasTouch)
                {
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
                if (x - lx > t || lx - x > t || y - ly > t || ly - y > t) {
//                console.log('[DH]tolerance reached', lx, x);
                    if (this.dragStart.call(this.scope, this.downEvt) === false) {
                        this.onMouseUp(evt);
                        return;
                    }
                    this.isDragging = true;
                    var dx = x - lx, dy = y - ly;

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

    }

    return DragHelper;
});
