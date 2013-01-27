define('v3grid/InlineFilterHeaderRenderer',
    ['v3grid/Adapter'],
    function (Adapter) {
        var Renderer = function (config) {
            this.config = config;
            this.filterDP = config.filterDataProvider;

            var temp = document.createElement('div');
            temp.innerHTML = '<table width="100%" height="100%"><tr><td></td></tr><tr><td valign="bottom"><input type="text" style="width: 100%"></td></tr></table>';
            this.view = temp.firstChild;
            this.textInput = this.view.getElementsByTagName('input')[0];
            Adapter.addListener(this.textInput, 'input', this.textInputChanged, this);

            this.rendererContainer = this.view.getElementsByTagName('td')[0];
            this.updateRenderer(config);
        }

        Renderer.prototype = {
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
            },

            updateData: function (grid, row, col) {
                this.dataIndex = col.dataIndex;
                this.renderer.updateData(grid, row, col);
            },

            filter: function (grid, getData, row) {
                var value = getData.call(grid, row, this.dataIndex);
                value = value ? value.toString() : '';
                return value.indexOf(this.filterString) >= 0;
            },

            textInputChanged: function (evt) {
                var str = evt.target.value;
                if (str) {
                    this.filterString = str;
                    this.filterDP.addFilter(this);
                } else {
                    this.filterDP.removeFilter(this);
                }
                this.filterDP.update();
            }
        }

        return Renderer;
    }
);