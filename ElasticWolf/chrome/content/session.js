//main object that holds the current session information
var ew_session = {
    accessCode : "",
    secretKey : "",
    initialized : false,
    locked: false,
    controller : null,
    model : null,
    client : null,
    credentials : null,
    endpointmap : null,
    tabMenu: null,
    instanceTags : null,
    volumeTags : null,
    snapshotTags : null,
    imageTags : null,
    eipTags : null,
    vpcTags : null,
    subnetTags : null,
    dhcpOptionsTags : null,
    vgwTags : null,
    cgwTags : null,
    vpnTags : null,
    refreshedTabs : new Array(),
    cmdline: null,
    tabs: {},

    initialize : function()
    {
        ew_prefs.init();
        ew_toolbar.init();

        this.tabs = ew_toolbar.tabs;
        this.controller = ew_controller;
        this.model = ew_model;
        this.client = ew_client;
        this.prefs = ew_prefs;
        this.tabMenu = $("ew.tabs");

        this.loadCredentials();
        this.loadEndpointMap();
        this.loadAllTags();

        document.title = ew_prefs.getAppName();

        // Use last used credentials
        this.selectCredentials(this.getActiveCredentials());
        this.selectEndpoint(this.getActiveEndpoint());
        this.selectTab(this.prefs.getCurrentTab());

        // Parse command line
        this.cmdLine = window.arguments[0].QueryInterface(Components.interfaces.nsICommandLine);

        // Passing credentials
        var name = this.cmdLine.handleFlagWithParam('name', true);
        var key = this.cmdLine.handleFlagWithParam('key', true);
        var secret = this.cmdLine.handleFlagWithParam('secret', true);
        var endpoint = this.cmdLine.handleFlagWithParam('endpoint', true);
        if (key && key != '' && secret && secret != '') {
            var cred = new Credential(name || 'AWS', key, secret, endpoint);
            this.switchCredentials(cred);
        } else

        if (endpoint && endpoint != '') {
            var e = new Endpoint("", endpoint);
            this.switchEndpoints(e);
        }

        // Disable credentials management
        this.locked = this.cmdLine.handleFlag('lock', true);

        // Check for pin
        this.promptForPin();
        this.setIdleTimer();

        this.initialized = true;
        debug('session started')
    },

    setIdleTimer: function()
    {
        var me = this;
        var idleService = Components.classes["@mozilla.org/widget/idleservice;1"].getService(Components.interfaces.nsIIdleService);
        if (this.idleObserver) {
            idleService.removeIdleObserver(this.idleObserver, this.idleObserver.timeout);
            this.idleObserver = null;
        }
        var timeout = this.prefs.getIdleTimeout();
        if (timeout <= 0) return;

        this.idleObserver = {
             timeout: timeout * 60,
             observe: function(subject, topic, data) {
                 var action = me.prefs.getIdleAction();
                 debug(subject + ", " + topic + ", " + data + ", " + action)
                 switch (topic + ':' + action) {
                 case "idle:exit":
                     me.quit();
                     break;

                 case 'idle:pin':
                     me.promptForPin();
                     break;
                 }
             }
        };
        idleService.addIdleObserver(this.idleObserver, this.idleObserver.timeout);
        debug('idle timer: ' + this.idleObserver.timeout + ', ' + me.prefs.getIdleAction());
    },

    quit: function()
    {
        var app = Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
        app.quit(Components.interfaces.nsIAppStartup.eForceQuit);
    },

    addTabToRefreshList : function(tab)
    {
        log("Called by: " + tab + " to start refreshing");
        if (tab != null) {
            this.refreshedTabs[tab] = 1;
        }
    },

    removeTabFromRefreshList : function(tab)
    {
        log("Called by: " + tab + " to stop refreshing");
        if (tab != null) {
            this.refreshedTabs[tab] = 0;
        }
    },

    selectTab: function(name) {
        if (this.client.disabled) return;

        var tab = ew_toolbar.get(name);
        if (!tab) return;

        ew_toolbar.select(name);
        this.tabMenu.selectedPanel = $(tab.id || name);
        this.prefs.setCurrentTab(name);

        // Stop the refresh timers of all tabs
        for (var tab in this.refreshedTabs) {
            if (this.refreshedTabs[tab] == 1) {
                this.refreshedTabs[tab] = 0;
                log("Stopping Refresh of tab: " + tab);
                eval(tab + ".stopRefreshTimer()");
            }
        }

        // Refresh if no records yet
        for (var i in tab.views) {
            if (tab.views[i].view.activate) {
                tab.views[i].view.activate();
            }

            tab.views[i].view.filterList = tab.views[i].filterList;
            if (tab.views[i].view.rowCount == 0) {
                tab.views[i].view.refresh();
            } else {
                tab.views[i].view.invalidate();
            }
        }
    },

    isViewVisible: function(view)
    {
        for (var i in this.tabs) {
            for (var j in this.tabs[i].views) {
                if (this.tabs[i].views[j].view == view) return true
            }
        }
        return false;
    },

    getCredentials : function () {
        var credentials = new Array();
        var list = ew_session.getPasswordList("Cred:")
        for (var i = 0; i < list.length; i++) {
            var pw = list[i][1].split(";;");
            if (pw.length > 1) {
                var cred = new Credential(list[i][0].substr(5).trim(), pw[0], pw[1], pw.length > 2 ? pw[2] : "")
                credentials.push(cred);
            }
        }
        return credentials;
    },

    updateCredentials : function(cred, key, secret, endpoint)
    {
        if (cred == null || key == null || key == "" || secret == null || secret == "") {
            alert("Invalid access key given for account");
            return;
        }
        cred.accessKey = key;
        cred.secretKey = secret;
        if (endpoint) {
            cred.endPoint = endpoint;
        }
        this.saveCredentials(cred);
    },

    removeCredentials : function(cred)
    {
        this.deletePassword('Cred:' + cred.name)
    },

    saveCredentials : function(cred)
    {
        this.savePassword('Cred:' + cred.name, cred.toString())
    },

    manageCredentials : function()
    {
        if (this.locked || this.client.disabled) return;
        window.openDialog("chrome://ew/content/dialogs/manage_credentials.xul", null, "chrome,centerscreen, modal, resizable", ew_session);
        this.loadCredentials();
        // Switch to the first account on first use
        if (!this.getActiveCredentials() && this.credentials.length) {
            this.switchCredentials(this.credentials[0]);
        }
    },

    loadCredentials : function()
    {
        this.credentials = this.getCredentials();
        if (this.credentials.length == 0) {
            // invalidate all the views
            this.model.invalidate();
            // Reset the credentials stored in the client
            this.client.setCredentials("", "");
        }
    },

    getActiveCredentials : function()
    {
        var cur = this.prefs.getLastUsedAccount();
        for (var i in this.credentials) {
            if (cur == this.credentials[i].name) {
                return this.credentials[i];
            }
        }
        return null;
    },

    selectCredentials: function(cred)
    {
        if (cred) {
            debug("switch credentials to " + cred.name)
            this.prefs.setLastUsedAccount(cred.name);
            this.client.setCredentials(cred.accessKey, cred.secretKey);

            if (cred.endPoint && cred.endPoint != "") {
                var endpoint = new Endpoint("", cred.endPoint)
                this.selectEndpoint(endpoint);
            }
            ew_toolbar.update();
            return true;
        }
        return false;
    },

    switchCredentials : function(cred)
    {
        if (this.locked || this.client.disabled) return;

        if (this.selectCredentials(cred)) {
            this.loadAllTags();

            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();

            // Set the active tab to the last tab we were viewing
            this.selectTab(this.prefs.getCurrentTab());
        }
    },

    getActiveEndpoint : function()
    {
        var name = this.prefs.getLastUsedEndpoint();
        var endpoint = this.endpointmap.get(name);
        return endpoint ? endpoint : new Endpoint(name, this.prefs.getServiceURL());
    },

    selectEndpoint: function(endpoint)
    {
        if (endpoint != null) {
            debug("switch endpoint to " + endpoint.name)
            this.prefs.setLastUsedEndpoint(endpoint.name);
            this.prefs.setServiceURL(endpoint.url);
            this.client.setEndpoint(endpoint);

            ew_toolbar.update();
            return true;
        }
        return false;
    },

    switchEndpoints : function(name)
    {
        if (this.locked || this.client.disabled) return;

        var wasGovCloud = this.client.isGovCloud();
        var endpoint = this.endpointmap.get(name);
        if (this.selectEndpoint(endpoint)) {

            // Switching between GovClound, reset credentials
            if (this.client.isGovCloud() != wasGovCloud) {
                debug('disable credentials when switching GovCloud')
                this.client.setCredentials("", "");
                this.prefs.setLastUsedAccount("");
                ew_toolbar.update();
            }
            this.loadAllTags();

            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();

            // Set the active tab to the last tab we were viewing
            this.selectTab(this.prefs.getCurrentTab());
        } else {
            // There are no endpoints in the system, let's ask the user to enter them
            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            var text = "Would you like to provide an EC2 Endpoint?";
            // if the user says no, the return value will not be 0 in this case, just fall out.
            if (promptService.confirmEx(window, "EC2 Endpoint Needed", text, promptService.STD_YES_NO_BUTTONS | promptService.BUTTON_POS_0_DEFAULT, "", "", "", null, {})) {
                // Reset the endpoint stored in the client and prefs
                this.client.setEndpoint(new Endpoint());
                this.prefs.setServiceURL("");
            } else {
                this.manageEndpoints();
            }
        }
    },

    loadEndpointMap : function()
    {
        this.endpointmap = this.prefs.getEndpointMap();
    },

    getEndpoints : function()
    {
        return this.endpointmap.toArray(function(k, v) { return new Endpoint(k, v.url) });
    },

    loadAllTags : function()
    {
        this.imageTags = this.prefs.getImageTags();
        this.instanceTags = this.prefs.getInstanceTags();
        this.volumeTags = this.prefs.getVolumeTags();
        this.snapshotTags = this.prefs.getSnapshotTags();
        this.eipTags = this.prefs.getEIPTags();
        this.vpcTags = this.prefs.getVpcTags();
        this.subnetTags = this.prefs.getSubnetTags();
        this.dhcpOptionsTags = this.prefs.getDhcpOptionsTags();
        this.vpnTags = this.prefs.getVpnConnectionTags();
        this.cgwTags = this.prefs.getCustomerGatewayTags();
        this.vgwTags = this.prefs.getVpnGatewayTags();
    },

    setResourceTag : function(id, tag)
    {
        if (!tag || tag.length == 0) return;

        tag = escape(tag);
        if (id.match(ew_InstancesTreeView.instanceIdRegex)) {
            this.instanceTags.put(id, tag, "setInstanceTags");
        } else
        if (id.match(ew_AMIsTreeView.imageIdRegex)) {
            this.imageTags.put(id, tag, "setImageTags");
        } else
        if (id.match(ew_VolumeTreeView.imageIdRegex)) {
            this.volumeTags.put(id, tag, "setVolumeTags");
        } else
        if (id.match(ew_SnapshotTreeView.imageIdRegex)) {
            this.snapshotTags.put(id, tag, "setSnapshotTags");
        } else
        if (id.match(ew_ElasticIPTreeView.imageIdRegex)) {
            this.eipTags.put(id, tag, "setEIPTags");
        } else
        if (id.match(ew_VpcTreeView.imageIdRegex)) {
            this.vpcTags.put(id, tag, "setVpcTags");
        } else
        if (id.match(ew_SubnetsTreeView.imageIdRegex)) {
            this.subnetTags.put(id, tag, "setSubnetTags");
        } else
        if (id.match(ew_DhcpoptsTreeView.imageIdRegex)) {
            this.dhcpOptionsTags.put(id, tag, "setDhcpOptionsTags");
        } else
        if (id.match(ew_VpnConnectionTreeView.imageIdRegex)) {
            this.vpnTags.put(id, tag, "setVpnConnectionTags");
        } else
        if (id.match(ew_VpnGatewayTreeView.imageIdRegex)) {
            this.vgwTags.put(id, tag, "setVpnGatewayTags");
        } else
        if (id.match(ew_CustomerGatewayTreeView.imageIdRegex)) {
            this.cgwTags.put(id, tag, "setCustomerGatewayTags");
        }
    },

    getResourceTag : function(id)
    {
        var tag = "";
        if (id.match(ew_InstancesTreeView.instanceIdRegex)) {
            tag = this.instanceTags.get(id);
        } else
        if (id.match(ew_VolumeTreeView.imageIdRegex)) {
            tag = this.volumeTags.get(id);
        } else
        if (id.match(ew_SnapshotTreeView.imageIdRegex)) {
            tag = this.snapshotTags.get(id);
        } else
        if (id.match(regExs["ami"])) {
            tag = this.imageTags.get(id);
        } else
        if (id.match(ew_ElasticIPTreeView.imageIdRegex)) {
            tag = this.eipTags.get(id);
        } else
        if (id.match(ew_VpcTreeView.imageIdRegex)) {
            tag = this.vpcTags.get(id);
        } else
        if (id.match(ew_SubnetsTreeView.imageIdRegex)) {
            tag = this.subnetTags.get(id);
        } else
        if (id.match(ew_DhcpoptsTreeView.imageIdRegex)) {
            tag = this.dhcpOptionsTags.get(id);
        } else
        if (id.match(ew_VpnConnectionTreeView.imageIdRegex)) {
            tag = this.vpnTags.get(id);
        } else
        if (id.match(ew_VpnGatewayTreeView.imageIdRegex)) {
            tag = this.vgwTags.get(id);
        } else
        if (id.match(ew_CustomerGatewayTreeView.imageIdRegex)) {
            tag = this.cgwTags.get(id);
        }

        if (tag) return unescape(tag);
        return "";
    },

    getResourceTags : function(resourceType)
    {
        switch (resourceType) {
        case this.model.resourceMap.instances:
            return this.instanceTags;
        case this.model.resourceMap.volumes:
            return this.volumeTags;
        case this.model.resourceMap.snapshots:
            return this.snapshotTags;
        case this.model.resourceMap.images:
            return this.imageTags;
        case this.model.resourceMap.eips:
            return this.eipTags;
        case this.model.resourceMap.vpcs:
            return this.vpcTags;
        case this.model.resourceMap.subnets:
            return this.subnetTags;
        case this.model.resourceMap.dhcpOptions:
            return this.dhcpOptionsTags;
        case this.model.resourceMap.vpnConnections:
            return this.vpnTags;
        case this.model.resourceMap.vpnGateways:
            return this.vgwTags;
        case this.model.resourceMap.customerGateways:
            return this.cgwTags;
        default:
            return null;
        }
    },

    setResourceTags : function(resourceType, tags)
    {
        switch (resourceType) {
        case this.model.resourceMap.instances:
            // The Tags must first be persisted to the prefs store
            this.prefs.setInstanceTags(tags);

            this.instanceTags = null;
            // Retrieve the appropriate data structure from the store
            this.instanceTags = this.prefs.getInstanceTags();
            break;

        case this.model.resourceMap.volumes:
            // The Tags must first be persisted to the prefs store
            this.prefs.setVolumeTags(tags);

            this.volumeTags = null;
            // Retrieve the appropriate data structure from the store
            this.volumeTags = this.prefs.getVolumeTags();
            break;

        case this.model.resourceMap.snapshots:
            // The Tags must first be persisted to the prefs store
            this.prefs.setSnapshotTags(tags);

            this.snapshotTags = null;
            // Retrieve the appropriate data structure from the store
            this.snapshotTags = this.prefs.getSnapshotTags();
            break;

        case this.model.resourceMap.images:
            // The Tags must first be persisted to the prefs store
            this.prefs.setImageTags(tags);

            this.imageTags = null;
            // Retrieve the appropriate data structure from the store
            this.imageTags = this.prefs.getImageTags();
            break;

        case this.model.resourceMap.eips:
            // The Tags must first be persisted to the prefs store
            this.prefs.setEIPTags(tags);

            this.eipTags = null;
            // Retrieve the appropriate data structure from the store
            this.eipTags = this.prefs.getEIPTags();
            break;

        case this.model.resourceMap.vpcs:
            // The Tags must first be persisted to the prefs store
            this.prefs.setVpcTags(tags);

            this.vpcTags = null;
            // Retrieve the appropriate data structure from the store
            this.vpcTags = this.prefs.getVpcTags();
            break;

        case this.model.resourceMap.subnets:
            // The Tags must first be persisted to the prefs store
            this.prefs.setSubnetTags(tags);

            this.subnetTags = null;
            // Retrieve the appropriate data structure from the store
            this.subnetTags = this.prefs.getSubnetTags();
            break;

        case this.model.resourceMap.dhcpOptions:
            // The Tags must first be persisted to the prefs store
            this.prefs.setDhcpOptionsTags(tags);

            this.dhcpOptionsTags = null;
            // Retrieve the appropriate data structure from the store
            this.dhcpOptionsTags = this.prefs.getDhcpOptionsTags();
            break;

        case this.model.resourceMap.vpnConnections:
            // The Tags must first be persisted to the prefs store
            this.prefs.setVpnConnectionTags(tags);

            this.vpnTags = null;
            // Retrieve the appropriate data structure from the store
            this.vpnTags = this.prefs.getVpnConnectionTags();
            break;

        case this.model.resourceMap.vpnGateways:
            // The Tags must first be persisted to the prefs store
            this.prefs.setVpnGatewayTags(tags);

            this.vgwTags = null;
            // Retrieve the appropriate data structure from the store
            this.vgwTags = this.prefs.getVpnGatewayTags();
            break;

        case this.model.resourceMap.customerGateways:
            // The Tags must first be persisted to the prefs store
            this.prefs.setCustomerGatewayTags(tags);

            this.cgwTags = null;
            // Retrieve the appropriate data structure from the store
            this.cgwTags = this.prefs.getCustomerGatewayTags();
            break;
        }
    },

    manageTools : function()
    {
        if (this.locked || this.client.disabled) return;
        window.openDialog("chrome://ew/content/dialogs/manage_tools.xul", null, "chrome,centerscreen,modal, resizable", this);
    },

    lookupAccountId : function(id)
    {
        return id;
    },

    displayAbout : function()
    {
        window.openDialog("chrome://ew/content/dialogs/about.xul", null, "chrome,centerscreen,modal,resizable", this.client);
    },

    displayHelp : function()
    {
        window.openDialog("chrome://ew/content/dialogs/help.xul", null, "chrome,centerscreen,modal,resizable", this.client);
    },

    generateCertificate : function(name)
    {
        // Make sure we have directory
        if (!this.prefs.makeKeyHome()) {
            return 0
        }

        var certfile = this.prefs.getCertificateFile(name);
        var keyfile = this.prefs.getPrivateKeyFile(name);
        var pubfile = this.prefs.getPublicKeyFile(name);
        var openssl = this.prefs.getOpenSSLCommand();
        var conffile = this.prefs.getKeyHome() + DirIO.sep + "openssl.cnf"

        FileIO.remove(certfile);
        FileIO.remove(keyfile);
        FileIO.remove(pubfile);
        FileIO.remove(conffile);

        // Create openssl config file
        var confdata = "[req]\nprompt=no\ndistinguished_name=n\nx509_extensions=c\n[c]\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always,issuer\nbasicConstraints=CA:true\n[n]\nCN=EC2\nOU=EC2\nemailAddress=ec2@amazonaws.com\n"
        FileIO.write(FileIO.open(conffile), confdata)

        // Create private and cert files
        this.prefs.setEnv("OPENSSL_CONF", conffile);
        this.launchProcess(openssl, [ "genrsa", "-out", keyfile, "1024" ], true);
        if (!waitForFile(keyfile, 5000)) {
            debug("ERROR: no private key generated")
            FileIO.remove(conffile);
            return 0
        }
        FileIO.open(keyfile).permissions = 0600;

        this.launchProcess(openssl, [ "req", "-new", "-x509", "-nodes", "-sha1", "-days", "730", "-key", keyfile, "-out", certfile, "-config", conffile ], true);
        if (!waitForFile(certfile, 5000)) {
            debug("ERROR: no certificate generated")
            FileIO.remove(conffile);
            return 0
        }

        // Create public file
        this.launchProcess(openssl, [ "rsa", "-in", keyfile, "-pubout", "-out", pubfile ], true)
        // Wait a little because if process is running in the background on Windows it may take some time but we return immediately
        if (!waitForFile(pubfile, 5000)) {
            debug("ERROR: no public file generated")
            FileIO.remove(conffile);
            return 0
        }
        FileIO.remove(conffile);

        return FileIO.toString(certfile)
    },

    launchShell : function(name)
    {
        // Make sure we have directory
        if (!this.prefs.makeKeyHome()) {
            return 0
        }

        // Save current acces key into file
        FileIO.write(FileIO.open(this.prefs.getCredentialFile(name)), "AWSAccessKeyId=" + ew_client.accessCode + "\nAWSSecretKey=" + ew_client.secretKey + "\n")

        // Setup environment
        this.prefs.setEnv("EC2_URL", ew_client.serviceURL);
        this.prefs.setEnv("EC2_PRIVATE_KEY", this.prefs.getPrivateKeyFile(name));
        this.prefs.setEnv("EC2_CERT", this.prefs.getCertificateFile(name));
        this.prefs.setEnv("AWS_CREDENTIAL_FILE", this.prefs.getCredentialFile(name));
        this.prefs.setEnv("AWS_IAM_URL", ew_client.getIAMURL());

        // Current PATH
        var path = this.prefs.getEnv("PATH");
        var sep = isWindows(navigator.platform) ? ";" : ":";

        // Update path to the command line tools
        var paths = [this.prefs.JAVA_TOOLS_PATH, this.prefs.EC2_TOOLS_PATH, this.prefs.IAM_TOOLS_PATH, this.prefs.AMI_TOOLS_PATH, this.prefs.CLOUDWATCH_TOOLS_PATH, this.prefs.AWS_AUTOSCALING_TOOLS_PATH];
        for(var i in paths) {
            var p = this.prefs.getStringPreference(paths[i], "");
            if (p == "") {
                continue;
            }
            this.prefs.setEnv(paths[i].split(".").pop().toUpperCase(), p);
            path += sep + p + DirIO.sep + "bin";
        }
        debug(path)
        this.prefs.setEnv("PATH", path);
        this.launchProcess(this.prefs.getShellCommand(), []);
    },

    launchProcess : function(cmd, args, block)
    {
        debug("launch: " + cmd + " " + args.join(" "));

        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(cmd);

        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        try {
            process.init(file);
        }
        catch (e) {
            alert("Couldn't launch: " + cmd + "\n\n" + e.message);
            return false;
        }

        try {
            process.run(block, args, args.length);
            debug("launch: " + cmd + " finished with status " + process.exitValue)
        }
        catch (e) {
            alert("Couldn't launch: " + cmd + "\nWith arguments: " + args.join(" ") + "\n\n" + e.message);
            return false
        }
        return true
    },

    promptList: function(title, msg, items, columns, width)
    {
        var list = []
        for (var i = 0; i < items.length; i++) {
            if (typeof items[i] == "object") {
                var item = ""
                if (!columns && items[i].toString) {
                    item = items[i].toString()
                } else {
                    for (p in items[i]) {
                        if (typeof items[i][p] == "function") continue;
                        if (!columns || columns.indexOf(p) >= 0) {
                            item += (item != "" ? " | " : "") + ew_model.modelValue(p, items[i][p])
                        }
                    }
                }
                list.push(item)
            } else {
                list.push(items[i])
            }
        }

        var rc = { value: -1 };
        window.openDialog("chrome://ew/content/dialogs/select.xul", null, "chrome,centerscreen,modal,resizable", title, msg, list, rc, width);
        return rc.value
    },

    promptForFile : function(msg, save, filename)
    {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, msg, save ? nsIFilePicker.modeSave : nsIFilePicker.modeOpen);
        fp.displayDirectory = FileIO.open(this.prefs.getKeyHome());
        fp.defaultString = filename || ""
        if (fp.show() != nsIFilePicker.returnCancel) {
            return fp.file.path;
        }
        return null
    },

    promptForDir : function(msg, save)
    {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, msg, nsIFilePicker.modeGetFolder);
        fp.displayDirectory = FileIO.open(this.prefs.getKeyHome());
        if (fp.show() != nsIFilePicker.returnCancel) {
            return fp.file.path;
        }
        return null
    },

    promptYesNo : function(title, text)
    {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        return promptService.confirmEx(window, title, text, promptService.STD_YES_NO_BUTTONS| promptService.BUTTON_POS_0_DEFAULT, "", "", "", null, {}) == 0
    },

    promptForPin: function() {
        var me = this;
        var pin = this.getPassword('ew.pin');
        // If already disabled or no pin just ignore, once pin appeared the only way to hide it by entering correct pin
        if (this.pinPrompt || pin == '') return;
        this.client.disabled = true;

        // Use timer so we do not block all the time and give a chance to proces events
        setTimeout(function() {
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            var pw = { value: "" };
            me.pinPrompt = true;
            var rc = prompts.promptPassword(null, "PIN", "Enter access PIN:", pw, null, {});
            me.pinPrompt = false;
            if (!rc) {
                me.quit();
            } else
            if (pw.value == pin) {
                me.client.disabled = false;
            } else {
                me.promptForPin();
            }
        }, 10);
    },

    promptForTag: function(tag)
    {
        var rc = { accepted : false, result : null };
        openDialog('chrome://ew/content/dialogs/tag.xul', null, 'chrome,centerscreen,modal,width=400,height=250', tag, rc);
        return rc.accepted ? (rc.result || '').trim() : null;
    },

    savePassword : function(key, secret)
    {
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
        var login = new nsLoginInfo(this.client.HOST, null, this.client.REALM, key, secret, "", "");
        var logins = loginManager.findLogins({}, this.client.HOST, "", this.client.REALM);
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username == key) {
                log("modifying password: " + key)
                loginManager.modifyLogin(logins[i], login);
                return false
            }
        }
        log("adding password: " + key)
        loginManager.addLogin(login);
        return true
    },

    deletePassword : function(key)
    {
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
        var logins = loginManager.findLogins({}, this.client.HOST, "", this.client.REALM);
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username == key) {
                log("removing password: " + key)
                loginManager.removeLogin(logins[i]);
                return true
            }
        }
        return false
    },

    getPassword : function(key)
    {
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
        var logins = loginManager.findLogins({}, this.client.HOST, "", this.client.REALM);
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username == key) {
                return logins[i].password;
            }
        }
        return ""
    },

    getPasswordList : function(prefix)
    {
        var list = []
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
        var logins = loginManager.findLogins({}, this.client.HOST, "", this.client.REALM);
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username.indexOf(prefix) == 0) {
                list.push([ logins[i].username, logins[i].password ])
            }
        }
        return list
    },

    tagResource: function(obj, attr)
    {
        if (!attr) attr = "id";
        var tag = this.promptForTag(obj.tag);
        if (tag == null) return;

        obj.tag = tag;
        __addNameTagToModel__(obj.tag, obj);
        this.setResourceTag(obj[attr], obj.tag);
        this.__tagging2ec2__([ obj[attr] ], obj.tag);
    },

    tagMultipleResources: function(list, attr)
    {
        if (!list) return;

        if (!attr) attr = "id";

        var tag = this.promptForTag(list[0].tag);
        if (!tag) return;

        var res = null;
        var resIds = new Array();
        for ( var i = 0; i < list.length; ++i) {
            res = list[i];
            res.tag = __concatTags__(res.tag, tag);
            __addNameTagToModel__(res.tag, res);
            this.setResourceTag(res[attr], res.tag);
            resIds.push(res[attr]);
        }
        this.__tagging2ec2__(resIds, tag, true);
    },

    __tagging2ec2__: function(resIds, tagString, disableDeleteTags)
    {
        var me = this;
        var multiIds = new Array();
        var multiTags = new Array();

        try {
            var tags = new Array();
            tagString += ',';
            var keyValues = (tagString.match(/\s*[^,":]+\s*:\s*("(?:[^"]|"")*"|[^,]*)\s*,\s*/g) || []);

            for ( var i = 0; i < keyValues.length; i++) {
                var kv = keyValues[i].split(/\s*:\s*/, 2);
                var key = (kv[0] || "").trim();
                var value = (kv[1] || "").trim();
                value = value.replace(/,\s*$/, '').trim();
                value = value.replace(/^"/, '').replace(/"$/, '').replace(/""/, '"');

                if (key.length == 0 || value.length == 0) {
                    continue;
                }
                tags.push([ key, value ]);
            }

            for ( var i = 0; i < resIds.length; i++) {
                var resId = resIds[i];

                for ( var j = 0; j < tags.length; j++) {
                    multiIds.push(resId);
                }
                multiTags = multiTags.concat(tags);
            }

            if (multiIds.length == 0) {
                multiIds = resIds;
            }

            this.controller.describeTags(resIds, function(described) {
                var delResIds = new Array();
                var delKyes = new Array();

                for ( var i = 0; i < described.length; i++) {
                    delResIds.push(described[i][0]);
                    delKyes.push(described[i][1]);
                }
                if (!disableDeleteTags) {
                    if (delResIds.length > 0 && delKyes.length > 0) {
                        me.controller.deleteTags(delResIds, delKyes);
                    }
                }
                if (multiTags.length > 0) {
                    me.controller.createTags(multiIds, multiTags);
                }
            });
        }
        catch (e) {
            alert(e);
        }
    },

};
