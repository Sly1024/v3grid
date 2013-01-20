Ext.define('TextItemRenderer', {

    constructor: function () {
        this.tNode = document.createTextNode('');
        this.view = document.createElement('span');
        this.view.appendChild(this.tNode);
        this.view.style.position = 'absolute';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.tNode.nodeValue = data ? data.toString() : '';
        this.view.style.textAlign = data < 0 ? 'left' : 'right';
        this.view.style.color = data < 0 ? '#cf5555' : '#55cf55';
    }

});

Ext.define('CheckBoxItemRenderer', {
    constructor: function (columnIndex) {
        this.view = document.createElement('input');
        this.view.type = 'checkbox';
        this.view.onclick = this.view.onkeydown = function () { return false;};
        this.view.style.position = 'absolute';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.view.checked = data > 0;
    }
});

Ext.define('ButtonItemRenderer', {
    constructor: function (columnIndex) {
        this.view = document.createElement('input');
        this.view.type = 'button';
        this.view.style.position = 'absolute';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.view.value = data ? data : '';
    }
});

Ext.onReady(function () {
    var body = document.getElementById("div");
    var textSpan = document.getElementById("textspan");

    document.getElementById("button").onclick = button_click;

    function newDiv(id) {
        var e = document.createElement('div');
        if (id) e.id = id;
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


    // dirtyCells[col_row] = { col: colIdx, row: rowIdx };
    var dirtyCells = { count: 0 };

    function initDataCells() {
        cellData = new Array(rows);
        for (var r = 0; r<rows; ++r) {
            cellData[r] = new Array(columns);
        }
        headerData = new Array(columns);
        for (c = 0; c<columns; ++c) {
            headerData[c] = 'Column ' + (c+1);
        }
    }

    var viewUpdaterID = -1;

    function runUpdater() {
        if (viewUpdaterID >= 0) return;
        viewUpdaterID = setInterval(viewUpdater, 200);
    }

    function viewUpdater() {
        if (dirtyCells.count > 0) {
            updateView(false, false);
        } else {
            clearInterval(viewUpdaterID);
            viewUpdaterID = -1;
        }
    }

    function invalidateData(row, col) {
        var vrow = row - visibleRowOffset;
        var vcol = col - visibleColumnOffset;
        var key = col+'_'+row;

        if (vrow >= 0 && vrow < visibleRowCount &&
            vcol >= 0 && vcol < visibleColumnCount &&
            !dirtyCells.hasOwnProperty(key)) {
            dirtyCells[key] = { col: col, row: row};
            ++dirtyCells.count;
            runUpdater();
        }
    }

    function setData(row, col, data) {
        var old = cellData[row][col];
        if (old !== data)  {
            cellData[row][col] = data;
            invalidateData(row, col);
        }
    }

    var visibleRowOffset = 0;
    var visibleColumnOffset = 0;

    function gridWheel(evt) {
        if (evt.hasOwnProperty('wheelDeltaX') && evt.wheelDeltaX != 0) {
            hscroller.scrollLeft -= evt.wheelDeltaX;
        } else {
            vscroller.scrollTop -= evt.hasOwnProperty('wheelDeltaY') ? evt.wheelDeltaY : evt.wheelDelta;
        }
    }

    function vscrolled() {
        visibleRowOffset = Math.floor(vscroller.scrollTop * rows / vscroller.scrollHeight);
        updateView(true, false);
    }

    function hscrolled() {
        visibleColumnOffset = Math.floor(hscroller.scrollLeft * columns / hscroller.scrollWidth);
        updateView(true, true);
    }

    function updateCell(data, typeIdx, cell, renderer, style) {
        availableRenderers[typeIdx] = availableRenderers[typeIdx] || [];

        // cell has a renderer, but it's the wrong type => recycle
        if (renderer && !(renderer instanceof rendererTypes[typeIdx])) {
            var ri = 0;
            // TODO: avoid the loop !?
            while (!(renderer instanceof rendererTypes[ri])) ++ri;
            availableRenderers[ri].push(renderer);
            renderer = null;
        }

        if (!renderer) {
            if (availableRenderers[typeIdx].length == 0) {
                renderer = new rendererTypes[typeIdx]();
            } else {
                renderer = availableRenderers[typeIdx].pop();
            }
        }

        renderer.setData(data);

        Ext.apply(renderer.view.style, style);

        if (cell.firstChild !== renderer.view) {
            if (renderer.view.parentNode) renderer.view.parentNode.removeChild(renderer.view);
            if (cell.firstChild) cell.removeChild(cell.firstChild);
            cell.appendChild(renderer.view);
        }

        return renderer;
    }

    function updateView(allCells, headers) {

        var headerStyle = {
            position: 'absolute',
            width: columnWidth+'px',
            height: headerHeight+'px'
        };

        // update headers
        if (headers) {
            for (var vc=0, c=visibleColumnOffset; vc<visibleColumnCount; ++vc, ++c) {
                visibleHeaderRenderers[vc] = updateCell(headerData[c], headerIdxToRendererType[c],
                    visibleHeaders[vc], visibleHeaderRenderers[vc], headerStyle);
            }
        }

        var cellStyle = {
            position: 'absolute',
            width: columnWidth+'px',
            height: rowHeight+'px'
        };

        if (allCells) {
            for (var vc = 0, c = visibleColumnOffset; vc < visibleColumnCount; ++vc, ++c) {
                for (var vr = 0, r = visibleRowOffset; vr < visibleRowCount; ++vr, ++r) {
                    visibleRenderers[vr][vc] = updateCell(cellData[r][c], columnIdxToRendererType[c],
                        visibleCells[vr][vc], visibleRenderers[vr][vc], cellStyle);
                }
            }
        } else {
            for (var key in dirtyCells) if (dirtyCells.hasOwnProperty(key) && key != 'count') {
                var dirtyCell = dirtyCells[key];
                var c = dirtyCell.col, r = dirtyCell.row,
                    vc = c - visibleColumnOffset, vr = r - visibleRowOffset;

                if (vc >= 0 && vc < visibleColumnCount &&
                    vr >= 0 && vr < visibleRowCount) {
                    visibleRenderers[vr][vc] = updateCell(cellData[r][c], columnIdxToRendererType[c],
                        visibleCells[vr][vc], visibleRenderers[vr][vc], cellStyle);
                }
            }
        }

        dirtyCells = { count: 0 };
    }

    var vscroller, hscroller;

    function initScroller(horizontal, visible, total, top, left, onscroll) {
        var scroller = newDiv();
        var thickness = horizontal ? 'height' : 'width';
        var length = horizontal ? 'width' : 'height';

        scroller.style[thickness] = scrollBarWidth+'px';
        scroller.style[length] = (visible+scrollBarWidth)+'px';
        scroller.style.position = 'absolute';
        scroller.style.top = top+'px';
        scroller.style.left = left+'px';
        scroller.style.overflow = 'scroll';
        scroller.onscroll = onscroll;

        var innerScroller = newDiv();
        innerScroller.style[thickness] = '1px';
        innerScroller.style[length] = total + 'px';
        scroller.appendChild(innerScroller);
        return scroller;
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
    var visibleWidth = gridWidth - scrollBarWidth;
    var visibleHeight = gridHeight - headerHeight - scrollBarWidth;
    var visibleRowCount = Math.ceil(visibleHeight / rowHeight);
    var visibleColumnCount = Math.ceil(visibleWidth / columnWidth);
    var totalWidth = columns * columnWidth;
    var totalHeight = rows * rowHeight;

    // temp: fill up itemrenderers/headerRenderers for columns
    var columnRenderers = new Array(columns);
    var headerRenderers = new Array(columns);

    for (var c=0; c<columns; ++c) {
        headerRenderers[c] = columnRenderers[c] = c % 5 == 0 ? CheckBoxItemRenderer :
            c % 5 == 3 ? ButtonItemRenderer : TextItemRenderer;
    }

    // collect the different renderer types, so we can reuse them later
    var rendererTypes = [];
    var columnIdxToRendererType = [];
    var headerIdxToRendererType = [];
    for (var c=0; c<columns; ++c) {
        var idx = rendererTypes.length-1;
        while (idx >= 0 && rendererTypes[idx] !== columnRenderers[c]) --idx;
        if (idx < 0) {
            idx = rendererTypes.length;
            rendererTypes[idx] = columnRenderers[c];
        }
        columnIdxToRendererType[c] = idx;

        var idx = rendererTypes.length-1;
        while (idx >= 0 && rendererTypes[idx] !== headerRenderers[c]) --idx;
        if (idx < 0) {
            idx = rendererTypes.length;
            rendererTypes[idx] = headerRenderers[c];
        }
        headerIdxToRendererType[c] = idx;
    }

    // availableRenderers[rendererTypeIdx][idx]
    var availableRenderers = new Array(rendererTypes.length);


    var cellData, headerData;
    initDataCells();

    var panel = newDiv('gridpanel');
    panel.style.width = gridWidth+'px';
    panel.style.height = gridHeight+'px';
    panel.style.position = 'relative';
    panel.style.overflow = 'hidden';
    panel.style.border = '1px solid gray';

    vscroller = initScroller(false, visibleHeight, totalHeight, headerHeight, visibleWidth, vscrolled);
    panel.appendChild(vscroller);

    hscroller = initScroller(true, visibleWidth, totalWidth, headerHeight+visibleHeight, 0, hscrolled);
    panel.appendChild(hscroller);

    var headerContainer = newDiv('headerContainer');
    headerContainer.style.width = visibleWidth+'px';
    headerContainer.style.height = headerHeight+'px';
    headerContainer.style.position = 'absolute';
    headerContainer.style.overflow = 'hidden';

    var visibleHeaders = new Array(visibleColumnCount);
    var visibleHeaderRenderers = new Array(visibleColumnCount);

    // fill up header cells
    for (var c=0; c<visibleColumnCount; ++c) {
        var header = newDiv();
        header.style.width = columnWidth+'px';
        header.style.height = headerHeight+'px';
        header.style.position = 'absolute';
        header.style.left = (c * columnWidth)+'px';
        header.style.top = '0px';
        header.style.textAlign = 'center';
        header.style.borderStyle = 'solid';
        header.style.borderWidth = '0px 0px 0px 1px';
        header.style.borderColor = 'lightgray';

        visibleHeaders[c] = header;
        headerContainer.appendChild(header);
    }

    panel.appendChild(headerContainer);

//    var tableContainer = newDiv('tableContainer');
//    tableContainer.style.position = 'absolute';
//    tableContainer.style.width = visibleWidth+'px';
//    tableContainer.style.height = visibleHeight+'px';
//    tableContainer.style.overflow = 'auto';
//    tableContainer.style.top = headerHeight+'px';

    var table = newDiv('table');
    table.style.position = 'absolute';
    table.style.width = visibleWidth+'px';
    table.style.height = visibleHeight+'px';
    table.style.overflow = 'hidden';
    table.style.top = headerHeight+'px';
    table.onmousewheel = gridWheel;

//    tableContainer.appendChild(table);

    var visibleCells = new Array(visibleRowCount);  // [vrow][vcol] = cell (<div>)
    var visibleRenderers = new Array(visibleRowCount);  // [vrow][vcol] = renderer

    for (var r = 0; r < visibleRowCount; ++r) {

        var trow = newDiv();
        trow.style.position = 'absolute';
        trow.style.top = (r * rowHeight)+'px';
        trow.style.width = totalWidth +'px';
        trow.style.height = rowHeight + 'px';
        trow.style.backgroundColor = '#ffffff';
        trow.onmouseover = rollover;
        trow.onmouseout = rollout;

        visibleCells[r] = new Array(visibleColumnCount);
        visibleRenderers[r] = new Array(visibleColumnCount);

        for (var c = 0; c < visibleColumnCount; ++c) {
            var cell = newDiv();
            cell.style.mozUserSelect = 'none';
            cell.style.webkitUserSelect = 'none';
            cell.style.userSelect = 'none';
            cell.style.msUserSelect = 'none';
            cell.onselectstart = function () { return false; };

//            cell.appendChild(renderer.getElement());
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

            visibleCells[r][c] = cell;

            trow.appendChild(cell);
        }
        table.appendChild(trow);
    }

    panel.appendChild(table/*Container*/);

    updateView(true, true);

    body.appendChild(panel);

});