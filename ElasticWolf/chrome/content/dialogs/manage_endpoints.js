var ew_endpointManager = {
    COLNAMES: ['endpoint.name','endpoint.url'],
    session: null,
    endpointmap : null,

    initDialog : function() {
        this.session = window.arguments[0];
        this.endpointmap = this.session.endpointmap;

        document.getElementById("ew.endpoints.view").view = this;
        this.refresh();

        var lastEndpointName = ew_prefs.getLastUsedEndpoint();
        if (lastEndpointName != null) {
            var index = this.indexOfEndpointName(lastEndpointName);
            this.setSelected(index);
        }
    },

    indexOfEndpointName : function(name) {
        var endpointlist = this.endpointmap.toArray(function(k,v){return v});
        for (var i = 0; i < endpointlist.length; i++) {
            if (endpointlist[i].name == name) {
                return i;
            }
        }
        return -1;
    },

    refresh: function() {
        var list = this.endpointmap.toArray(function(k,v){return new Endpoint(k, v.url)});
        this.display(list)
    },

    switchEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value;
        if (name == null || name == "") return;
        this.session.switchEndpoints(name);
    },

    removeEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value;
        if (name == null || name == "") return;
        this.endpointmap.removeKey(name);
        this.refresh();
    },

    addEndpoint: function(name, url) {
        this.endpointmap.put(name, new Endpoint(name, url));
        this.refresh();
    },

    saveEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value.trim() || "";
        var url = document.getElementById("ew.endpoints.url").value.trim() || "";
        if (name.length == 0 || url.length == 0) return;
        this.addEndpoint(name, url);
    },

    selectMapping : function() {
        var sel = this.getSelected();
        document.getElementById("ew.endpoints.name").value = sel ? sel.name : "";
        document.getElementById("ew.endpoints.url").value = sel ? sel.url : "";
    }
}

ew_endpointManager.__proto__ = TreeView;
