define('v3grid/TreeRenderer',
    ['v3grid/Adapter', 'v3grid/Utils'],
    function (Adapter, Utils) {

        var open_class = 'v3grid-treenode-open';
        var closed_class = 'v3grid-treenode-closed';

        var TreeRenderer = function (config) {
            this.config = config;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr><td align="right" valign="middle" style="width: 16px">' +
                '<img width="9" height="9" style="padding: 2px 10px 2px 2px;" src="resources/images/s.gif"></td><td style="height:100%"><span></span></td></tr></table>';
            this.view = temp.firstChild;
            this.rendererContainer = this.view.getElementsByTagName('span')[0];

            var indicator = this.openIndicator = this.view.getElementsByTagName('img')[0];

            if (Adapter.hasTouch) {
                this.tapHandler = new Utils.TapHandler(indicator, this.clickHandler, this);
            } else {
                Adapter.addListener(indicator, 'click', this.clickHandler, this);
            }

            this.updateRenderer(config);
            this.mapper = config.treeMapper;
        };

        TreeRenderer.prototype = {
            updateRenderer: function (config) {
                while (this.rendererContainer.firstChild) this.rendererContainer.removeChild(this.rendererContainer.firstChild);
                this.renderer = new config.renderer(config.rendererConfig);
                this.rendererContainer.appendChild(this.renderer.view);
            },

            updateData: function (grid, row, col) {
                this.renderer.updateData(grid, row, col);
                this.lastRow = grid.dataProvider.getCellData(row, '__treemapper_row');

                var mapper = this.mapper,
                    info = mapper.nodes[this.lastRow],
                    indicator = this.openIndicator;

                if (info.childCount == 0) {
                    indicator.style.display = 'none';
                } else {
                    indicator.style.display = '';
                    var isOpen = mapper.openNodes[info.id];
                    Adapter.removeClass(indicator, isOpen ? closed_class : open_class);
                    Adapter.addClass(indicator, isOpen ? open_class : closed_class);
                }
                indicator.parentNode.style.width = (info.depth * mapper.indentation) + 'px';
            },

            setConfig: function (config) {
                if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
                    this.updateRenderer(config);
                }
                this.config = config;
            },

            clickHandler: function (evt) {
                this.mapper.toggleNode(this.lastRow, evt);
            }
        };

        return TreeRenderer;
    }
);