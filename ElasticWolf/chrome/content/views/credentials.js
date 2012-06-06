var ew_CredentialsTreeView = {
    COLNAMES: ['credential.name','credential.accessKey', 'credential.endPoint'],

    activate : function() {
        this.display(ew_session.getCredentials());
    },

    deactivate: function() {
        if (ew_session.getActiveCredentials() == null) {
            this.switchCredentials();
        }
    },

    deleteCredentials : function() {
        var cred = this.getSelected();
        if (!cred) return;
        if (!confirm("Delete credentials " + cred.name)) return;
        ew_session.removeCredentials(cred)
        this.display(ew_session.getCredentials());
    },

    addCredentials : function() {
        var rc = { ok: null, endpoints: ew_prefs.getEndpoints() };
        window.openDialog("chrome://ew/content/dialogs/create_credentials.xul", null, "chrome,centerscreen, modal, resizable", rc);
        if (rc.ok) {
            var cred = new Credential(rc.name, rc.accessKey, rc.secretKey, rc.endpoint);
            ew_session.saveCredentials(cred);
            this.display(ew_session.getCredentials());
        }
    },

    switchCredentials: function()
    {
        var cred = this.getSelected();
        if (!cred) return;
        ew_session.switchCredentials(cred);
    },
};
ew_CredentialsTreeView.__proto__ = TreeView;

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
       ew_session.refreshEndpoints();
       this.invalidate();
   },

   getData: function() {
       return ew_session.getEndpoints();
   },

   switchEndpoint : function() {
       var item = this.getSelected();
       if (!item) return;
       ew_session.ew_switchEndpoints(item.name);
   },

   deleteEndpoint : function() {
       var item = this.getSelected();
       if (!item) return;
       if (!confirm('Delete endpoint ' + item.name)) return;
       ew_session.deleteEndpoint(item.name);
       this.refresh();
   },

   addEndpoint: function(name, url) {
       var url = prompt("Enter endpoint URL:");
       if (!url) return;
       var endpoint = new Endpoint(null, url)
       ew_session.addEndpoint(endpoint.name, endpoint);
       this.refresh();
   },
}

ew_EndpointsTreeView.__proto__ = TreeView;
