(function () {
    var proto = 'prototype', ctor = 'ctor', statics = 'statics', exts = 'extends';

    function merge(from, to) {
        for (var key in from) if (from.hasOwnProperty(key)) to[key] = from[key];
    }

    function TempClass(){}

    this.ClassDef = function (name, def) {
        var superClazz = Object;

        // handle 'extends'
        if (def[exts]) {
            superClazz = def[exts];
            delete def[exts];
        }

        // take 'constructor'
        if (!def.hasOwnProperty(ctor)) def[ctor] = (function ctor() { superClazz.apply(this, arguments); });

        var clazz = def[ctor];

        // 'statics'
        var sta;
        if (sta = def[statics]) {
            delete def[statics];
            merge(sta, clazz);
        }

        // add $className
        def.$className = clazz.$className = name;

        TempClass[proto] = def.super = superClazz[proto];

        // create & apply proto
        merge(def, clazz[proto] = new TempClass());

        // create namespace
        var part, nsObj = this, nsParts = name.split('.');
        name = nsParts.pop();
        while (part = nsParts.shift()) {
            nsObj = nsObj[part] || (nsObj[part] = {});
        }

        if (def.singleton) {
            clazz = new clazz();
        }

        // add clazz to namespace
        nsObj[name] = clazz;

        // static ctor
        if (sta && sta.hasOwnProperty(ctor)) {
            sta[ctor].call(clazz);
        }

        return clazz;
    };

})();

