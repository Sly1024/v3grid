ClassDef('v3grid.ColumnSelector', {
    CLS: 'v3grid-column-selector',
    CLS_ITEM: 'v3grid-column-selector-item',

    init: function (grid, config) {
        this.grid = grid;

        v3grid.Adapter.addListener(grid.panel, 'keydown', this.keyPressHandler, this);
    },

    keyPressHandler: function (evt) {
//            console.log('key', evt.ctrlKey, evt.keyCode );
        if (evt.ctrlKey && evt.keyCode == 81 /*q*/) {
            if (this.isOpen) {
                this.close();
            } else {
                var panel = this.grid.panel,
                    popup = this.getPopup(),
                    fader = this.getFader();

                panel.appendChild(fader);
                panel.appendChild(popup);

                popup.style.left = (panel.offsetWidth - popup.offsetWidth) / 2 + 'px';
                popup.style.top = (panel.offsetHeight - popup.offsetHeight) / 2 + 'px';
                this.isOpen = true;
            }
        }
    },

    getPopup: function () {
//            if (this.popup) return this.popup;

        var popup = document.createElement('div'),
            style = popup.style;

        var chboxes = [],
            columns = this.grid.colMgr.columns,
            len = columns.length;

        for (var i = 0; i < len; ++i) {
            chboxes[i] = '<div class="' + this.CLS_ITEM + '"><input colid="' + columns[i].id + '" type="checkbox" ' +
                (columns[i].visible ? 'checked' : '') + '>' + columns[i].header + '</div>';
        }

        v3grid.Adapter.addClass(popup, this.CLS);
        style.position = 'absolute';
        style.zIndex = 1000;

        popup.innerHTML = '<h2>Columns</h2><a class="closebutton">x</a><div style="overflow-y: scroll;">' + chboxes.join('') + '</div>';
        v3grid.Adapter.addListener(popup, 'click', this.clickHandler, this);

        return this.popup = popup;
    },

    getFader: function () {
        if (this.fader) return this.fader;

        var fader = document.createElement('div'),
            style = fader.style;

        style.opacity = 0.5;
        style.position = 'absolute';
        style.width = '100%';
        style.height = '100%';
        style.backgroundColor = '#000000';
        style.zIndex = 999;

        return this.fader = fader;
    },

    close: function () {
        v3grid.Adapter.removeListener(this.popup, 'click', this.clickHandler, this);
        this.grid.panel.removeChild(this.popup);
        this.grid.panel.removeChild(this.fader);
        this.isOpen = false;
    },

    clickHandler: function (evt) {
        var src = evt.target || evt.srcElement;
        if (src instanceof HTMLInputElement) {
            this.grid.setColumnVisible(src.attributes.colid.value, src.checked);
        } else if (src.className == 'closebutton') {
            this.close();
        }
    }
});