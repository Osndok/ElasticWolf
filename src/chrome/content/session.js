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
    accountidmap : null,
    endpointmap : null,
    endpointMenu: null,
    credMenu: null,
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

    initialize : function(tabs)
    {
        this.tabs = tabs;
        this.controller = ew_controller;
        this.model = ew_model;
        this.client = ew_client;
        this.preferences = ew_prefs;
        this.endpointMenu = $('ew.active.endpoints.list');
        this.credMenu = $('ew.active.credentials.list');
        this.tabMenu = $("ew.tabs");

        ew_prefs.init();
        document.title = ew_prefs.getAppName();

        var menu = $("ew.menu.view");
        for (var i in this.tabs) {
            var b = document.createElement("menuitem");
            b.setAttribute("label", getProperty(this.tabs[i].tab));
            b.setAttribute("type", "checkbox");
            b.setAttribute("checked", ew_prefs.getBoolPreference(this.tabs[i], true));
            b.setAttribute("oncommand", "ew_session.checkTab(" + i + ")");
            menu.appendChild(b);
            // Connect views to trees
            for (var v in this.tabs[i].views) {
                $(this.tabs[i].views[v].id).view = this.tabs[i].views[v].view;
            }
        }

        this.createToolbar();
        this.loadAccountIdMap();
        this.loadCredentials();
        this.loadEndpointMap();
        this.switchCredentials();
        this.loadAllTags();

        // Parse command line
        this.cmdLine = window.arguments[0].QueryInterface(Components.interfaces.nsICommandLine);

        // Passing credentials
        var name = this.cmdLine.handleFlagWithParam('name', true);
        var key = this.cmdLine.handleFlagWithParam('key', true);
        var secret = this.cmdLine.handleFlagWithParam('secret', true);
        var endpoint = this.cmdLine.handleFlagWithParam('endpoint', true);
        if (key && key != '' && secret && secret != '') {
            var cred = new Credential(name || 'AWS', key, secret, endpoint);
            this.credMenu.removeAllItems();
            this.credMenu.appendItem(cred.name, cred.name);
            this.switchCredentials(cred);
        } else

        if (endpoint && endpoint != '') {
            var e = new Endpoint("", endpoint);
            this.endpointMenu.removeAllItems();
            this.endpointMenu.appendItem(e.name, e.name);
            this.switchEndpoints(e);
        }

        // Disable credentials management
        this.locked = this.cmdLine.handleFlag('lock', true);
        this.initialized = true;
    },

    quit: function()
    {
        var app = Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
        app.quit(Components.interfaces.nsIAppStartup.eForceQuit);
    },

    createToolbar: function() {
        var container = $("ew.toolbar");
        for (var i = container.childNodes.length; i > 0; i--) {
            container.removeChild(container.childNodes[0]);
        }
        for (var i in this.tabs) {
            if (ew_prefs.getBoolPreference(this.tabs[i].tab, true)) {
                var b = document.createElement("toolbarbutton");
                b.setAttribute("label", getProperty(this.tabs[i].tab));
                b.setAttribute("class", "ew_button");
                b.setAttribute("oncommand", "ew_session.selectTab(" + i + ")");
                container.appendChild(b);
            }
        }
        this.selectTab(ew_prefs.getCurrentTab());
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

    checkTab: function(index) {
        if (index >= 0 && index < this.tabs.length) {
            ew_prefs.setBoolPreference(this.tabs[index], !ew_prefs.getBoolPreference(this.tabs[index], true));
            this.createToolbar();
        }
    },

    selectTab: function(index, name) {
        if (index >= 0) {
            this.tabMenu.selectedIndex = index;
            this.tabSelectionChanged();
        } else
        if (name) {
            for (var i in this.tabs) {
                if (this.tabs[i].tab == name) {
                    this.tabMenu.selectedIndex = i;
                    this.tabSelectionChanged();
                    break;
                }
            }
        }
    },

    tabSelectionChanged : function(event)
    {
        // update selected button
        var container = $("ew.toolbar");
        for (var i = 0; i < container.childNodes.length; i++) {
            container.childNodes[i].setAttribute("class", "ew_button" + (i == this.tabMenu.selectedIndex ? " ew_button_selected" : ""));
        }

        // Stop the refresh timers of all tabs
        for (var tab in this.refreshedTabs) {
            if (this.refreshedTabs[tab] == 1) {
                this.refreshedTabs[tab] = 0;
                log("Stopping Refresh of tab: " + tab);
                eval(tab + ".stopRefreshTimer()");
            }
        }

        // Refresh if no records yet
        var tab = this.tabs[this.tabMenu.selectedIndex];
        for (var i in tab.views) {
            if (tab.views[i].view.rowCount == 0) {
                tab.views[i].view.refresh();
            }
        }
        ew_prefs.setCurrentTab(this.tabMenu.selectedIndex);
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
        this.savePassword('Cred:' + cred.name, cred.toStr())
    },

    checkCredentials: function() {
        if (!this.credentials.length) {
            return this.manageCredentials();
        }
        return false;
    },

    manageCredentials : function()
    {
        if (this.locked) return;
        window.openDialog("chrome://ew/content/dialog_manage_credentials.xul", null, "chrome,centerscreen, modal, resizable", ew_session);
        this.loadCredentials();
    },

    loadCredentials : function()
    {
        this.credMenu.removeAllItems();

        var lastUsedCred = ew_prefs.getLastUsedAccount();
        this.credentials = this.getCredentials();
        for ( var i in this.credentials) {
            this.credMenu.insertItemAt(i, this.credentials[i].name, this.credentials[i].name);
            if (lastUsedCred == this.credentials[i].name) {
                this.credMenu.selectedIndex = i;
            }
        }

        if (this.credentials.length == 0) {
            // invalidate all the views
            this.model.invalidate();
            // Reset the credentials stored in the client
            this.client.setCredentials("", "");
            // Fake credential to show setup dialog
            this.credMenu.appendItem("Setup Credentials");
            this.credMenu.selectedIndex = 0;
        }
    },

    getActiveCredential : function()
    {
        if (this.credentials != null && this.credentials.length > 0) {
            if (this.credMenu.selectedIndex == -1) {
                this.credMenu.selectedIndex = 0;
            }
            return this.credentials[this.credMenu.selectedIndex];
        }
        return null;
    },

    switchCredentials : function(cred)
    {
        if (this.locked) return;
        if (!cred) {
            cred = this.getActiveCredential();
        } else {
            this.credMenu.value = cred.name;
        }

        if (cred != null) {
            debug("switch credentials to " + cred.name)
            ew_prefs.setLastUsedAccount(cred.name);
            this.client.setCredentials(cred.accessKey, cred.secretKey);

            if (cred.endPoint && cred.endPoint != "") {
                var endpoint = new Endpoint("", cred.endPoint)
                this.client.setEndpoint(endpoint);
                for ( var i = 0; i < this.endpointMenu.itemCount; i++) {
                    if (this.ndpointMenu.getItemAtIndex(i).value == endpoint.name) {
                        this.endpointMenu.selectedIndex = i
                    }
                }
                if (this.endpointMenu.value != endpoint.name) {
                    this.endpointMenu.appendItem(endpoint.name, endpoint.name);
                    this.endpointMenu.selectedIndex = this.endpointMenu.itemCount - 1
                    this.endpointmap.put(endpoint.name, endpoint);
                    log("add endpoint " + endpoint.name)
                }
                ew_prefs.setLastUsedEndpoint(endpoint.name);
            }
            this.loadAllTags();

            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();

            // Set the active tab to the last tab we were viewing
            this.selectTab(ew_prefs.getCurrentTab());
        }
    },

    getActiveEndpoint : function(name)
    {
        var activeEndpointname = name || this.endpointMenu.value;

        if (activeEndpointname == null || activeEndpointname.length == 0) {
            activeEndpointname = ew_prefs.getLastUsedEndpoint();
        }
        if (this.endpointmap == null) {
            return new Endpoint(activeEndpointname, ew_prefs.getServiceURL());
        } else {
            return this.endpointmap.get(activeEndpointname);
        }
    },

    switchEndpoints : function(name)
    {
        if (this.locked) return;
        var activeEndpoint = this.getActiveEndpoint(name);

        if (activeEndpoint != null) {
            debug("switch endpoint to " + activeEndpoint.name)
            ew_prefs.setLastUsedEndpoint(activeEndpoint.name);
            ew_prefs.setServiceURL(activeEndpoint.url);
            this.client.setEndpoint(activeEndpoint);
            this.loadAllTags();

            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();

            // Set the active tab to the last tab we were viewing
            this.selectTab(ew_prefs.getCurrentTab());
        } else {
            // There are no endpoints in the system, let's ask the user to enter them
            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            var text = "Would you like to provide an EC2 Endpoint?";
            // if the user says no, the return value will not be 0 in this case, just fall out.
            if (promptService.confirmEx(window, "EC2 Endpoint Needed", text, promptService.STD_YES_NO_BUTTONS | promptService.BUTTON_POS_0_DEFAULT, "", "", "", null, {})) {
                // Reset the endpoint stored in the client and prefs
                this.client.setEndpoint(new Endpoint());
                ew_prefs.setServiceURL("");
            } else {
                this.manageEndpoints();
            }
        }
    },

    loadEndpointMap : function()
    {
        this.endpointmap = ew_prefs.getEndpointMap();
        this.endpointMenu.removeAllItems();
        var lastUsedEndpoint = ew_prefs.getLastUsedEndpoint();
        var endpointlist = this.endpointmap.toArray(function(k, v) { return new Endpoint(k, v.url) });

        for (var i in endpointlist) {
            this.endpointMenu.insertItemAt(i, endpointlist[i].name, endpointlist[i].name);
            if (lastUsedEndpoint == endpointlist[i].name) {
                this.endpointMenu.selectedIndex = i;
            }
        }
    },

    manageEndpoints : function()
    {
        if (this.locked) return;
        window.openDialog("chrome://ew/content/dialog_manage_endpoints.xul", null, "chrome,centerscreen,modal,resizable", this, this);
        this.loadEndpointMap();
    },

    getEndpoints : function()
    {
        return this.endpointmap.toArray(function(k, v) { return new Endpoint(k, v.url) });
    },

    loadAllTags : function()
    {
        this.imageTags = ew_prefs.getImageTags();
        this.instanceTags = ew_prefs.getInstanceTags();
        this.volumeTags = ew_prefs.getVolumeTags();
        this.snapshotTags = ew_prefs.getSnapshotTags();
        this.eipTags = ew_prefs.getEIPTags();
        this.vpcTags = ew_prefs.getVpcTags();
        this.subnetTags = ew_prefs.getSubnetTags();
        this.dhcpOptionsTags = ew_prefs.getDhcpOptionsTags();
        this.vpnTags = ew_prefs.getVpnConnectionTags();
        this.cgwTags = ew_prefs.getCustomerGatewayTags();
        this.vgwTags = ew_prefs.getVpnGatewayTags();
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
        if (id.match(ew_SubnetTreeView.imageIdRegex)) {
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
        if (id.match(ew_SubnetTreeView.imageIdRegex)) {
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
            ew_prefs.setInstanceTags(tags);

            this.instanceTags = null;
            // Retrieve the appropriate data structure from the store
            this.instanceTags = ew_prefs.getInstanceTags();
            break;

        case this.model.resourceMap.volumes:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setVolumeTags(tags);

            this.volumeTags = null;
            // Retrieve the appropriate data structure from the store
            this.volumeTags = ew_prefs.getVolumeTags();
            break;

        case this.model.resourceMap.snapshots:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setSnapshotTags(tags);

            this.snapshotTags = null;
            // Retrieve the appropriate data structure from the store
            this.snapshotTags = ew_prefs.getSnapshotTags();
            break;

        case this.model.resourceMap.images:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setImageTags(tags);

            this.imageTags = null;
            // Retrieve the appropriate data structure from the store
            this.imageTags = ew_prefs.getImageTags();
            break;

        case this.model.resourceMap.eips:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setEIPTags(tags);

            this.eipTags = null;
            // Retrieve the appropriate data structure from the store
            this.eipTags = ew_prefs.getEIPTags();
            break;

        case this.model.resourceMap.vpcs:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setVpcTags(tags);

            this.vpcTags = null;
            // Retrieve the appropriate data structure from the store
            this.vpcTags = ew_prefs.getVpcTags();
            break;

        case this.model.resourceMap.subnets:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setSubnetTags(tags);

            this.subnetTags = null;
            // Retrieve the appropriate data structure from the store
            this.subnetTags = ew_prefs.getSubnetTags();
            break;

        case this.model.resourceMap.dhcpOptions:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setDhcpOptionsTags(tags);

            this.dhcpOptionsTags = null;
            // Retrieve the appropriate data structure from the store
            this.dhcpOptionsTags = ew_prefs.getDhcpOptionsTags();
            break;

        case this.model.resourceMap.vpnConnections:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setVpnConnectionTags(tags);

            this.vpnTags = null;
            // Retrieve the appropriate data structure from the store
            this.vpnTags = ew_prefs.getVpnConnectionTags();
            break;

        case this.model.resourceMap.vpnGateways:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setVpnGatewayTags(tags);

            this.vgwTags = null;
            // Retrieve the appropriate data structure from the store
            this.vgwTags = ew_prefs.getVpnGatewayTags();
            break;

        case this.model.resourceMap.customerGateways:
            // The Tags must first be persisted to the prefs store
            ew_prefs.setCustomerGatewayTags(tags);

            this.cgwTags = null;
            // Retrieve the appropriate data structure from the store
            this.cgwTags = ew_prefs.getCustomerGatewayTags();
            break;
        }
    },

    manageTools : function()
    {
        if (this.locked) return;
        window.openDialog("chrome://ew/content/dialog_manage_tools.xul", null, "chrome,centerscreen,modal, resizable");
    },

    loadAccountIdMap : function()
    {
        this.accountidmap = ew_prefs.getAccountIdMap();
    },

    manageAccountIds : function()
    {
        if (this.locked) return;
        window.openDialog("chrome://ew/content/dialog_manage_accountids.xul", null, "chrome,centerscreen,modal,resizable", this.accountidmap);
        this.loadAccountIdMap();
    },

    lookupAccountId : function(id)
    {
        if (this.accountidmap == null) {
            return id;
        }
        if (this.accountidmap.get(id) == null) {
            return id;
        }
        return this.accountidmap.get(id);
    },

    displayAbout : function()
    {
        window.openDialog("chrome://ew/content/dialog_about.xul", null, "chrome,centerscreen,modal,resizable", this.client);
    },

    displayHelp : function()
    {
        window.openDialog("chrome://ew/content/dialog_help.xul", null, "chrome,centerscreen,modal,resizable", this.client);
    },

    showBusyCursor : function(fShow)
    {
        if (fShow) {
            $("ew-window").setAttribute("wait-cursor", true);
        } else {
            $("ew-window").removeAttribute("wait-cursor");
        }
    },

    generateCertificate : function(name)
    {
        // Make sure we have directory
        if (!ew_prefs.makeKeyHome()) {
            return 0
        }

        var certfile = ew_prefs.getCertificateFile(name);
        var keyfile = ew_prefs.getPrivateKeyFile(name);
        var pubfile = ew_prefs.getPublicKeyFile(name);
        var openssl = ew_prefs.getOpenSSLCommand();
        var conffile = ew_prefs.getKeyHome() + DirIO.sep + "openssl.cnf"

        FileIO.remove(certfile);
        FileIO.remove(keyfile);
        FileIO.remove(pubfile);
        FileIO.remove(conffile);

        // Create openssl config file
        var confdata = "[req]\nprompt=no\ndistinguished_name=n\nx509_extensions=c\n[c]\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always,issuer\nbasicConstraints=CA:true\n[n]\nCN=EC2\nOU=EC2\nemailAddress=ec2@amazonaws.com\n"
        FileIO.write(FileIO.open(conffile), confdata)

        // Create private and cert files
        ew_prefs.setEnv("OPENSSL_CONF", conffile);
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
        if (!ew_prefs.makeKeyHome()) {
            return 0
        }

        // Save current acces key into file
        FileIO.write(FileIO.open(ew_prefs.getCredentialFile(name)), "AWSAccessKeyId=" + ew_client.accessCode + "\nAWSSecretKey=" + ew_client.secretKey + "\n")

        // Setup environment
        ew_prefs.setEnv("EC2_URL", ew_client.serviceURL);
        ew_prefs.setEnv("EC2_PRIVATE_KEY", ew_prefs.getPrivateKeyFile(name));
        ew_prefs.setEnv("EC2_CERT", ew_prefs.getCertificateFile(name));
        ew_prefs.setEnv("AWS_CREDENTIAL_FILE", ew_prefs.getCredentialFile(name));
        ew_prefs.setEnv("AWS_IAM_URL", ew_client.getIAMURL());

        // Current PATH
        var path = ew_prefs.getEnv("PATH");
        var sep = isWindows(navigator.platform) ? ";" : ":";

        // Update path to the command line tools
        var paths = [ew_prefs.JAVA_TOOLS_PATH, ew_prefs.EC2_TOOLS_PATH, ew_prefs.IAM_TOOLS_PATH, ew_prefs.AMI_TOOLS_PATH, ew_prefs.CLOUDWATCH_TOOLS_PATH, ew_prefs.AWS_AUTOSCALING_TOOLS_PATH];
        for(var i in paths) {
            var p = ew_prefs.getStringPreference(paths[i], "");
            if (p == "") {
                continue;
            }
            ew_prefs.setEnv(paths[i].split(".").pop().toUpperCase(), p);
            path += sep + p + DirIO.sep + "bin";
        }
        debug(path)
        ew_prefs.setEnv("PATH", path);
        this.launchProcess(ew_prefs.getShellCommand(), []);
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

    promptList: function(title, msg, items, columns)
    {
        var list = []
        for (var i = 0; i < items.length; i++) {
            if (typeof items[i] == "object") {
                var item = ""
                for (p in items[i]) {
                    if (!columns || columns.indexOf(p) > -1) {
                        item += (item != "" ? ": " : "") + items[i][p]
                    }
                }
                list.push(item)
            } else {
                list.push(items[i])
            }
        }

        var selected = {};
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        if (!prompts.select(null, title, msg, list.length, list, selected)) {
            return -1;
        }
        return selected.value
    },

    promptForFile : function(msg, save, filename)
    {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, msg, save ? nsIFilePicker.modeSave : nsIFilePicker.modeOpen);
        fp.displayDirectory = FileIO.open(ew_prefs.getKeyHome());
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
        fp.displayDirectory = FileIO.open(ew_prefs.getKeyHome());
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
    }
};
