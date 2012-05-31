var ew_EndpointsTreeView = {
    COLNAMES: ['endpoint.name','endpoint.url'],

    activate : function() {
        this.refresh();

        var name = ew_prefs.getLastUsedEndpoint();
        if (name != null) {
            this.select({name:name});
        }
    },

    refresh: function() {
        this.display(ew_session.getEndpoints())
    },

    switchEndpoint : function() {
        var item = this.getSelected();
        if (!item) return;
        ew_switchEndpoints(item.name);
    },

    deleteEndpoint : function() {
        var item = this.getSelected();
        if (!item) return;
        if (!confirm('Delete endpoint ' + item.name)) return;
        ew_session.endpointmap.removeKey(item.name);
        this.refresh();
    },

    addEndpoint: function(name, url) {
        var url = prompt("Enter endpoint URL:");
        if (!url) return;
        var endpoint = new Endpoint(null, url)
        ew_session.endpointmap.put(endpoint.name, endpoint);
        this.refresh();
    },
}

ew_EndpointsTreeView.__proto__ = TreeView;
