//(function () {
//    var toExecute = function () {
        define('v3grid/Scrollbar', ['v3grid/Adapter'],
            function (Adapter) {
                var Scrollbar = function (parent, orientation) {
                    var outer = document.createElement('div'),
                        inner = document.createElement('div');

                    var thicknessProp;
                    if (orientation == 'horizontal') {
                        thicknessProp = 'height';
                        this.lengthProp = 'width';
                        outer.style.overflowX = 'scroll';
                        outer.style.overflowY = 'hidden';
                    } else {
                        thicknessProp = 'width';
                        this.lengthProp = 'height';
                        outer.style.overflowX = 'hidden';
                        outer.style.overflowY = 'scroll';
                    }

                    inner.style[thicknessProp] = '1px';
                    outer.style[thicknessProp] = Scrollbar.size + 'px';
                    outer.style.position = 'absolute';
                    outer.appendChild(inner);

                    this.dom = outer;
                    parent.appendChild(outer);
                };

                Scrollbar.prototype = {
                    setProperties: function (x, y, visibleSize, scrollSize) {
                        this.dom.style.left = x + 'px';
                        this.dom.style.top = y + 'px';
                        this.dom.style[this.lengthProp] = visibleSize + 'px';
                        this.dom.firstChild.style[this.lengthProp] = scrollSize + 'px';
                    }
                };

                function getScrollBarWidth () {
                    var inner = document.createElement('p');
                    inner.style.width = "100%";
                    inner.style.height = "2000px";

                    var outer = document.createElement('div');
                    outer.style.position = "absolute";
                    outer.style.top = "0px";
                    outer.style.left = "0px";
                    outer.style.visibility = "hidden";
                    outer.style.width = "200px";
                    outer.style.height = "150px";
                    outer.style.overflow = "hidden";
                    outer.appendChild (inner);

                    document.body.appendChild (outer);
                    var w1 = inner.offsetWidth;
                    outer.style.overflow = 'scroll';
                    var w2 = inner.offsetWidth;
                    if (w1 == w2) w2 = outer.clientWidth;

                    document.body.removeChild (outer);

                    Scrollbar.size = (w1 - w2);
                }

                if (Adapter.hasTouch) {
                    Scrollbar.size = 0;
                } else if(Adapter.isIE) {
//        Adapter.addListener(document, 'load', getScrollBarWidth);
                    // TODO: ???
                    Scrollbar.size = 17;
                } else {
                    getScrollBarWidth();
                }


                return Scrollbar;
            }
        );
//    };
//    if (window.addEventListener) {
//        window.addEventListener('load', toExecute);
//    } else if (window.attachEvent) {
//        window.attachEvent('onload', toExecute);
//    } else {
//        window.onload = toExecute;
//    }
//})();
