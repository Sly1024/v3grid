Ext.define('TextItemRenderer', {

    constructor: function (columnIndex) {
        this.renderer = document.createTextNode('');
        this.callParent(arguments);
    },

    getElement: function () {
        return this.renderer;
    },

    setData: function (data) {
        this.renderer.nodeValue = data ? data.toString() : '';
        this.renderer.parentNode.style.textAlign = data < 0 ? 'left' : 'right';
        this.renderer.parentNode.style.color = data < 0 ? '#cf5555' : '#55cf55';
    }

});

Ext.define('CheckBoxItemRenderer', {
    constructor: function (columnIndex) {
        this.renderer = document.createElement('input');
        this.renderer.type = 'checkbox';
//        this.renderer.disabled = 'disabled';
        this.renderer.onclick = this.renderer.onkeydown = function () { return false;};
        this.callParent(arguments);
    },

    getElement: function () {
        return this.renderer;
    },

    setData: function (data) {
        this.renderer.checked = data > 0;
    }
});

Ext.define('ButtonItemRenderer', {
    constructor: function (columnIndex) {
        this.renderer = document.createElement('input');
        this.renderer.type = 'button';
        this.renderer.style.minWidth = '50px';
        this.renderer.style.height = '20px';
        this.callParent(arguments);
    },

    getElement: function () {
        return this.renderer;
    },

    setData: function (data) {
        this.renderer.value = data;
    }
});

