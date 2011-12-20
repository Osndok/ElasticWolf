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
            ec2ui_session.controller.importKeypair(name, body, wrap);
        }
    },

    createCertAndKeypair: function () {
        var name = prompt("Please provide a new keypair name");
        if (name == null) return;
        name = name.trim();
        var me = this;
        var wrap = function(name) {
            me.refresh()
        }
        var wrap2 = function(id) {
            // Import new public key as new keypair
            var body = readPublicKey(ec2ui_prefs.getPublicKeyFile(name));
            ec2ui_session.controller.importKeypair(name, body, wrap);
        }
        ec2ui_session.showBusyCursor(true);

        var file = ec2ui_session.promptForDir("Choose where to store keys and certificate or Cancel to use " + ec2ui_prefs.getKeyHome(), true)
        if (file) {
            ec2ui_prefs.setKeyHome(file);
        }

        // Create new certificate file using openssl and return cert value
        var body = ec2ui_session.generateCertificate(name);
        if (body) {
            ec2ui_session.controller.UploadSigningCertificate(body, wrap2);
        } else {
            alert("Could not create certificate");
            return;
        }
    },

    deleteSelected  : function () {
        var keypair = this.getSelected();
        if (keypair == null) return;
        if (!confirm("Delete key pair "+keypair.name+"?")) return;
        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ec2ui_session.controller.deleteKeypair(keypair.name, wrap);
    }
};

ec2ui_KeypairTreeView.__proto__ = TreeView;
ec2ui_KeypairTreeView.register();
