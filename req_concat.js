function define(name, dependencies, moduleFunc) {
    var modules = define.modules = define.modules || [],
        map = define.modulemap = define.modulemap || {};

    function exec(modCfg) {
        // check if all dependencies are there
        var dep = modCfg.dep, values = [], len = dep.length,
            depMod, i = 0;
        for (; i < len; ++i) {
            depMod = map[dep[i]];
            if (depMod && depMod.value) values.push(depMod.value);
        }

        if (values.length == len) {
            modCfg.value = modCfg.exec.apply(this, values);
            delete modCfg.exec;
            var name = modCfg.name,
                deps = [];
            // check if there are other modules depending on this
            for (len = modules.length, i = 0; i < len;) if ((depMod = modules[i]) == modCfg) {
                modules[i] = modules[--len];
                modules.length = len;
                if (!name) break;
            } else {
                if (name && !depMod.value && (dep = depMod.dep)) {
                    var j = dep.length-1;
                    while (j >= 0 && dep[j] != name) --j;
                    if (j >= 0) deps.push(depMod);
                }
                ++i;
            }
            for (len = deps.length, i = 0; i < len; ++i) if (!deps[i].value) exec(deps[i]);
        }
    }

    var cfg = map[name];
    if (!cfg) {
        cfg = { name: name };
        if (name) map[name] = cfg;
        modules.push(cfg);
    }

    cfg.dep = dependencies;
    cfg.exec = moduleFunc;

    exec(cfg);
}

function require(dependencies, execute) {
    if (typeof dependencies === 'string' && !execute) {
        var modCfg = define.modulemap[dependencies];
        return modCfg ? modCfg.value : null;
    }
    define(null, dependencies, execute);
}

require.defined = function (module) { return !!define.modulemap[module]; };
require.config = function (cfg) {
    require.baseUrl = cfg.baseUrl;
};

require.baseUrl = (function () {
    var scripts = document.getElementsByTagName('script'),
        src = scripts[scripts.length-1].src;
    return src.substr(0, src.lastIndexOf('/')+1);
})();
