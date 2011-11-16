var ec2ui_credentialManager = {
    credentials : new Array(),
    session: null,

    initDialog : function() {
        this.session = window.arguments[0];
        document.getElementById("ec2ui.credentials.view").view = ec2ui_credentialsTreeView;
        this.credentials = this.session.getCredentials();
        ec2ui_credentialsTreeView.display(this.credentials);
        document.getElementById("ec2ui.credentials.account").select();
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
        var name = document.getElementById("ec2ui.credentials.account").value.trim();
        var akid = document.getElementById("ec2ui.credentials.akid").value.trim();
        var secretKey = document.getElementById("ec2ui.credentials.secretkey").value.trim();
        var endpoint = document.getElementById("ec2ui.credentials.endpoint").value.trim();
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
        ec2ui_credentialsTreeView.display(this.credentials);
        this.selectCredentials();
    },

    saveAccount : function() {
        var name = document.getElementById("ec2ui.credentials.account").value.trim();
        var akid = document.getElementById("ec2ui.credentials.akid").value.trim();
        var secretKey = document.getElementById("ec2ui.credentials.secretkey").value.trim();
        var endpoint = document.getElementById("ec2ui.credentials.endpoint").value.trim();
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
        ec2ui_credentialsTreeView.display(this.credentials);
    },

    selectCredentials : function() {
        var sel = ec2ui_credentialsTreeView.getSelected();
        document.getElementById("ec2ui.credentials.account").value = sel ? sel.name : "";
        document.getElementById("ec2ui.credentials.akid").value = sel ? sel.accessKey : "";
        document.getElementById("ec2ui.credentials.secretkey").value = sel ? sel.secretKey : "";
        document.getElementById("ec2ui.credentials.endpoint").value = sel && sel.endPoint ? sel.endPoint : "";
    },
}
