//main object that holds the current session information
var ew_session = {
    accessCode : "",
    secretKey : "",
    locked: false,
    controller : null,
    model : null,
    credentials : null,
    cmdline: null,
    endpoints: null,
    serviceURL : "",
    region : "",
    elbURL  : "",
    accessCode : null,
    secretKey : null,
    errorCount: 0,
    errorMax: 3,
    timers : {},
    disabled: false,
    httpCount: 0,

    VERSION: "2.0",
    NAME: 'ElasticWolf',
    EC2_API_VERSION : '2012-05-01',
    ELB_API_VERSION : '2011-11-15',
    IAM_API_VERSION : '2010-05-08',
    APP_SITE: 'https://github.com',
    APP_PATH: '/vseryakov/',
    VPN_CONFIG_PATH : 'https://ec2-downloads.s3.amazonaws.com/',
    SIG_VERSION: '2',
    IAM_GOV_URL: 'https://iam.us-gov.amazonaws.com',
    IAM_URL : 'https://iam.amazonaws.com',
    REALM : 'chrome://ew/',
    HOST  : 'chrome://ew/',

    initialize : function()
    {
        ew_prefs.init();
        ew_menu.init();

        this.controller = ew_controller;
        this.model = ew_model;
        this.prefs = ew_prefs;

        this.loadCredentials();
        this.getEndpoints();

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

    selectTab: function(name) {
        if (this.disabled) return;

        if (ew_menu.select(name)) {
            this.prefs.setCurrentTab(name);
        }
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

    loadCredentials : function()
    {
        this.credentials = this.getCredentials();
        if (this.credentials.length == 0) {
            // invalidate all the views
            this.model.invalidate();
            // Reset the credentials stored in the client
            this.setCredentials("", "");
        }
    },

    getActiveCredentials : function()
    {
        var cur = this.prefs.getLastUsedAccount();
        for (var i in this.credentials) {
            if (cur == this.credentials[i].name) return this.credentials[i];
        }
        return null;
    },

    selectCredentials: function(cred)
    {
        if (cred) {
            debug("switch credentials to " + cred.name)
            this.prefs.setLastUsedAccount(cred.name);
            this.setCredentials(cred.accessKey, cred.secretKey);

            if (cred.endPoint != "") {
                var endpoint = new Endpoint("", cred.endPoint)
                this.selectEndpoint(endpoint);
            }
            ew_menu.update();
            return true;
        }
        return false;
    },

    switchCredentials : function(cred)
    {
        if (this.locked || this.disabled) return;

        var wasGovCloud = this.isGovCloud();
        if (this.selectCredentials(cred)) {
            // GovCloud credentials require endpoint to be set explicitely, switching from GovCloud without explicit endpoint will result in errros
            if (wasGovCloud && cred.endPoint == '') {
                this.selectEndpoint(this.prefs.getEndpoint("us-east-1"));
            }
            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();
        }
    },

    getActiveEndpoint : function()
    {
        var name = this.prefs.getLastUsedEndpoint();
        var endpoint = this.getEndpoint(name);
        return endpoint ? endpoint : new Endpoint(name, this.prefs.getServiceURL());
    },

    selectEndpoint: function(endpoint)
    {
        if (endpoint != null) {
            debug("switch endpoint to " + endpoint.name)
            this.prefs.setLastUsedEndpoint(endpoint.name);
            this.prefs.setServiceURL(endpoint.url);
            this.setEndpoint(endpoint);
            ew_menu.update();
            return true;
        }
        return false;
    },

    switchEndpoints : function(name)
    {
        if (this.locked || this.disabled) return;

        var wasGovCloud = this.isGovCloud();
        var endpoint = this.getEndpoint(name);
        if (this.selectEndpoint(endpoint)) {
            // Switching between GovClound, reset credentials
            if (this.isGovCloud() != wasGovCloud) {
                debug('disable credentials when switching to/from GovCloud')
                this.setCredentials("", "");
                this.prefs.setLastUsedAccount("");
                ew_menu.update();
            }
            // Since we are switching creds, ensure that all the views are redrawn
            this.model.invalidate();
        } else {
            alert('Endpoint ' + name + ' does not exists?')
        }
    },

    getEndpoint: function(name)
    {
        if (this.endpoints) {
            for (var i in this.endpoints) {
                if (this.endpoints[i].name == name) return this.endpoints[i];
            }
        }
        return null;
    },

    addEndpoint: function(name, url)
    {
        if (this.endpoints) {
            for (var i in this.endpoints) {
                if (this.endpoints[i].name == name) return;
            }
            this.endpoints.push(new Endpoint(name, url))
            this.prefs.setEndpoints(this.endpoints);
        }
    },

    deleteEndpoint: function(name)
    {
        if (this.endpoints) {
            for (var i in this.endpoints) {
                if (this.endpoints[i].name == name) {
                    this.endpoints.splice(i, 1);
                    this.prefs.setEndpoints(this.endpoints);
                    break;
                }
            }
        }
    },

    getEndpoints : function()
    {
        if (this.endpoints == null) {
            this.endpoints = [];

            var list = this.prefs.getEndpoints();
            for (var i in list) {
                if (list[i] && list[i].name && list[i].url) {
                    this.endpoints.push(new Endpoint(list[i].name, list[i].url));
                }
            }
            // Default regions
            var regions = this.prefs.getEC2Regions();
            for (var i in regions) {
                if (this.getEndpoint(regions[i].name) == null) {
                    this.endpoints.push(regions[i]);
                }
            }
            this.refreshEndpoints();
        }

        return this.endpoints;
    },

    refreshEndpoints: function()
    {
        // Merge with saved list of regions
        ew_model.getRegions(function(regions) {
            for (var i in regions) {
                if (this.getEndpoint(regions[i].name) == null) {
                    this.endpoints.push(regions[i]);
                }
            }
        });
    },

    displayAbout : function()
    {
        window.openDialog("chrome://ew/content/dialogs/about.xul", null, "chrome,centerscreen,modal,resizable", this);
    },

    displayHelp : function()
    {
        window.openDialog("chrome://ew/content/dialogs/help.xul", null, "chrome,centerscreen,modal,resizable", this);
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
        FileIO.write(FileIO.open(this.prefs.getCredentialFile(name)), "AWSAccessKeyId=" + this.accessCode + "\nAWSSecretKey=" + this.secretKey + "\n")

        // Setup environment
        this.prefs.setEnv("EC2_URL", this.serviceURL);
        this.prefs.setEnv("EC2_PRIVATE_KEY", this.prefs.getPrivateKeyFile(name));
        this.prefs.setEnv("EC2_CERT", this.prefs.getCertificateFile(name));
        this.prefs.setEnv("AWS_CREDENTIAL_FILE", this.prefs.getCredentialFile(name));
        this.prefs.setEnv("AWS_IAM_URL", this.getIAMURL());

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

    promptList: function(title, msg, items, columns, width, multiple, checked)
    {
        var params = { session: ew_session, listItems: items, checkedItems: checked, selectedIndex: -1, selectedItems: [], selectedIndexes: [], columns: columns, width: width, multiple: multiple, title: title, msg: msg };
        window.openDialog("chrome://ew/content/dialogs/select.xul", null, "chrome,centerscreen,modal,resizable", params);
        return params.multiple ? params.selectedItems : params.selectedIndex;
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
        this.disabled = true;

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

    promptForPassword: function(title, text)
    {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        var pw = { value: "" };
        var rc = promptService.promptPassword(null, title, text, pw, null, {});
        return rc ? pw.value : null;
    },

    promptForTag: function(tags)
    {
        var rc = { ok: false, text: String(tags), title: "Tag (ex: Key:Value, Key:Value...) " };
        openDialog('chrome://ew/content/dialogs/text.xul', null, 'chrome,centerscreen,modal,width=400,height=250', rc);
        return rc.ok ? (rc.text || '').replace(/(\n|\r)+/g, ' ').trim() : null;
    },

    promptForText: function(title, text, width, height)
    {
        var rc = { ok: false, text: text, title: title };
        openDialog('chrome://ew/content/dialogs/text.xul', null, 'chrome,centerscreen,modal,width=' + (widht || 400) + ',height=' + (height || 240), rc);
        return rc.ok ? rc.text : null;
    },

    savePassword : function(key, secret)
    {
        if (!secret || secret == "") {
            return this.deletePassword(key);
        }
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
        var login = new nsLoginInfo(this.HOST, null, this.REALM, key, secret, "", "");
        var logins = loginManager.findLogins({}, this.HOST, "", this.REALM);
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
        var logins = loginManager.findLogins({}, this.HOST, "", this.REALM);
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
        var logins = loginManager.findLogins({}, this.HOST, "", this.REALM);
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
        var logins = loginManager.findLogins({}, this.HOST, "", this.REALM);
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username.indexOf(prefix) == 0) {
                list.push([ logins[i].username, logins[i].password ])
            }
        }
        return list
    },

    tagResource: function(obj, attr, callback)
    {
        if (!attr) attr = "id";
        var tag = this.promptForTag(obj.tags);
        if (tag == null) return;

        obj.tags = this.parseTags(tag);
        ew_model.processTags(obj);
        this.setTags([ obj[attr] ], obj.tags, callback);
    },

    parseTags: function(tag)
    {
        var list = [];
        if (tag) {
            tag += ',';
            var pairs = (tag.match(/\s*[^,":]+\s*:\s*("(?:[^"]|"")*"|[^,]*)\s*,\s*/g) || []);
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split(/\s*:\s*/, 2);
                var key = (pair[0] || "").trim();
                var value = (pair[1] || "").trim();
                value = value.replace(/,\s*$/, '').trim();
                value = value.replace(/^"/, '').replace(/"$/, '').replace(/""/, '"');
                if (key.length == 0 || value.length == 0) continue;
                list.push([ key, value ]);
            }
        }
        return list;
    },

    setTags: function(resIds, tags, callback)
    {
        var me = this;
        var multiIds = new Array();
        var multiTags = new Array();

        try {
            if (typeof tags == "string") {
                tags = this.parseTags(tags);
            }

            for ( var i = 0; i < resIds.length; i++) {
                var resId = resIds[i];
                for (var j = 0; j < tags.length; j++) {
                    multiIds.push(resId);
                }
                multiTags = multiTags.concat(tags);
            }
            if (multiIds.length == 0) multiIds = resIds;

            this.controller.describeTags(resIds, function(described) {
                var delResIds = new Array();
                var delKyes = new Array();

                for (var i = 0; i < described.length; i++) {
                    delResIds.push(described[i][0]);
                    delKyes.push(described[i][1]);
                }
                if (delResIds.length > 0 && delKyes.length > 0) {
                    me.controller.deleteTags(delResIds, delKyes);
                }
                if (multiTags.length > 0) {
                    me.controller.createTags(multiIds, multiTags, callback);
                } else
                if (callback) {
                    callback();
                }
            });
        }
        catch (e) {
            alert(e);
        }
    },

    copyToClipboard: function(text)
    {
        var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
        str.data = text;

        var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
        trans.addDataFlavor("text/unicode");
        trans.setTransferData("text/unicode", str, text.length * 2);

        var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
        clip.setData(trans, null, Components.interfaces.nsIClipboard.kGlobalClipboard);
    },

    getAppName : function() {
        return this.NAME;
    },

    getAppUrl: function() {
        return this.APP_SITE + this.APP_PATH + this.NAME
    },

    getDownloadUrl: function() {
        return this.getAppUrl() + "/downloads/"
    },

    getUserAgent: function () {
        return this.getAppName() + "/" + this.VERSION;
    },

    getIAMURL: function() {
        return this.isGovCloud() ? this.IAM_GOV_URL : this.IAM_URL;
    },

    isGovCloud : function()
    {
        return String(this.serviceURL).indexOf("ec2.us-gov") > -1;
    },

    checkForUpdates: function() {
        ver = parseFloat(this.VERSION) + 0.01
        var url = this.getDownloadUrl()
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        debug(url)
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                var data = xmlhttp.responseText;
                var d = data.match(new RegExp("\/downloads\/[^\/]+\/" + this.NAME + "\/" + this.NAME + (isWindows(navigator.platform) ? "-win-" : "-osx-") + "([0-9]\.[0-9][0-9])\.zip"))
                if (d != null) {
                    debug(d);
                    if (parseFloat(d[1]) > parseFloat(this.VERSION)) {
                        alert("New version " + d[1] + "is available at " + this.APP_SITE + d[0])
                        return;
                    }
                }
                alert("No new version available")
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.send(null);
    },

    getNsResolver : function() {
        var client = this;
        return function(prefix) {
            var ns = { 's':  "http://schemas.xmlsoap.org/soap/envelope/", 'ec2': "http://ec2.amazonaws.com/doc/" + client.EC2_API_VERSION + "/" };
            return ns[prefix] || null;
        }
    },

    setCredentials : function (accessCode, secretKey) {
        this.accessCode = accessCode;
        this.secretKey = secretKey;
        this.errorCount = 0;
    },

    setEndpoint : function (endpoint) {
        if (endpoint != null) {
            this.serviceURL = endpoint.url;
            this.region = endpoint.name;
            this.elbURL = "https://elasticloadbalancing." + this.region + ".amazonaws.com";
        }
    },

    newInstance : function() {
        var xmlhttp = null;
        if (typeof XMLHttpRequest != 'undefined') {
            try {
                xmlhttp = new XMLHttpRequest();
            } catch (e) {
                debug(e)
            }
        }
        return xmlhttp;
    },

    setEndpointURLForRegion : function(region) {
        var reg = ew_utils.determineRegionFromString(ew_session.getActiveEndpoint().name);
        log(reg + ": active region prefix");
        if (reg != region) {
            var newURL = null;
            // Determine the region's EC2 URL
            var endpointlist = ew_prefs.getEndpoints();
            region = region.toLowerCase();
            for (var i = 0; i < endpointlist.length; ++i) {
                var curr = endpointlist[i];
                if (curr.name.indexOf(region) >= 0) {
                    newURL = curr.url;
                    break;
                }
            }

            log(newURL + ": new URL");
            if (newURL == null) {
                return;
            }

            // Switch to the new URL
            this.serviceURL = newURL;
        }
    },

    queryEC2InRegion : function (region, action, params, handlerObj, isSync, handlerMethod, callback) {
        // Save the current Service URL
        var oldURL = this.serviceURL;
        log(oldURL + ": old URL");
        this.setEndpointURLForRegion(region);

        // Make the call
        var toRet = this.queryEC2(action, params, handlerObj, isSync, handlerMethod, callback);

        // Switch back to the old URL
        this.serviceURL = oldURL;
        return toRet;
    },

    queryEC2 : function (action, params, handlerObj, isSync, handlerMethod, callback, apiURL, apiVersion, sigVersion) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        if (this.serviceURL == null || this.serviceURL == "") {
            this.setEndpoint(ew_session.getActiveEndpoint());
        }

        var rsp = null;
        while (ew_prefs.isHttpEnabled()) {
            try {
                rsp = this.queryEC2Impl(action, params, handlerObj, isSync, handlerMethod, callback, apiURL, apiVersion, sigVersion);
                if (!this.retryRequest(rsp, action)) {
                    break;
                }
            } catch (e) {
                alert ("An error occurred while calling "+ action + "\n" + e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    retryRequest: function(rsp, action)
    {
        if (rsp.hasErrors) {
            debug('action: ' + action + ', errorCount: ' + this.errorCount)
            // Prevent from showing error dialog on every error until success, this happens in case of wrong credentials or endpoint and until all views not refreshed
            this.errorCount++;
            if (this.errorCount < this.errorMax) {
                if (!this.errorDialog("Server responded with an error for " + action, rsp.faultCode, rsp.requestId,  rsp.faultString)) {
                    this.errorCount = this.errorMax;
                    return false;
                }
            } else {
                return false;
            }
            return true;
        }

        this.errorCount = 0;
        return false;
    },

    errorDialog : function(msg, code, rId, fStr) {
        var retry = {value:null};
        window.openDialog("chrome://ew/content/dialogs/retry_cancel.xul", null, "chrome,centerscreen,modal,resizable", msg, code, rId, fStr, retry);
        return retry.value;
    },

    sigParamCmp : function(x, y) {
        if (x[0].toLowerCase() < y[0].toLowerCase ()) {
            return -1;
        }
        if (x[0].toLowerCase() > y[0].toLowerCase()) {
           return 1;
        }
        return 0;
    },

    queryEC2Impl : function (action, params, handlerObj, isSync, handlerMethod, callback, apiURL, apiVersion, sigVersion) {
        var curTime = new Date();
        var formattedTime = curTime.strftime("%Y-%m-%dT%H:%M:%SZ", true);

        var url = apiURL ? apiURL : this.serviceURL
        var sigValues = new Array();
        sigValues.push(new Array("Action", action));
        sigValues.push(new Array("AWSAccessKeyId", this.accessCode));
        sigValues.push(new Array("SignatureVersion", sigVersion ? sigVersion : this.SIG_VERSION));
        sigValues.push(new Array("SignatureMethod", "HmacSHA1"));
        sigValues.push(new Array("Version", apiVersion ? apiVersion : this.EC2_API_VERSION));
        sigValues.push(new Array("Timestamp", formattedTime));

        // Mix in the additional parameters. params must be an Array of tuples as for sigValues above
        for (var i = 0; i < params.length; i++) {
            sigValues.push(params[i]);
        }

        var strSig = "";
        var queryParams = "";

        if (this.sigVersion == "1") {
            sigValues.sort(this.sigParamCmp);
            for (var i = 0; i < sigValues.length; i++) {
                strSig += sigValues[i][0] + sigValues[i][1];
                queryParams += (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
            }
        }  else {
            sigValues.sort();
            strSig = "POST\n" + url.replace(/https?:\/\//,"") + "\n/\n";
            for (var i = 0; i < sigValues.length; i++) {
                var item = (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
                strSig += item
                queryParams += item
            }
        }
        queryParams += "&Signature="+encodeURIComponent(b64_hmac_sha1(this.secretKey, strSig));
        url += "/";

        log("URL ["+url+"?"+queryParams+"]");

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        xmlhttp.open("POST", url, !isSync);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlhttp.setRequestHeader("Content-Length", queryParams.length);
        xmlhttp.setRequestHeader("Connection", "close");

        return this.sendRequest(xmlhttp, queryParams, isSync, action, handlerMethod, handlerObj, callback, params);
    },

    queryELB : function (action, params, handlerObj, isSync, handlerMethod, callback) {
        if (this.elbURL == null || this.elbURL == "") {
            this.setEndpoint(ew_session.getActiveEndpoint());
        }
        return this.queryEC2(action, params, handlerObj, isSync, handlerMethod, callback, this.elbURL, this.ELB_API_VERSION);
    },

    queryIAM : function (action, params, handlerObj, isSync, handlerMethod, callback) {
        return this.queryEC2(action, params, handlerObj, isSync, handlerMethod, callback, this.getIAMURL(), this.IAM_API_VERSION);
    },

    queryS3Prepare : function(method, bucket, key, path, params, content) {
        var curTime = new Date().toUTCString();
        var url = ew_prefs.getS3Protocol(this.region, bucket) + (bucket ? bucket + "." : "") + ew_prefs.getS3Region(this.region || "").url;

        if (!params) params = {}

        // Required headers
        if (!params["x-amz-date"]) params["x-amz-date"] = curTime;
        if (!params["Content-Type"]) params["Content-Type"] = "binary/octet-stream; charset=UTF-8";
        if (!params["Content-Length"]) params["Content-Length"] = content ? content.length : 0;

        // Construct the string to sign and query string
        var strSig = method + "\n" + (params['Content-MD5']  || "") + "\n" + (params['Content-Type'] || "") + "\n" + "\n";

        // Amazon canonical headers
        var headers = []
        for (var p in params) {
            if (/X-AMZ-/i.test(p)) {
                var value = params[p]
                if (value instanceof Array) {
                    value = value.join(',');
                }
                headers.push(p.toString().toLowerCase() + ':' + value);
            }
        }
        if (headers.length) {
            strSig += headers.sort().join('\n') + "\n"
        }

        // Split query string for subresources, supported are:
        var resources = ["acl", "lifecycle", "location", "logging", "notification", "partNumber", "policy", "requestPayment", "torrent",
                         "uploadId", "uploads", "versionId", "versioning", "versions", "website",
                         "delete",
                         "response-content-type", "response-content-language", "response-expires",
                         "response-cache-control", "response-content-disposition", "response-content-encoding" ]
        var rclist = []
        var query = parseQuery(path)
        for (var p in query) {
            p = p.toLowerCase();
            if (resources.indexOf(p) != -1) {
                rclist.push(p + (query[p] == true ? "" : "=" + query[p]))
            }
        }
        strSig += (bucket ? "/" + bucket : "") + "/" + key + (rclist.length ? "?" : "") + rclist.sort().join("&");

        params["Authorization"] = "AWS " + this.accessCode + ":" + b64_hmac_sha1(this.secretKey, strSig);
        params["User-Agent"] = this.getUserAgent();
        params["Connection"] = "close";

        debug("S3 [" + method + ":" + url + "/" + key + path + ":" + strSig.replace(/\n/g, "|") + " " + JSON.stringify(params) + "]")

        return { method: method, url: url + "/" + key + path, headers: params, sig: strSig, time: curTime }
    },

    queryS3Impl : function(method, bucket, key, path, params, content, handlerObj, isSync, handlerMethod, callback) {

        var req = this.queryS3Prepare(method, bucket, key, path, params, content);

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        xmlhttp.open(req.method, req.url, !isSync);

        for (var p in req.headers) {
            xmlhttp.setRequestHeader(p, req.headers[p]);
        }

        return this.sendRequest(xmlhttp, content, isSync, method, handlerMethod, handlerObj, callback, [bucket, key, path]);
    },

    downloadS3 : function (method, bucket, key, path, params, file, callback, progresscb) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;
        var req = this.queryS3Prepare(method, bucket, key, path, params, null);
        return this.download(req.url, req.headers, file, callback, progresscb);
    },

    uploadS3: function(bucket, key, path, params, filename, callback, progresscb) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        var file = FileIO.streamOpen(filename);
        if (!file) {
            alert('Cannot open ' + filename)
            return false;
        }
        var length = file[1].available();
        params["Content-Length"] = length;

        var req = this.queryS3Prepare("PUT", bucket, key, path, params, null);

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        xmlhttp.open(req.method, req.url, true);
        for (var p in req.headers) {
            xmlhttp.setRequestHeader(p, req.headers[p]);
        }
        xmlhttp.send(file[1]);

        var timer = setInterval(function() {
            try {
                var a = length - file[1].available();
                if (progresscb) progresscb(filename, Math.round(a / length * 100));
            }
            catch(e) {
                alert("Error uploading " + filename + "\n" + e)
            }
        }, 300);

        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState != 4) return;
            FileIO.streamClose(file);
            clearInterval(timer);
            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                if (progresscb) progresscb(filename, 100);
                if (callback) callback(filename);
            } else {
                var rsp = this.handleResponseError(xmlhttp);
                this.errorDialog("S3 responded with an error for "+ bucket + "/" + key + path, rsp.faultCode, rsp.requestId, rsp.faultString)
            }
        };
        return true;
    },

    queryS3 : function (method, bucket, key, path, params, content, handlerObj, isSync, handlerMethod, callback) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        var rsp = null;

        while (ew_prefs.isHttpEnabled()) {
            try {
                rsp = this.queryS3Impl(method, bucket, key, path, params, content, handlerObj, isSync, handlerMethod, callback);
                if (!this.retryRequest(rsp, method + " " + bucket + "/" + key + path)) {
                    break;
                }
            } catch (e) {
                alert ("An error occurred while calling "+ method + " " + bucket + "/" + key + path + "\n" + e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    showBusy : function(fShow)
    {
        if (fShow) {
            this.httpCount++;
            window.setCursor("wait");
        } else {
            --this.httpCount;
            if (this.httpCount <= 0) {
                window.setCursor("auto");
            }
        }
    },

    sendRequest: function(xmlhttp, content, isSync, action, handlerMethod, handlerObj, callback, data) {
        debug('sendRequest: ' + action + ' ' + handlerMethod + ' ' + data);
        var me = this;

        // Generate random timer
        var timerKey = this.getTimerKey();
        this.startTimer(timerKey, xmlhttp.abort);
        this.showBusy(true);

        if (isSync) {
            xmlhttp.onreadystatechange = function() {}
        } else {
            var xhr = xmlhttp;
            xmlhttp.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    me.showBusy(false);
                    me.stopTimer(timerKey);
                    var rsp = me.handleResponse(xhr, isSync, action, handlerMethod, handlerObj, callback, data);
                    me.retryRequest(rsp, handlerMethod);
                }
            }
        }

        try {
            xmlhttp.send(content);
        } catch(e) {
            debug(e)
            this.showBusy(false);
            this.stopTimer(timerKey);
            return this.createResponse(null, action, handlerMethod, callback, true, "Send Request Error", e, "", data);
        }
        if (isSync) {
            this.showBusy(false);
            this.stopTimer(timerKey);
            return this.handleResponse(xmlhttp, isSync, action, handlerMethod, handlerObj, callback, data);
        }
        return { hasErrors: false };
    },

    handleResponse : function(xmlhttp, isSync, action, handlerMethod, handlerObj, callback, data) {
        log((isSync ? "Sync" : "Async") + " Response, status: " + xmlhttp.status + ", req:" + action + "/" + handlerMethod + ", response: " + xmlhttp.responseText);

        var rc = xmlhttp.status >= 200 && xmlhttp.status < 300 ?
                 this.createResponse(xmlhttp, action, handlerMethod, callback, false, "", "", "", data) :
                 this.handleResponseError(xmlhttp, action, handlerMethod, callback, data);

        rc.isSync = isSync;
        // If context object is not specified call the callback directly
        if (handlerObj) {
            handlerObj.onResponseComplete(rc);
        } else
        if (callback) {
            callback(rc);
        }
        return rc;
    },

    handleResponseError : function(xmlhttp, action, handlerMethod, callback, data) {
        var faultCode = "Unknown: " + xmlhttp.status;
        var faultString = "An unknown error occurred, please check connectivity";
        var requestId = "";
        var xmlDoc = xmlhttp.responseXML;
        if (!xmlDoc) {
            if (xmlhttp.responseText) {
                xmlDoc = new DOMParser().parseFromString(xmlhttp.responseText, "text/xml");
            }
        }
        if (xmlDoc) {
            faultCode = getNodeValue(xmlDoc, "Code");
            faultString = getNodeValue(xmlDoc, "Message");
            requestId = getNodeValue(xmlDoc, "RequestID");
        }
        return this.createResponse(xmlhttp, action, handlerMethod, callback, true, faultCode, faultString, requestId, data);
    },

    createResponse : function(xmlhttp, action, handlerMethod, callback, hasErrors, faultCode, faultString, requestId, data) {
        return { xmlhttp: xmlhttp,
                 xmlDoc: xmlhttp && xmlhttp.responseXML ? xmlhttp.responseXML : document.createElement('p'),
                 textBody: xmlhttp ? xmlhttp.responseText : '',
                 action: action,
                 method: handlerMethod,
                 requestId: requestId,
                 faultCode: faultCode, faultString: faultString,
                 hasErrors: hasErrors,
                 data: data, callback: callback, };
    },

    queryVpnConnectionStylesheets : function(stylesheet) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        if (stylesheet == null) {
            stylesheet = "customer-gateway-config-formats.xml";
        }
        xmlhttp.open("GET", this.VPN_CONFIG_PATH + '2009-07-15' + "/" + stylesheet, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.overrideMimeType('text/xml');
        return this.sendRequest(xmlhttp, 'vpnConfig', null, true, stylesheet);
    },

    queryCheckIP : function(type, retVal) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return;
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        xmlhttp.open("GET", "http://checkip.amazonaws.com/" + type, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.overrideMimeType('text/plain');
        return this.sendRequest(xmlhttp, 'checkIP', null, true, "checkip", null, function(obj) { retVal.ipAddress = obj.textBody; });
    },

    download: function(url, headers, filename, callback, progresscb) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return;

        debug('download: ' + url + '| ' + JSON.stringify(headers) + '| ' + filename)

        try {
          FileIO.remove(filename);
          var file = FileIO.open(filename);
          if (!FileIO.create(file)) {
              alert('Cannot create ' + filename)
              return false;
          }

          var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(url, null, null);
          var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
          persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
          persist.progressListener = {
            onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
                var percent = (aCurTotalProgress/aMaxTotalProgress) * 100;
                if (progresscb) progresscb(filename, percent);
            },
            onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
                debug("download: " + filename + " " + aStateFlags + " " + aStatus)
                if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                    if (callback) callback(filename);
                }
            }
          }

          var hdrs = "";
          for (var p in headers) {
              hdrs += p + ":" + headers[p] + "\n";
          }
          persist.saveURI(io, null, null, null, hdrs, file);
          return true;

        } catch (e) {
          alert(e);
        }
        return false;
    },

    getTimerKey: function()
    {
        return String(Math.random()) + ":" + String(new Date().getTime());
    },

    startTimer : function(key, expr) {
        var timer = window.setTimeout(expr, ew_prefs.getRequestTimeout());
        this.timers[key] = timer;
    },

    stopTimer : function(key, timeout) {
        var timer = this.timers[key];
        this.timers[key] = null;
        if (timer == null) {
            return false;
        }
        window.clearTimeout(timer);
        timer = null;
        return true;
    },
};
