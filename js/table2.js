Ext.onReady(function () {
    var body = document.getElementById("div");
    var textSpan = document.getElementById("textspan");

    document.getElementById("button").onclick = button_click;

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
    var currentIdx = 0;
    function update() {
        for (var i=0; i<1000; ++i)  {
            var idx = Math.floor(Math.random() * columns * rows);
            var cidx = idx % columns;
            var ridx = idx / columns >> 0;
            allcells[ridx][cidx].textNode.nodeValue = currentIdx;
            ++currentIdx;
        }
        var t = +new Date();
        var elaps = t - lastUpdate;
        textSpan.firstChild.nodeValue = elaps + ' ms - ' + Math.floor(1000000/elaps) + ' upd/sec';
        lastUpdate = t;
        if (running) updater_id = setTimeout(update, 0);
    }

    var columns = 100;
    var rows = 100;
    var columnWidth = 100;
    var rowHeight = 22;

    var table = document.createElement('div');
    table.style.position = 'relative';
    table.style.width = columns * columnWidth;
    table.style.height = rows * rowHeight;

    var allcells = new Array(rows);
    for (var r = 0; r<rows; ++r) allcells[r] = new Array(columns);

    for (var r = 0; r < rows; ++r) {

        var trow = document.createElement('div');
        trow.style.position = 'absolute';
        trow.style.top = (r * rowHeight)+'px';
        trow.style.width = (columns * columnWidth) +'px';
        trow.style.height = rowHeight + 'px';
        trow.style.backgroundColor = '#f0f0f0';
        trow.onmouseover = rollover;
        trow.onmouseout = rollout;

        for (var c = 0; c < columns; ++c) {
            var cell = document.createElement('span');

            var text = document.createTextNode('.');
            cell.appendChild(text);
            cell.style.width = (columnWidth -2) + 'px';
            cell.style.height = (rowHeight -2) + 'px';
            cell.style.position = 'absolute';
            cell.style.left = (c * columnWidth)+'px';
            cell.style.top = '0px';
            cell.style.textAlign = 'right';
//            cell.style.verticalAlign = 'bottom';

            allcells[r][c] = { data: '.', textNode: text };

            trow.appendChild(cell);
        }
        table.appendChild(trow);
    }

    body.appendChild(table);

    function rollover(evt) {
        evt.currentTarget.style.backgroundColor = '#c0d0f0';
    }

    function rollout(evt) {
        evt.currentTarget.style.backgroundColor = '#f0f0f0';
    }
});