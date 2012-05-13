var ew_endpointManager = {
    session: null,
    endpointmap : null,

    initDialog : function() {
        this.session = window.arguments[0];
        this.endpointmap = this.session.endpointmap;

        document.getElementById("ew.endpoints.view").view = ew_endpointsTreeView;
        ew_endpointsTreeView.setMapping(this.endpointmap);

        var lastEndpointName = ew_prefs.getLastUsedEndpoint();
        if (lastEndpointName != null) {
            var index = this.indexOfEndpointName(lastEndpointName);
            ew_endpointsTreeView.selectEndpointName(index);
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

    switchEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value;
        if (name == null || name == "") return;
        this.session.switchEndpoints(name);
    },

    removeEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value;
        if (name == null || name == "") return;

        this.endpointmap.removeKey(name);
        ew_endpointsTreeView.setMapping(this.endpointmap);
    },

    addEndpoint: function(name, url) {
        this.endpointmap.put(name, new Endpoint(name, url));
        ew_endpointsTreeView.setMapping(this.endpointmap);
    },

    saveEndpoint : function() {
        var name = document.getElementById("ew.endpoints.name").value.trim() || "";
        var url = document.getElementById("ew.endpoints.url").value.trim() || "";
        if (name.length == 0 || url.length == 0) return;
        this.addEndpoint(name, url);
    },

    selectMapping : function() {
        var sel = ew_endpointsTreeView.getSelectedEndPoint();
        if (sel != null) {
            document.getElementById("ew.endpoints.name").value = sel.name;
            document.getElementById("ew.endpoints.url").value = sel.url;
        }
    }
}
