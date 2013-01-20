function define(name, dependencies, moduleFunc) {
    var modules = define.modules = define.modules || [];
    var map = define.modulemap = define.modulemap || {};

    function load(name) {
        if (!name) throw "Module must have a name!";

        modules.push(map[name] = { name: name });

        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = 'async';
        script.src = name + '.js';
        head.appendChild(script);
    }

    function exec(modCfg) {
        // check if all dependencies are there
        var dep = modCfg.dep, values = [], len = dep.length, i = 0;
        for (; i < len; ++i) {
            var depMod = map[dep[i]];
            if (depMod) {
                if (depMod.value) values.push(depMod.value);
            } else load(dep[i]);
        }

        if (values.length == len) {
            modCfg.value = modCfg.exec.apply(this, values);
            delete modCfg.exec;
            var name = modCfg.name;
            if (name) {
                // check if there are other modules depending on this
                var deps = [];
                for (len = modules.length, i = 0; i < len; ++i) {
                    var depMod = modules[i];
                    if (!depMod.value && (dep = depMod.dep)) {
                        var j = dep.length-1;
                        while (j >= 0 && dep[j] != name) --j;
                        if (j >= 0) deps.push(depMod);
                    }
                }
                for (len = deps.length, i = 0; i < len; ++i) if (!deps[i].value) exec(deps[i]);
            } else {
                // remove from modules
                for (len = modules.length, i = 0; i < len; ++i) if (modules[i] == modCfg) {
                    modules.splice(i, 1);
                    break;
                }
            }
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

require.defined = function (module) { return !!define.modulemap[module]; }