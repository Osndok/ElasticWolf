var ec2ui_KeypairTreeView = {
    COLNAMES : ['keypair.name','keypair.fingerprint'],
    model: "keypairs",

    viewDetails : function(event) {
        var keypair = this.getSelected();
        if (keypair == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_keypair_details.xul", null, "chrome,centerscreen,modal,resizable", keypair);
    },

    runShell: function() {
        var keypair = this.getSelected();
        ec2ui_session.launchShell(keypair ? keypair.name: null);
    },

    createKeypair : function () {
        if (ec2ui_client.isGovCloud()) {
            alert("This function is disabled in GovCloud mode")
            return
        }
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name, key) {
            // Save key in the file
            var file = ec2ui_prefs.getPrivateKeyFile(name)
            var fp = FileIO.open(file)
            FileIO.write(fp, key + "\n\n", "");
            me.refresh();
            me.select({name: name});
        }
        ec2ui_session.controller.createKeypair(name, wrap);
    },

    importKeypair : function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name) {
            me.refresh();
            me.select({name: name});
        }
        // Create new private key file using openssl and return key value
        var file = ec2ui_session.promptForFile("Select the public key file to upload:")
        if (file) {
            var body = readPublicKey(file)
            if (body == '') {
                return alert('Unable to read public key file ' + file);
            }
            ec2ui_session.controller.importKeypair(name, body, wrap);
        }
    },

    createCertAndKeypair: function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;

        var file = ec2ui_session.promptForDir("Choose where to store keys and certificate or Cancel to use " + ec2ui_prefs.getKeyHome(), true)
        if (file) {
            ec2ui_prefs.setKeyHome(file);
        }
        ec2ui_session.showBusyCursor(true);

        // Create new certificate file using openssl and return cert value
        var body = ec2ui_session.generateCertificate(name);
        if (!body) {
            return alert("Could not create certificate and key pair files");
        }

        // Delay to avoid "not valid yet" error due to clock drift
        setTimeout(function() { ec2ui_session.controller.UploadSigningCertificate(body, function() {ec2ui_CertTreeView.refresh();alert("Certificate is uploaded sucessfully")}); }, 30000);

        // Import new public key as new keypair
        var file = ec2ui_prefs.getPublicKeyFile(name);
        var pubkey = readPublicKey(file);
        if (pubkey == '') {
            return alert('Unable to read public key file ' + file);
        }
        ec2ui_session.controller.importKeypair(name, pubkey, function() {me.refresh();});
    },

    deleteSelected  : function () {
        var keypair = this.getSelected();
        if (keypair == null) return;
        if (!confirm("Delete key pair "+keypair.name+"?")) return;
        var me = this;
        ec2ui_session.controller.deleteKeypair(keypair.name, function() {me.refresh();});
    }
};

ec2ui_KeypairTreeView.__proto__ = TreeView;
ec2ui_KeypairTreeView.register();

var ec2ui_AccessKeyTreeView = {
        COLNAMES : ['accesskey.name',"accesskey.status", "accesskey.current"],
        model: "accesskeys",

        viewDetails : function(event) {
            var key = this.getSelected();
            if (key == null) return;
            key.secret = this.getAccessKeySecret(key.name)
            window.openDialog("chrome://ec2ui/content/dialog_accesskey_details.xul", null, "chrome,centerscreen,modal,resizable", key);
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
            if (!ec2ui_session.promptYesNo("Confirm", "Delete access key "+key.name+"?")) return;

            var me = this;
            var wrap = function() {
                ec2ui_session.deletePassword('AccessKey:' + key.name)
                me.refresh();
            }
            ec2ui_session.controller.deleteAccessKey(key.name, wrap);
        },

        exportSelected  : function () {
            var key = this.getSelected();
            if (key == null) return;
            key.secret = this.getAccessKeySecret(key.name)
            if (key.secret == "") {
                alert("No secret key available for this access key")
                return
            }
            var path = ec2ui_session.promptForFile("Choose file where to export this access key", true)
            if (path) {
                FileIO.write(FileIO.open(path), "AWSAccessKeyId=" + key.name + "\nAWSSecretKey=" + key.secret + "\n")
            }
        },

        switchCredentials  : function () {
            var key = this.getSelected();
            if (key == null) return;
            key.secret = this.getAccessKeySecret(key.name)
            if (key.secret == "") {
                alert("Access key " + key.name + " does not have secret code available, cannot use this key");
                return;
            }

            if (!ec2ui_session.promptYesNo("Confirm", "Use access key "+key.name+" for authentication for user " + ec2ui_prefs.getLastUsedAccount() + "?, current access key/secret will be discarded.")) return;
            ec2ui_session.client.setCredentials(key.name, key.secret);
            ec2ui_session.updateCredentials(ec2ui_session.getActiveCredential(), key.name, key.secret);
            this.refresh();
        }
};
ec2ui_AccessKeyTreeView.__proto__ = TreeView;
ec2ui_AccessKeyTreeView.register();
