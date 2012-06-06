var ew_prefs = {
    ACTIVE_USER_NAME : "ew.active.credentials.name",
    ACTIVE_ENDPOINT : "ew.active.endpoint",
    RDP_COMMAND : "ew.tools.rdp.command",
    RDP_ARGS : "ew.tools.rdp.args",
    SSH_COMMAND : "ew.tools.ssh.command",
    SSH_ARGS : "ew.tools.ssh.args",
    SSH_USER : "ew.tools.ssh.user",
    HTTP_ENABLED : "ew.http.enabled",
    DEBUG_ENABLED : "ew.debugging.enabled",
    IDLE_TIMEOUT: "ew.idle.timeout",
    IDLE_ACTION: "ew.idle.action",
    EW_URL : "ew.url",
    EW_KEYHOME: "ew.keyhome",
    CURRENT_TAB : "ew.tab.current",
    REQUEST_TIMEOUT : "ew.timeout.request",
    LAST_EW_PKEY_FILE : "ew.last.ec2privatekey.file",
    ENDPOINTS : "ew.endpoints",
    PROMPT_OPEN_PORT : "ew.prompt.open.port",
    OPEN_CONNECTION_PORT : "ew.open.connection.port",
    OPENSSL_COMMAND : "ew.tools.openssl.command",
    SHELL_COMMAND : "ew.tools.shell.command",
    EC2_TOOLS_PATH: "ew.tools.path.ec2_home",
    IAM_TOOLS_PATH: "ew.tools.path.aws_iam_home",
    AMI_TOOLS_PATH: "ew.tools.path.ec2_amitool_home",
    AWS_AUTOSCALING_TOOLS_PATH: "ew.tools.path.aws_auto_scaling_home",
    CLOUDWATCH_TOOLS_PATH: "ew.tools.path.aws_cloudwatch_home",
    JAVA_TOOLS_PATH: "ew.tools.path.java_home",
    S3_PROTO: "ew.s3.proto",
    endpoints : null,
    prefs : null,

    init : function()
    {
        if (this.prefs == null) {
            this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
            this.setLastUsedAccount(this.getLastUsedAccount());
            this.setLastUsedEndpoint(this.getLastUsedEndpoint());
            this.setRDPCommand(this.getRDPCommand());
            this.setRDPArgs(this.getRDPArgs());
            this.setRequestTimeout(this.getRequestTimeout());
            this.setServiceURL(this.getServiceURL());
            this.setCurrentTab(this.getCurrentTab());
            this.setDebugEnabled(this.isDebugEnabled());
            this.setHttpEnabled(this.isHttpEnabled());
            this.setLastEC2PrivateKeyFile(this.getLastEC2PrivateKeyFile());
            this.setPromptForPortOpening(this.getPromptForPortOpening());
            this.setOpenConnectionPort(this.getOpenConnectionPort());
            this.setKeyHome(this.getKeyHome());

            var cmd = this.getOpenSSLCommand();
            if (cmd.indexOf('openssl.exe') > 0 && cmd.indexOf('bin\\openssl.exe') == -1) {
                this.setOpenSSLCommand(cmd.replace(/openssl.exe/, 'bin\\openssl.exe'));
            }
            var cmd = this.getSSHArgs();
            if (cmd.indexOf('ssh.exe') > 0 && cmd.indexOf('bin\\ssh.exe') == -1) {
                this.setSSHArgs(cmd.replace(/ssh.exe/, 'bin\\ssh.exe'));
            }
        }
    },

    setLastUsedAccount : function(value)
    {
        this.setStringPreference(this.ACTIVE_USER_NAME, value);
    },
    setRDPCommand : function(value)
    {
        this.setStringPreference(this.RDP_COMMAND, value);
    },
    setRDPArgs : function(value)
    {
        this.setStringPreference(this.RDP_ARGS, value);
    },
    setSSHCommand : function(value)
    {
        this.setStringPreference(this.SSH_COMMAND, value);
    },
    setSSHArgs : function(value)
    {
        this.setStringPreference(this.SSH_ARGS, value);
    },
    setSSHUser : function(value)
    {
        this.setStringPreference(this.SSH_USER, value);
    },
    setShellCommand : function(value)
    {
        this.setStringPreference(this.SHELL_COMMAND, value);
    },
    setRequestTimeout : function(value)
    {
        this.setIntPreference(this.REQUEST_TIMEOUT, value);
    },
    setServiceURL : function(value)
    {
        this.setStringPreference(this.EW_URL, value);
    },
    setCurrentTab : function(value)
    {
        this.setStringPreference(this.CURRENT_TAB, value);
    },
    setDebugEnabled : function(enabled)
    {
        this.setBoolPreference(this.DEBUG_ENABLED, enabled);
    },
    setHttpEnabled : function(enabled)
    {
        this.setBoolPreference(this.HTTP_ENABLED, enabled);
    },
    setIdleTimeout : function(value)
    {
        this.setIntPreference(this.IDLE_TIMEOUT, value);
    },
    setIdleAction : function(value)
    {
        this.setStringPreference(this.IDLE_ACTION, value);
    },
    setLastEC2PrivateKeyFile : function(value)
    {
        this.setEC2PrivateKeyForUser(value, this.getLastUsedAccount());
    },
    setOpenConnectionPort : function(value)
    {
        this.setBoolPreference(this.OPEN_CONNECTION_PORT, value);
    },
    setPromptForPortOpening : function(value)
    {
        this.setBoolPreference(this.PROMPT_OPEN_PORT, value);
    },
    setOpenSSLCommand : function(value)
    {
        this.setStringPreference(this.OPENSSL_COMMAND, value);
    },
    setKeyHome : function(value)
    {
        this.setStringPreference(this.EW_KEYHOME, value);
    },
    getDirSeparator : function()
    {
        return navigator.platform.toLowerCase().indexOf('win') > -1 ? '\\' : '/';
    },
    getAppName : function()
    {
        return ew_client.getAppName();
    },
    getAppPath : function()
    {
        return DirIO.get("CurProcD").path;
    },
    getKeyHome : function()
    {
        return this.getStringPreference(this.EW_KEYHOME, this.getHome() + this.getDirSeparator() + this.getAppName());
    },
    getUserHome : function()
    {
        return DirIO.get("Home").path;
    },
    getProfileHome : function()
    {
        return DirIO.get("ProfD").path;
    },
    getLastUsedAccount : function()
    {
        return this.getStringPreference(this.ACTIVE_USER_NAME, "");
    },
    getRDPCommand : function()
    {
        return this.getStringPreference(this.RDP_COMMAND, this.getDefaultRDPCommandArgs()[0]);
    },
    getRDPArgs : function()
    {
        return this.getStringPreference(this.RDP_ARGS, this.getDefaultRDPCommandArgs()[1]);
    },
    getSSHCommand : function()
    {
        return this.getStringPreference(this.SSH_COMMAND, this.getDefaultSSHCommandArgs()[0]);
    },
    getSSHArgs : function()
    {
        return this.getStringPreference(this.SSH_ARGS, this.getDefaultSSHCommandArgs()[1]);
    },
    getSSHUser : function()
    {
        return this.getStringPreference(this.SSH_USER, "");
    },
    getRequestTimeout : function()
    {
        return this.getIntPreference(this.REQUEST_TIMEOUT, 15000);
    },
    getServiceURL : function()
    {
        return this.getStringPreference(this.EW_URL, "https://ec2.us-east-1.amazonaws.com");
    },
    getCurrentTab : function()
    {
        return this.getStringPreference(this.CURRENT_TAB, '');
    },
    getLastEC2PrivateKeyFile : function()
    {
        return this.getEC2PrivateKeyForUser(this.getLastUsedAccount());
    },
    isDebugEnabled : function()
    {
        return this.getBoolPreference(this.DEBUG_ENABLED, false);
    },
    isHttpEnabled : function()
    {
        return this.getBoolPreference(this.HTTP_ENABLED, true);
    },
    getOpenConnectionPort : function()
    {
        return this.getBoolPreference(this.OPEN_CONNECTION_PORT, true);
    },
    getPromptForPortOpening : function()
    {
        return this.getBoolPreference(this.PROMPT_OPEN_PORT, true);
    },
    getIdleAction: function()
    {
        return this.getStringPreference(this.IDLE_ACTION, "");
    },
    getIdleTimeout: function()
    {
        return this.getIntPreference(this.IDLE_TIMEOUT, 0);
    },
    getOpenSSLCommand : function()
    {
        return this.getStringPreference(this.OPENSSL_COMMAND, this.getDefaultOpenSSLCommand());
    },
    getShellCommand : function()
    {
        return this.getStringPreference(this.SHELL_COMMAND, this.getDefaultShellCommand());
    },

    // default helpers
    getPrefForUserInRegion : function(pref, dflt)
    {
        var orig = this.getStringPreference(pref, dflt);
        pref += "." + this.getLastUsedAccount() + "." + this.getLastUsedEndpoint();
        return this.getStringPreference(pref, orig);
    },

    // get a [cmd, argument-string] pair
    getDefaultRDPCommandArgs : function()
    {
        var rdesktopargs = "-g 1440x900 -u administrator -p ${pass} -x l ${host}"

        if (isMacOS(navigator.platform)) {
            if (FileIO.exists("/Applications/Remote Desktop Connection.app")) {
                return [ "/Applications/Remote Desktop Connection.app/Contents/MacOS/Remote Desktop Connection", "${host}" ];
            } else
                if (FileIO.exists("/opt/local/bin/rdesktop")) {
                    return [ "/opt/local/bin/rdesktop", rdesktopargs ]
                }
        } else

            if (isWindows(navigator.platform)) {
                return [ "c:\\Windows\\System32\\mstsc.exe", '/v ${host}' ];
            }

        return [ "/usr/bin/rdesktop", rdesktopargs ];
    },

    getDefaultShellCommand : function()
    {
        if (isMacOS(navigator.platform)) {
            return '/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal';
        } else

        if (isWindows(navigator.platform)) {
            return 'c:\\\Windows\\System32\\cmd.exe';
        }

        return '/usr/bin/xterm';
    },

    // get a [cmd, argument-string] pair
    getDefaultSSHCommandArgs : function()
    {
        var args = " -i ${key} ${login}@${host}"

        if (isMacOS(navigator.platform)) {
            var cmdline = [
                    'on run argv',
                    '  tell app "System Events" to set termOn to (exists process "Terminal")',
                    '  set cmd to "ssh ' + args + '"',
                    '  if (termOn) then',
                    '    tell app "Terminal" to do script cmd',
                    '  else',
                    '    tell app "Terminal" to do script cmd in front window',
                    '  end if',
                    '  tell app "Terminal" to activate',
                    'end run'];
                // turn into -e 'line1' -e 'line2' etc.
            cmdline = cmdline.map(function(s) { return "-e '" + s.replace(/^\s+/, '') + "'" }).join(" ");

            return ["/usr/bin/osascript", cmdline];
        } else

        if (isWindows(navigator.platform)) {
            cmd = this.getAppPath() + '\\bin\\ssh.exe'
            if (FileIO.exists(cmd)) {
                batch = "#!set HOME=" + this.getHome() + "#!" + quotepath(cmd) + " -o \"ServerAliveInterval 5\"" + args;
                return [ 'c:\\\Windows\\System32\\cmd.exe', '/K '+ batch ]
            }
            return [ "", args ];
        }

        return [ '/usr/bin/xterm', '-e /usr/bin/ssh ' + args ];
    },

    getDefaultOpenSSLCommand : function()
    {
        var cmd = "/usr/bin/openssl"

        if (isWindows(navigator.platform)) {
            cmd = this.getAppPath() + "\\bin\\openssl.exe"
            if (FileIO.exists(cmd)) {
                return cmd
            }
        }
        return cmd;
    },

    getDefaultJavaHome: function() {
        if (isWindows(navigator.platform)) {
            return "C:\\Program Files (x86)\\Java\\jre6";
        } else

        if (isMacOS(navigator.platform)) {
            return "/System/Library/Frameworks/JavaVM.framework/Home";
        }
        return "/usr/lib/java";
    },

    getCredentialFile : function(name)
    {
        return this.getTemplateProcessed(this.getKeyHome() + this.getDirSeparator() + "AWSCredential_${keyname}.txt", [ [ "keyname", sanitize(name ? name : this.getLastUsedAccount()) ] ]);
    },

    getPrivateKeyFile : function(name)
    {
        return this.getTemplateProcessed(this.getKeyHome() + this.getDirSeparator() + "PrivateKey_${keyname}.pem", [ [ "keyname", sanitize(name ? name : this.getLastUsedAccount()) ] ]);
    },

    getPublicKeyFile : function(name)
    {
        return this.getTemplateProcessed(this.getKeyHome() + this.getDirSeparator() + "PublicKey_${keyname}.pem", [ [ "keyname", sanitize(name ? name : this.getLastUsedAccount()) ] ]);
    },

    getCertificateFile : function(name)
    {
        return this.getTemplateProcessed(this.getKeyHome() + this.getDirSeparator() + "X509Certificate_${keyname}.pem", [ [ "keyname", sanitize(name ? name : this.getLastUsedAccount()) ] ]);
    },

    getTemplateProcessed : function(file, params)
    {
        var keyname = null
        // Custom variables
        for ( var i = 0; params && i < params.length; i++) {
            var val = params[i][1]
            if (file.indexOf("${" + params[i][0] + "}") > -1) {
                file = file.replace(new RegExp("\\${" + params[i][0] + "}", "g"), quotepath(val));
            }
            switch (params[i][0]) {
            case "keyname":
                keyname = val
                break;
            }
        }
        // Global variables
        if (file.indexOf("${login}") > -1) {
            var user = this.getSSHUser()
            if (user != "") {
                file = file.replace(/\${login}/g, user);
            } else {
                file = file.replace(/\${login}@/g, "");
            }
        }
        if (file.indexOf("${home}") > -1) {
            var home = this.getHome()
            file = file.replace(/\${home}/g, quotepath(home));
        }
        if (file.indexOf("${keyhome}") > -1) {
            var home = this.getKeyHome()
            file = file.replace(/\${keyhome}/g, quotepath(home));
        }
        if (file.indexOf("${user}") > -1) {
            file = file.replace(/\${user}/g, this.getLastUsedAccount());
        }
        if (file.indexOf("${key}") > -1) {
            file = file.replace(/\${key}/g, quotepath(this.getPrivateKeyFile(keyname)));
        }
        return file
    },

    getArgsProcessed: function(args, params, filename)
    {
        var idx = args.indexOf('#!');
        if (idx == -1) {
            return ew_prefs.getTemplateProcessed(args, params);
        }

        // Batch file
        if (!this.makeKeyHome()) return null

        var batch = args.substr(idx + 2).replace(/\#\!/g, "\r\n") + "\r\n";
        batch = ew_prefs.getTemplateProcessed(batch, params);

        var file = this.getKeyHome() + DirIO.sep + filename + (isWindows(navigator.platform) ? ".bat" : ".sh");
        args = ew_prefs.getTemplateProcessed(args.substr(0, idx) + " " + quotepath(file), params);

        var fd = FileIO.open(file);
        FileIO.write(fd, batch);
        fd.permissions = 0700;

        debug("BATCH:" + file + "\n" + batch)
        return args;
    },

    makeKeyHome: function()
    {
        if (!DirIO.mkpath(this.getKeyHome())) {
            alert("Error creating directory " + this.getKeyHome());
            return 0
        }
        return 1
    },

    getEC2PrivateKeyForUser : function(user)
    {
        return this.getStringPreference(this.LAST_EW_PKEY_FILE + "." + user + "." + this.getLastUsedEndpoint(), "");
    },

    setEC2PrivateKeyForUser : function(value, user)
    {
        this.setStringPreference(this.LAST_EW_PKEY_FILE + "." + user + "." + this.getLastUsedEndpoint(), value);
    },

    getHome : function()
    {
        var home = "";
        var env = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
        if (isWindows(navigator.platform)) {
            if (env.exists("HOMEDRIVE") && env.exists("HOMEPATH")) {
                home = env.get("HOMEDRIVE") + env.get("HOMEPATH");
            }
        }
        if (home == "" && env.exists('HOME')) {
            home = env.get("HOME");
        }
        return home
    },

    getEnv : function(name)
    {
        var env = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
        if (env.exists(name)) {
            return env.get(name);
        }
        return ""
    },

    setEnv : function(name, value)
    {
        var env = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
        env.set(name, value);
    },

    getS3Protocol: function(region, bucket)
    {
        return this.getStringPreference(this.S3_PROTO + "." + region + "." + bucket, 'http://');
    },

    setS3Protocol: function(region, bucket, proto)
    {
        this.setStringPreference(this.S3_PROTO + "." + region + "." + bucket, proto || 'http://');
    },

    getS3Regions: function()
    {
        return [ { name: "US Standard", url: "s3.amazonaws.com", region: "" },
                 { name: "US West (Oregon)", url: "s3-us-west-2.amazonaws.com", region: "us-west-2" },
                 { name: "US West (Northern California)", url: "s3-us-west-1.amazonaws.com", region: "us-west-1" },
                 { name: "EU (Ireland)", url: "s3-eu-west-1.amazonaws.com", region: "EU" },
                 { name: "Asia Pacific (Singapore)", url: "s3-ap-southeast-1.amazonaws.com", region: "ap-southeast-1" },
                 { name: "Asia Pacific (Tokyo)", url: "s3-ap-northeast-1.amazonaws.com", region: "ap-northeast-1" },
                 { name: "South America (Sao Paulo)", url: "s3-sa-east-1.amazonaws.com", region: "sa-east-1" },
                 { name: "GovCloud", url: "s3-us-gov-west-1.amazonaws.com", region: 'us-gov-west-1' } ]
    },

    getS3Region: function(region)
    {
        var regions = this.getS3Regions();
        for (var i in regions) {
            if (regions[i].region == region) {
                return regions[i]
            }
        }
        return regions[0]
    },

    setLastUsedEndpoint : function(value)
    {
        this.setStringPreference(this.ACTIVE_ENDPOINT, value);
    },

    getLastUsedEndpoint : function()
    {
        return this.getStringPreference(this.ACTIVE_ENDPOINT, "us-east-1");
    },

    setEndpoints : function(value)
    {
        this.setListPreference(this.ENDPOINTS, value);
    },

    getEndpoints : function()
    {
        return this.getListPreference(this.ENDPOINTS);
    },

    getEC2Regions: function()
    {
        return [ { name: 'us-east-1', url: 'https://ec2.us-east-1.amazonaws.com' },
                 { name: 'eu-west-1', url: 'https://ec2.eu-west-1.amazonaws.com' },
                 { name: 'us-west-1', url: 'https://ec2.us-west-1.amazonaws.com' },
                 { name: 'ap-southeast-1', url: 'https://ec2.ap-southeast-1.amazonaws.com' },
                 { name: 'ap-northeast-1', url: 'https://ec2.ap-northeast-1.amazonaws.com' },
                 { name: 'us-gov-west-1', url: 'https://ec2.us-gov-west-1.amazonaws.com' },
            ];
    },

    getListPreference: function(name)
    {
        var list = [];
        try {
            list = JSON.parse(this.getStringPreference(name));
        }
        catch(e) {}
        if (!(list && list instanceof Array)) list = [];
        return list;
    },

    getStringPreference : function(name, defValue)
    {
        if (!defValue || defValue == null) defValue = '';
        if (this.prefs && name) {
            if (!this.prefs.prefHasUserValue(name)) {
                return defValue;
            }
            if (this.prefs.getPrefType(name) != this.prefs.PREF_STRING) {
                return defValue;
            }
            var prefValue = this.prefs.getCharPref(name).toString();
            if (prefValue.length == 0) {
                prefValue = defValue;
            }
            return prefValue;
        }
        return defValue;
    },

    getIntPreference : function(name, defValue)
    {
        if (this.prefs && name) {
            if (!this.prefs.prefHasUserValue(name)) {
                return defValue;
            }
            if (this.prefs.getPrefType(name) != this.prefs.PREF_INT) {
                return defValue;
            }
            return this.prefs.getIntPref(name);
        }
        return defValue;
    },

    getBoolPreference : function(name, defValue)
    {
        if (this.prefs && name) {
            if (!this.prefs.prefHasUserValue(name)) {
                return defValue;
            }
            if (this.prefs.getPrefType(name) != this.prefs.PREF_BOOL) {
                return defValue;
            }
            return this.prefs.getBoolPref(name);
        }
        return defValue;
    },

    setStringPreference : function(name, value)
    {
        if (name) this.prefs.setCharPref(name, value || '');
    },

    setIntPreference : function(name, value)
    {
        if (name) this.prefs.setIntPref(name, value);
    },

    setBoolPreference : function(name, value)
    {
        if (name) this.prefs.setBoolPref(name, value);
    },

    setListPreference: function(name, list)
    {
        if (name) this.setStringPreference(name, JSON.stringify((list && list instanceof Array) ? list : []));
    },

}