Ext.onReady(function () {
    var body = document.getElementById("div");
    var textSpan = document.getElementById("textspan");

    document.getElementById("button").onclick = button_click;

    function newDiv(id) {
        var e = document.createElement('div');
        e.id = id;
        return e;
    }

    function getScrollBarWidth () {
        var inner = document.createElement('p');
        inner.style.width = "100%";
        inner.style.height = "200px";

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

        return (w1 - w2);
    }

    var running = false;
    var updater_id;
    function button_click() {
        if (running) {
            clearTimeout(updater_id);
        } else {
            updater_id = setTimeout(update, 0);
        }
        running = !running;
    }

    var lastUpdate = 0;
    var current = 0;
    var updateBatch = 10000;
    function update() {
        for (var i=0; i<updateBatch; ++i)  {
            var idx = Math.floor(Math.random() * columns * rows);
            var cidx = idx % columns;
            var ridx = idx / columns >> 0;
            setData(ridx, cidx, Math.floor((Math.random() - 0.5)*10000));
//            if (Math.random() < 0.5)  ++current; else --current;
        }
        var t = +new Date();
        var elaps = t - lastUpdate;
        textSpan.firstChild.nodeValue = elaps + ' ms - ' + Math.floor(1000*updateBatch/elaps) + ' upd/sec';
        lastUpdate = t;
        if (running) updater_id = setTimeout(update, 10);
    }

    function rollover(evt) {
        evt.currentTarget.style.backgroundColor = '#c0d0f0';
    }

    function rollout(evt) {
        evt.currentTarget.style.backgroundColor = '#ffffff';
    }


    var viewDirty = false;

    function initDataCells() {
        allcells = new Array(rows);
        for (var r = 0; r<rows; ++r) {
            allcells[r] = new Array(columns);
            for (c = 0; c<columns; ++c) allcells[r][c] = { data:null, dataAsString:'', dirty:false };
        }
    }

    var viewUpdaterID = -1;

    function runUpdater() {
        if (viewUpdaterID >= 0) return;
        viewUpdaterID = setInterval(viewUpdater, 20);
    }

    function viewUpdater() {
        if (viewDirty) {
            updateVisibleRows(false);
        } else {
            clearInterval(viewUpdaterID);
            viewUpdaterID = -1;
        }
    }

    function setData(row, col, data) {
        var old = allcells[row][col].data;
        if (old !== data)  {
            allcells[row][col].data = data;
            allcells[row][col].dirty = true;
            viewDirty = true;
            runUpdater();
        }
    }

    var visibleRowOffset = 0;

    function gridWheel(evt) {
        var delta = evt.hasOwnProperty('wheelDeltaY') ? evt.wheelDeltaY : evt.wheelDelta;
        scroller.scrollTop -= delta;
    }

    function vscrolled() {
        visibleRowOffset = Math.floor(scroller.scrollTop * rows / scroller.scrollHeight);
        updateVisibleRows(true);
    }

    function updateVisibleRows(allCells) {

        for (var vr= 0, r=visibleRowOffset; vr<visibleRows; ++vr, ++r) {
            for (var c=0; c<columns; ++c) {
                var cellObj = allcells[r][c];
                if (cellObj.dirty || allCells) {
                    visibleCells[vr][c].setData(cellObj.data);
                    cellObj.dirty = false;
                }
            }
        }
        viewDirty = false;
    }

    var scroller;

    function initScroller() {
        scroller = newDiv('scroller');
        scroller.style.width = scrollBarWidth+'px';
        scroller.style.height = visibleRowsHeight+'px';
        scroller.style.position = 'absolute';
        scroller.style.top = headerHeight+'px';
        scroller.style.right = '0px';
        scroller.style.overflow = 'scroll';
        scroller.onscroll = vscrolled;

        var innerScroller = newDiv('innerScroller');
        innerScroller.style.width = '1px';
        innerScroller.style.height = totalHeight + 'px';
        scroller.appendChild(innerScroller);
    }

    var columns = 100;
    var rows = 100000;
    var columnWidth = 100;
    var rowHeight = 22;
    var gridWidth = 900;
    var gridHeight = 710;
    var scrollBarWidth = getScrollBarWidth();
    var headerHeight = 22;

    // calculated values
    var visibleRowsWidth = gridWidth - scrollBarWidth;
    var visibleRowsHeight = gridHeight - headerHeight - scrollBarWidth;
    var visibleRows = Math.floor(visibleRowsHeight / rowHeight);
    var totalWidth = columns * columnWidth;
    var totalHeight = rows * rowHeight;

    // correct gridHeight:
//    gridHeight = visibleRows * rowHeight + scrollBarWidth;

    var allcells;
    initDataCells();

    var panel = newDiv('gridpanel');
    panel.style.width = gridWidth+'px';
    panel.style.height = gridHeight+'px';
    panel.style.position = 'relative';
    panel.style.overflow = 'hidden';
    panel.style.border = '1px solid gray';

    initScroller();
    panel.appendChild(scroller);

    var headerContainer = newDiv('headerContainer');
    headerContainer.style.width = (gridWidth - scrollBarWidth)+'px';
    headerContainer.style.height = headerHeight+'px';

    // fill up header cells
    for (var c=0; c<columns; ++c) {
        var header = newDiv();
        header.appendChild(document.createTextNode('Column '+c));
        header.style.width = columnWidth+'px';
        header.style.height = headerHeight+'px';
        header.style.position = 'absolute';
        header.style.left = (c * columnWidth)+'px';
        header.style.textAlign = 'center';
        headerContainer.appendChild(header);
    }

    panel.appendChild(headerContainer);

    var tableContainer = newDiv('tableContainer');
    tableContainer.style.position = 'absolute';
    tableContainer.style.width = visibleRowsWidth+'px';
    tableContainer.style.height = (gridHeight-headerHeight) + 'px';
    tableContainer.style.overflow = 'auto';
    tableContainer.style.top = headerHeight+'px';

    var table = newDiv('table');
    table.style.position = 'absolute';
    table.style.width = totalWidth+'px';
    table.style.height = visibleRowsHeight+'px';
    table.style.overflow = 'visible';
    table.onmousewheel = gridWheel;

    tableContainer.appendChild(table);

    var visibleCells = new Array(visibleRows);

    for (var r = 0; r < visibleRows; ++r) {

        var trow = newDiv();
        trow.style.position = 'absolute';
        trow.style.top = (r * rowHeight)+'px';
        trow.style.width = totalWidth +'px';
        trow.style.height = rowHeight + 'px';
        trow.style.backgroundColor = '#ffffff';
        trow.onmouseover = rollover;
        trow.onmouseout = rollout;

        visibleCells[r] = new Array(columns);

        for (var c = 0; c < columns; ++c) {
            var cell = newDiv();
            cell.style.mozUserSelect = 'none';
            cell.style.webkitUserSelect = 'none';
            cell.style.userSelect = 'none';
            cell.style.msUserSelect = 'none';
            cell.onselectstart = function () { return false; };

            var renderer = c % 5 == 0 ? new CheckBoxItemRenderer(c) :
                c % 5 == 3 ? new ButtonItemRenderer(c) : new TextItemRenderer(c);

            cell.appendChild(renderer.getElement());
            cell.style.width = (columnWidth ) + 'px';
            cell.style.height = (rowHeight ) + 'px';
            cell.style.position = 'absolute';
            cell.style.left = (c * columnWidth)+'px';
            cell.style.top = '0px';
//            cell.style.textAlign = 'right';
            cell.style.borderColor = 'lightgrey';
            cell.style.borderStyle = 'solid';
            cell.style.borderWidth = '1px 0px 0px 1px';

//            cell.style.verticalAlign = 'bottom';

            visibleCells[r][c] = renderer;

            trow.appendChild(cell);
        }
        table.appendChild(trow);
    }

    panel.appendChild(tableContainer);
    body.appendChild(panel);

});