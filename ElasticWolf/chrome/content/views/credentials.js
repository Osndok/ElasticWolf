var ew_CredentialsTreeView = {
    COLNAMES: ['credential.name','credential.accessKey', 'credential.endPoint'],

    activate : function() {
        this.display(ew_session.getCredentials());
    },

    deleteCredentials : function() {
        var cred = this.getSelected();
        if (!cred) return;
        if (!confirm("Delete credentials " + cred.name)) return;
        ew_session.removeCredentials(cred)
        this.display(ew_session.getCredentials());
    },

    addCredentials : function() {
        var rc = { ok: null, endpoints: ew_session.getEndpoints() };
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
