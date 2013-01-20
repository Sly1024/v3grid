define('v3grid/TreeRenderer',
    ['v3grid/Adapter', 'v3grid/Utils'],
    function (Adapter, Utils) {

        var TreeRenderer = function (config) {
            this.config = config;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr><td align="right" valign="middle" style="width: 16px">' +
                '<img width="14" height="14" style="padding: 2px;"></td><td style="height:100%"><span></span></td></tr></table>';
            this.view = temp.firstChild;
            this.rendererContainer = this.view.getElementsByTagName('span')[0];

            this.openIndicator = this.view.getElementsByTagName('img')[0];

            if (Adapter.hasTouch) {
                this.tapHandler = new Utils.TapHandler(this.openIndicator, this.clickHandler, this);
            } else {
                Adapter.addListener(this.openIndicator, 'click', this.clickHandler, this);
            }

            this.updateRenderer(config);
        };

        TreeRenderer.prototype = {
            updateRenderer: function (config) {
                while (this.rendererContainer.firstChild) this.rendererContainer.removeChild(this.rendererContainer.firstChild);
                this.renderer = new config.renderer(config.rendererConfig);
                this.rendererContainer.appendChild(this.renderer.view);
            },

            updateData: function (grid, row, col) {
                this.renderer.setData(grid.getData(row, col.dataIndex));
                this.lastRow = row;
                var info = this.config.treeDataProvider.getInfo(row);
                var indicator = this.openIndicator;
                if (info[0] /*childCount*/ == 0) {
                    indicator.style.display = 'none';
                } else {
                    indicator.style.display = 'block';
                    indicator.src = info[1] /*isOpen*/ ? 'images/minus.png' : 'images/plus.png';
                }
                indicator.parentNode.style.width = (16 + info[2] /*level*/ *this.config.treeDataProvider.indentation) + 'px';
            },

            setConfig: function (config) {
                if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
                    this.updateRenderer(config);
                }
                this.config = config;
            },

            clickHandler: function (evt) {
                this.config.treeDataProvider.rowClicked(this.lastRow, evt);
            }
        };

        return TreeRenderer;
    }
);