ClassDefReq('v3grid.InlineFilterHeaderRenderer',
    ['v3grid/Adapter'],
    function (Adapter) {
        return {
            ctor: function InlineFilterHeaderRenderer(config) {
                var me = this;
                me.config = config;

                var temp = document.createElement('div');
                temp.innerHTML = '<table width="100%" height="100%"><tr style="height:100%"><td></td></tr><tr><td valign="bottom"><input type="text" style="width: 100%"></td></tr></table>';
                me.view = temp.firstChild;
                me.textInput = me.view.getElementsByTagName('input')[0];

                me.bufferedInputChanged = Adapter.createBuffered(me.textInputChanged, 200, me);
                Adapter.arrayEach(['change', 'keydown', 'paste', 'input'], function (event) {
                    Adapter.addListener(me.textInput, event, me.bufferedInputChanged, me);
                });

                me.rendererContainer = me.view.getElementsByTagName('td')[0];
                me.updateRenderer(config);
            },

            updateRenderer: function (config) {
                while (this.rendererContainer.firstChild) this.rendererContainer.removeChild(this.rendererContainer.firstChild);
                this.renderer = new config.renderer(config.rendererConfig);
                this.rendererContainer.appendChild(this.renderer.view);
            },

            setConfig: function (config) {
                if (config.renderer != this.config.renderer || config.rendererConfig != this.config.rendererConfig) {
                    this.updateRenderer(config);
                }
                this.config = config;
                this.textInput.value = config.filter.filterString;
            },

            updateData: function (grid, row, col) {
                this.renderer.updateData(grid, row, col);
            },

            textInputChanged: function () {
                var str = this.textInput.value;
                var filterDP = this.config.filterDataProvider;
                var filter = this.config.filter;
                if (str) {
                    filter.filterString = str;
                    filterDP.addFilter(filter);
                } else {
                    filter.filterString = '';
                    filterDP.removeFilter(filter);
                }
                filterDP.refresh();
            }
        };
    }
);
