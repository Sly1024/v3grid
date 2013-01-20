Ext.onReady(function () {


    var columns = 100;
    var rows = 10000;
    var updateBatch = columns*rows/1000;

    var columnWidth = 100;
    var rowHeight = 22;
    var gridWidth = 900;
    var gridHeight = 710;
    var scrollBarWidth = getScrollBarWidth();
    var headerHeight = 22;


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
    function update() {
        for (var i=0; i<updateBatch; ++i)  {
            var idx = Math.floor(Math.random() * columns * rows);
            var cidx = idx % columns;
            var ridx = idx / columns >> 0;
            setData(ridx, cidx, Math.floor((Math.random() - 0.5)*10000));
        }
        var t = +new Date();
        var elaps = t - lastUpdate;
        textSpan.firstChild.nodeValue = elaps + ' ms - ' + Math.floor(1000*updateBatch/elaps) + ' upd/sec';
        lastUpdate = t;
        if (running) updater_id = setTimeout(update, 10);
    }

    // dirtyCells[col_row] = { col: colIdx, row: rowIdx };
    var dirtyCells = { };
    var dirtyCellCount = 0;

    function initDataCells() {
        cellData = new Array(rows);
        for (var r = 0; r<rows; ++r) {
            cellData[r] = [];
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
        if (dirtyCellCount > 0) {
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
            ++dirtyCellCount;
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

    function onGridWheel(evt) {
        if (evt.hasOwnProperty('wheelDeltaX') && evt.wheelDeltaX != 0) {
            hscroller.scrollLeft -= evt.wheelDeltaX;
        } else {
            vscroller.scrollTop -= evt.hasOwnProperty('wheelDeltaY') ? evt.wheelDeltaY : evt.wheelDelta;
        }
    }

    var rowAltCls = ['vgrid-row', 'vgrid-row-alt'];

    function onVerticalScroll() {
        var vRowOff = Math.floor(vscroller.scrollTop * rows / vscroller.scrollHeight);
        if (vRowOff > rows - visibleRowCount) vRowOff = rows - visibleRowCount;
        var needUpdate = (vRowOff != visibleRowOffset);

        var prevStartWithAlt = (visibleRowOffset & 1);

        visibleRowOffset = vRowOff;

        // need to update alternating row styles??
        if (prevStartWithAlt != (visibleRowOffset & 1)) {
            for (var r=0;r<visibleRowCount;++r) {
                var rowEl = Ext.get(visibleCells[r].row);

                rowEl.removeCls(rowAltCls[prevStartWithAlt]);
                prevStartWithAlt ^= 1;
                rowEl.addCls(rowAltCls[prevStartWithAlt]);
            }
        }

        var firstRowOffset = vscroller.scrollTop - visibleRowOffset * rowHeight;

        var visRowHeight = visibleHeight + firstRowOffset;
        while (visRowHeight > visibleRowCount * rowHeight) {
            // need to add a row/cells
            addRow(visibleRowCount, true);
            needUpdate = true;
        }

        table.style.top = -firstRowOffset + 'px';
        if (needUpdate) updateView(true, false);
    }

    function onHorizontalScroll() {
        var vColOff = Math.floor(hscroller.scrollLeft * columns / hscroller.scrollWidth);
        if (vColOff > columns - visibleColumnCount) vColOff = columns - visibleColumnCount;
        var needUpdate = (vColOff != visibleColumnOffset);
        visibleColumnOffset = vColOff;

        var firstColOffset = hscroller.scrollLeft - visibleColumnOffset*columnWidth;

        var visColWidth = visibleWidth + firstColOffset;
        while (visColWidth > visibleColumnCount * columnWidth) {
            // need to add a column/header/cells
            addColumn(visibleColumnCount, true);
            needUpdate = true;
        }

        table.style.left = header.style.left = -firstColOffset + 'px';
        if (needUpdate) updateView(true, true);
    }

    function updateCell(cell, data, typeIdx, renderer, style) {

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
                visibleHeaderRenderers[vc] = updateCell(visibleHeaders[vc], headerData[c], headerIdxToRendererType[c], visibleHeaderRenderers[vc], headerStyle);
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
                    visibleRenderers[vr][vc] = updateCell(visibleCells[vr][vc], cellData[r][c], columnIdxToRendererType[c], visibleRenderers[vr][vc], cellStyle);
                }
            }
        } else {
            for (var key in dirtyCells) if (dirtyCells.hasOwnProperty(key)) {
                var dirtyCell = dirtyCells[key];
                var c = dirtyCell.col, r = dirtyCell.row,
                    vc = c - visibleColumnOffset, vr = r - visibleRowOffset;

                if (vc >= 0 && vc < visibleColumnCount &&
                    vr >= 0 && vr < visibleRowCount) {
                    visibleRenderers[vr][vc] = updateCell(visibleCells[vr][vc], cellData[r][c], columnIdxToRendererType[c], visibleRenderers[vr][vc], cellStyle);
                }
            }
        }

        dirtyCells = { };
        dirtyCellCount = 0;
    }


    function initScroller(horizontal, visible, total, top, left, onscroll) {
        var scroller = newDiv();
        var thickness = horizontal ? 'height' : 'width';
        var length = horizontal ? 'width' : 'height';

        scroller.style[thickness] = scrollBarWidth+'px';
        scroller.style[length] = (visible+ (Ext.firefoxVersion > 0 ? 0 : scrollBarWidth))+'px';
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

    function unselectable(dom) {
        dom.style.mozUserSelect = 'none';
        dom.style.webkitUserSelect = 'none';
        dom.style.userSelect = 'none';
        dom.style.msUserSelect = 'none';
        dom.onselectstart = function () { return false; };
    }

    function addCell(r, c) {
        var cell = newDiv();
        unselectable(cell);

        cell.style.cursor = 'default';
        cell.style.width = (columnWidth ) + 'px';
        cell.style.height = (rowHeight -1) + 'px';
        cell.style.position = 'absolute';
        cell.style.left = (c * columnWidth)+'px';
        cell.style.top = '0px';
        cell.style.borderColor = 'lightgrey';
        cell.style.borderStyle = 'solid';
        cell.style.borderWidth = '0px 0px 1px 1px';

        visibleCells[r][c] = cell;

        visibleCells[r].row.appendChild(cell);
    }

    function addColumn(c, addCells) {
        // fill up header cell
        var headerCell = newDiv();
        Ext.get(headerCell).addCls('vgrid-header');
        unselectable(headerCell);
        headerCell.style.cursor = 'default';
        headerCell.style.width = columnWidth+'px';
        headerCell.style.height = (headerHeight-1)+'px';
        headerCell.style.position = 'absolute';
        headerCell.style.left = (c * columnWidth)+'px';
        headerCell.style.top = '0px';
        headerCell.style.borderStyle = 'solid';
        headerCell.style.borderWidth = '0px 0px 1px 1px';
        headerCell.style.borderColor = 'lightgray';

        visibleHeaders[c] = headerCell;
        header.appendChild(headerCell);

        if (addCells) for (var r = 0; r < visibleRowCount; ++r) addCell(r, c);

        if (c >= visibleColumnCount) {
            visibleColumnCount = c+1;
            header.style.width = (visibleColumnCount*columnWidth)+'px';
            table.style.width = (visibleColumnCount*columnWidth)+'px';

            for (var r = 0; r < visibleRowCount; ++r) visibleCells[r].row.style.width = (visibleColumnCount*columnWidth) +'px';
        }
    }

    function addRow(r, addCells) {

        var trow = newDiv();

        var rowEl = Ext.get(trow);
        rowEl.addCls(rowAltCls[r & 1]);
        rowEl.addClsOnOver('vgrid-row-hover');

        trow.style.position = 'absolute';
        trow.style.top = (r * rowHeight)+'px';
        trow.style.width = (visibleColumnCount*columnWidth) +'px';
        trow.style.height = rowHeight + 'px';

        visibleCells[r] = [];
        visibleCells[r].row = trow;
        visibleRenderers[r] = [];

        table.appendChild(trow);

        if (addCells) for (var c=0; c<visibleColumnCount; ++c) addCell(r, c);

        if (r >= visibleRowCount) {
            visibleRowCount = r+1;
            table.style.height = (visibleRowCount*rowHeight)+'px';
        }
    }

    var vscroller, hscroller;
    var panel, headerContainer, header, tableContainer, table;

    function createComponents() {
        panel = newDiv('gridpanel');
        panel.style.width = gridWidth+'px';
        panel.style.height = gridHeight+'px';
        panel.style.position = 'relative';
        panel.style.overflow = 'hidden';
        panel.style.border = '1px solid gray';

        vscroller = initScroller(false, visibleHeight, totalHeight, headerHeight, visibleWidth, onVerticalScroll);
        hscroller = initScroller(true, visibleWidth, totalWidth, headerHeight+visibleHeight, 0, onHorizontalScroll);

        headerContainer = newDiv('headerContainer');
        headerContainer.style.width = visibleWidth+'px';
        headerContainer.style.height = headerHeight+'px';
        headerContainer.style.position = 'absolute';
        headerContainer.style.overflow = 'hidden';

        header = newDiv('header');
        header.style.width = (visibleColumnCount*columnWidth)+'px';
        header.style.height = headerHeight+'px';
        header.style.position = 'absolute';
        header.style.overflow = 'hidden';

        headerContainer.appendChild(header);

        tableContainer = newDiv('tableContainer');
        tableContainer.style.position = 'absolute';
        tableContainer.style.width = visibleWidth+'px';
        tableContainer.style.height = visibleHeight+'px';
        tableContainer.style.overflow = 'hidden';
        tableContainer.style.top = headerHeight+'px';

        table = newDiv('table');
        table.style.position = 'absolute';
        table.style.width = (visibleColumnCount*columnWidth)+'px';
        table.style.height = (visibleRowCount*rowHeight)+'px';
        table.style.overflow = 'hidden';
        table.style.top = '0px';
        table.style.left = '0px';
        table.onmousewheel = onGridWheel;

        tableContainer.appendChild(table);

        for (var r = 0; r < visibleRowCount; ++r) addRow(r, false);
        for (var c = 0; c < visibleColumnCount; ++c) addColumn(c, true);

        panel.appendChild(headerContainer);
        panel.appendChild(tableContainer);
        panel.appendChild(vscroller);
        panel.appendChild(hscroller);

    }

    function collectRendererTypes() {
        for (var c=0; c<columns; ++c) {
            var idx = rendererTypes.indexOf(columnRenderers[c]);
            if (idx < 0) {
                idx = rendererTypes.length;
                rendererTypes[idx] = columnRenderers[c];
            }
            columnIdxToRendererType[c] = idx;

            var idx = rendererTypes.indexOf(headerRenderers[c]);
            if (idx < 0) {
                idx = rendererTypes.length;
                rendererTypes[idx] = headerRenderers[c];
            }
            headerIdxToRendererType[c] = idx;
        }

        for (var a=0;a<rendererTypes.length;++a) availableRenderers[a] = [];
    }

    function doHorizontalLayout() {

    }

    function doVerticalLayout() {

    }

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

    // availableRenderers[rendererTypeIdx][idx]
    var availableRenderers = [];
    collectRendererTypes();

    var cellData, headerData;
    initDataCells();


    var visibleHeaders = [];
    var visibleHeaderRenderers = [];
    var visibleCells = [];  // [vrow][vcol] = cell (<div>)
    var visibleRenderers = [];  // [vrow][vcol] = renderer

    createComponents();

    updateView(true, true);

    body.appendChild(panel);

});

Ext.define('TextItemRenderer', {

    constructor: function () {
        this.tNode = document.createTextNode('');
        this.view = document.createElement('span');
        this.view.appendChild(this.tNode);
        this.view.style.position = 'absolute';
        this.view.style.top = '0px';
        this.view.style.left = '0px';
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
        this.view.style.top = '0px';
        this.view.style.left = '0px';
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
        this.view.style.top = '0px';
        this.view.style.left = '0px';
        this.callParent(arguments);
    },

    setData: function (data) {
        this.view.value = data ? data : '';
    }
});