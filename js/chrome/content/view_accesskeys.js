var ec2ui_AccessKeyTreeView = {
        COLNAMES : ['accesskey.name',"accesskey.status", "accesskey.current"],
        model: "accesskeys",

        viewDetails : function(event) {
            var key = this.getSelected();
            if (key == null) return;
            key.secret = this.getAccessKeySecret(key.name)
            window.openDialog("chrome://ec2ui/content/dialog_accesskey_details.xul", null, "chrome,centerscreen,modal", key);
        },

        createAccessKey : function () {
            var me = this;
            var wrap = function(key, secret) {
                ec2ui_session.savePassword('AccessKey:' + key, secret);
                me.refresh()
            }
            ec2ui_session.controller.createAccessKey(wrap);
        },

        getAccessKeySecret : function(key) {
            var secret = ec2ui_session.getPassword('AccessKey:' + key)
            if (secret == "" && key == ec2ui_session.client.accessCode) {
                secret = ec2ui_session.client.secretKey
            }
            return secret
        },

        deleteSelected  : function () {
            var key = this.getSelected();
            if (key == null) return;
            if (key.current) {
                alert("You cannot delete current access key")
                return;
            }
            var confirmed = confirm("Delete access key "+key.name+"?");
            if (!confirmed) return;

            var me = this;
            var wrap = function() {
                ec2ui_session.deletePassword('AccessKey:' + key.name)
                me.refresh();
            }
            ec2ui_session.controller.deleteAccessKey(key.name, wrap);
        },

        switchCredentials  : function () {
            var key = this.getSelected();
            if (key == null) return;
            key.secret = this.getAccessKeySecret(key.name)
            if (key.secret == "") {
                alert("Access key " + key.name + " does not have secret code available, cannot use this key");
                return;
            }

            var confirmed = confirm("Use access key "+key.name+" for authentication for user " + ec2ui_prefs.getLastUsedAccount() + "?, current access key/secret will be discarded.");
            if (!confirmed) return;
            ec2ui_session.client.setCredentials(key.name, key.secret);
            ec2ui_session.updateCredentials(ec2ui_session.getActiveCredential(), key.name, key.secret);
            this.refresh();
        }
};
ec2ui_AccessKeyTreeView.__proto__ = TreeView;
ec2ui_AccessKeyTreeView.register();
