var ew_credentialManager = {
    COLNAMES: ['credential.name','credential.accessKey', 'credential.endPoint'],
    credentials : new Array(),
    session: null,
    tree: null,

    initDialog : function() {
        this.session = window.arguments[0];

        this.tree = this;
        document.getElementById("ew.credentials.view").view = this.tree;
        this.credentials = this.session.getCredentials();
        this.tree.display(this.credentials);

        var endpoints = this.session.prefs.getEndpointMap().toArray(function(k, v) { return new Endpoint(k, v.url) });
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
        this.tree.display(this.credentials);
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
        this.tree.display(this.credentials);
    },

    switchAccount: function()
    {
        var sel = this.tree.getSelected();
        if (!sel) {
            alert("No credentials selected");
            return;
        }
        this.session.switchCredentials(sel);
    },

    selectCredentials : function() {
        var sel = this.tree.getSelected();
        document.getElementById("ew.credentials.account").value = sel ? sel.name : "";
        document.getElementById("ew.credentials.akid").value = sel ? sel.accessKey : "";
        document.getElementById("ew.credentials.secretkey").value = sel ? sel.secretKey : "";
        document.getElementById("ew.credentials.endpoint").value = sel && sel.endPoint ? sel.endPoint : "";
    },
};
ew_credentialManager.__proto__ = TreeView;
