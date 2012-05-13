var ew_credentialManager = {
    credentials : new Array(),
    session: null,

    initDialog : function() {
        this.session = window.arguments[0];

        document.getElementById("ew.credentials.view").view = ew_credentialsTreeView;
        this.credentials = this.session.getCredentials();
        ew_credentialsTreeView.display(this.credentials);

        var endpoints = this.session.preferences.getEndpointMap().toArray(function(k, v) { return new Endpoint(k, v.url) });
        var menulist = document.getElementById("ew.credentials.endpoint");
        menulist.removeAllItems();
        menulist.insertItemAt(i, "", "");
        for (var i in endpoints) {
            menulist.insertItemAt(i, endpoints[i].name, endpoints[i].url);
        }
        document.getElementById("ew.credentials.account").select();
    },

    indexOfAccountName : function(name) {
        name = name.trim();
        for (var i = 0; i < this.credentials.length; i++) {
            if (this.credentials[i].name.trim() == name) {
                return i;
            }
        }
        return -1;
    },

    removeAccount : function() {
        var name = document.getElementById("ew.credentials.account").value.trim();
        var akid = document.getElementById("ew.credentials.akid").value.trim();
        var secretKey = document.getElementById("ew.credentials.secretkey").value.trim();
        var endpoint = document.getElementById("ew.credentials.endpoint").value.trim();
        if (name == null || name == "" || akid == null || akid == "" || secretKey == null || secretKey == "") {
            alert("Invalid credentials selected")
            return;
        }
        var cred = new Credential(name, akid, secretKey, endpoint)
        var index = this.indexOfAccountName(cred.name);
        if (index != -1) {
            this.credentials.splice(index, 1);
        }
        this.session.removeCredentials(cred)
        ew_credentialsTreeView.display(this.credentials);
        this.selectCredentials();
    },

    saveAccount : function() {
        var name = document.getElementById("ew.credentials.account").value.trim();
        var akid = document.getElementById("ew.credentials.akid").value.trim();
        var secretKey = document.getElementById("ew.credentials.secretkey").value.trim();
        var endpoint = document.getElementById("ew.credentials.endpoint").value.trim();
        if (name == null || name == "" || akid == null || akid == "" || secretKey == null || secretKey == "") {
            alert("Invalid credentials selected")
            return;
        }
        var cred = new Credential(name, akid, secretKey, endpoint)
        var index = this.indexOfAccountName(cred.name);
        if (index == -1) {
            this.credentials.push(cred);
        }
        this.session.saveCredentials(cred)
        ew_credentialsTreeView.display(this.credentials);
    },

    switchAccount: function()
    {
        var sel = ew_credentialsTreeView.getSelected();
        if (!sel) {
            alert("No credentials selected");
            return;
        }
        this.session.switchCredentials(sel);
    },

    selectCredentials : function() {
        var sel = ew_credentialsTreeView.getSelected();
        document.getElementById("ew.credentials.account").value = sel ? sel.name : "";
        document.getElementById("ew.credentials.akid").value = sel ? sel.accessKey : "";
        document.getElementById("ew.credentials.secretkey").value = sel ? sel.secretKey : "";
        document.getElementById("ew.credentials.endpoint").value = sel && sel.endPoint ? sel.endPoint : "";
    },
}
