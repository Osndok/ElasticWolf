var ew_InstancesTreeView = {
    model: ['instances', 'images', 'addresses'],
    searchElement: 'ew.instances.search',
    properties: [ 'state' ],

    filterChanged: function()
    {
        this.invalidate();
    },

    filter: function(list)
    {
        if (!list) return list;
        var noTerm = $("ew.instances.noterminated").checked;
        var noStop = $("ew.instances.nostopped").checked;

        var nlist = new Array();
        for(var i in list) {
            if ((noTerm && list[i].state == "terminated") || (noStop && list[i].state == "stopped")) continue;
            nlist.push(list[i])
        }
        return TreeView.filter.call(this, nlist);
    },

    showBundleDialog : function() {
        var retVal = {ok:null,bucketName:null,prefix:null};
        var instance = this.getSelected();
        if (instance == null) return;

        do {
            var bucketReg = null;
            window.openDialog("chrome://ew/content/dialogs/bundle_instance.xul", null, "chrome,centerscreen,modal,resizable", instance.id, ew_session, retVal);
            if (retVal.ok) {
                // Create the bucket if it doesn't exist
                retVal.ok = ew_session.controller.createS3Bucket(retVal.bucketName);
            } else {
                // The user doesn't want to proceed!
                // If you get rid of this, the dialog keeps popping back up!
                break;
            }

            if (retVal.ok) {
                var reg = ew_utils.determineRegionFromString(ew_session.getActiveEndpoint().name);
                bucketReg = ew_session.controller.getS3BucketLocation(retVal.bucketName) || reg;
                retVal.ok = (reg == bucketReg);
                if (!retVal.ok) {
                    alert ("You must specify a bucket in the '" + reg + "'. Please try again");
                    retVal.bucketName = "";
                }
            }

            // Determine whether the user owns the specified bucket
            if (retVal.ok) {
                retVal.ok = ew_session.controller.writeS3KeyInBucket(retVal.bucketName, retVal.prefix + ".manifest.xml", "ew-write-test", bucketReg);
                if (!retVal.ok) {
                    alert ("ERROR: It appears that you don't have write permissions on the bucket: " + retVal.bucketName);
                }
            }
        } while (!retVal.ok);

        if (retVal.ok) {
            var wrap = function(list) {
                if (list == null) return;
                // Since we allow just one instance to be bundled at a
                // time, this list will only contain information about
                // the newly created SINGLE bundle task. In order to
                // select this task in the new view, it suffices to
                // select list[0].id

                // Navigate to the Bundle Tasks tab
                ew_BundleTasksTreeView.refresh();
                ew_BundleTasksTreeView.select({ id: list[0].id });
                ew_session.selectTab('ew.tabs.bundletask');
            }
            ew_session.controller.bundleInstance(instance.id, retVal.bucketName, retVal.prefix, ew_session.getActiveCredentials(), wrap);
        }
    },

    showCreateImageDialog : function() {
        var retVal = {ok:null,amiName:null,amiDescription:null,noReboot:null};
        var instance = this.getSelected();
        if (instance == null) return;

        window.openDialog("chrome://ew/content/dialogs/create_image.xul", null, "chrome,centerscreen,modal,resizable", instance.id, ew_session, retVal);
        if (retVal.ok) {
            var wrap = function(id) {
                alert("A new EBS-backed AMI is being created and will\nbe available in a moment.\n\nThe AMI ID is: "+id);
            }
            ew_session.controller.createImage(instance.id, retVal.amiName, retVal.amiDescription, retVal.noReboot, wrap);
        }
    },

    isInstanceReadyToUse : function(instance) {
        var ret = false;
        if (isWindows(instance.platform)) {
            ew_session.controller.getConsoleOutput(instance.id, true, function(instanceId, timestamp, output) {
                // Parse the response to determine whether the instance is ready to use
                if (output.indexOf("Windows is Ready to use") >= 0) {
                    ret = true;
                }
            });
        } else {
            ret = true;
        }
        if (!ret) {
            alert ("Please wait till 'Windows is Ready to use' before attaching an EBS volume to instance: " + instance.id);
        }
        return ret;
    },

    attachEBSVolume : function() {
        var instance = this.getSelected();
        if (instance == null) return;

        if (instance.state != "running") {
            alert("Instance should in running state")
            return;
        }

        if (!this.isInstanceReadyToUse(instance)) {
            return;
        }

        // Determine if there is actually an EBS volume to attach to
        var volumes = ew_session.model.getVolumes();
        if (volumes == null || volumes.length == 0) {
            // There are no volumes to attach to.
            var fRet = confirm ("Would you like to create a new EBS volume to attach to this instance?");
            if (fRet) {
                fRet = ew_VolumeTreeView.createVolume();
            }

            if (fRet) {
                volumes = ew_session.model.getVolumes();
            } else {
                return;
            }
        }

        var retVal = {ok:null, volumeId:null, device:null, windows: isWindows(instance.platform) };
        window.openDialog("chrome://ew/content/dialogs/attach_ebs_volume.xul",null, "chrome,centerscreen,modal,resizable", ew_session, instance, retVal);
        if (retVal.ok) {
            ew_VolumeTreeView.attachEBSVolume(retVal.volumeId,instance.id,retVal.device);
            ew_VolumeTreeView.refresh();
            ew_VolumeTreeView.select({ id: retVal.volumeId });
            ew_session.selectTab('ew.tabs.volume')
        }
    },

    associateWithEIP : function() {
        var instance = this.getSelected();
        if (instance == null) return;
        if (instance.state != "running") {
            alert("Instance should in running state")
            return;
        }

        // Determine if there is actually an EIP to associate with
        var eipList = ew_session.model.getAddresses();
        if (!eipList) {
            if (confirm ("Would you like to create a new Elastic IP to associate with this instance?")) {;
                ew_session.selectTab('ew.tabs.eip');
                ew_ElasticIPTreeView.allocateAddress();
            }
            return;
        }
        var eips = [];
        for (var i in eipList) {
            var eip = eipList[i];
            if ((isVpc(instance) && eip.domain != "vpc") || (!isVpc(instance) && eip.domain == "vpc")) continue;
            eips.push(eip)
        }
        var idx = ew_session.promptList("Associate EIP with Instance", "Which EIP would you like to associate with " + instance.toString() + "?", eips);
        if (idx < 0) return;
        var eip = eips[idx];

        if (eip.instanceId) {
            if (!this.session.promptYesNo("Confirm", "Address " + eip.publicIp + " is already mapped to an instance, continue?")) {
                return false;
            }
        }
        ew_session.controller.associateAddress(eip, instance.id, null, function() { me.refresh() });
    },

    retrieveRSAKeyFromKeyFile : function(keyFile, fSilent) {
        var fileIn = FileIO.open(keyFile);
        if (!fileIn || !fileIn.exists()) {
            alert ("Couldn't find EC2 Private Key File: " + keyFile);
            return null;
        }

        // Let's retrieve the RSA Private Key
        // 1. Read the RSA Private Key File In
        // 2. Remove the header and footer
        // 3. Bas64 Decode the string
        // 4. Convert the decoded string into a byte array
        // 5. Retrieve the key from the decoded byte array
        var str = FileIO.read(fileIn);
        var keyStart = "PRIVATE KEY-----";
        var keyEnd = "-----END RSA";

        var startIdx = str.indexOf(keyStart);
        var endIdx = str.indexOf(keyEnd);

        if (startIdx >= endIdx) {
            if (!fSilent) {
                alert ("Invalid EC2 Private Key");
            }
            return null;
        }

        startIdx += keyStart.length;
        var keyStr = str.substr(startIdx, endIdx - startIdx);
        keyStr = keyStr.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        var decodedKey = Base64.decode(keyStr);
        var keyArray = toByteArray(decodedKey);
        var hexArray = bin2hex(keyArray);
        log('RSA Key Str: ' + keyStr + " ByteArray: " + keyArray + " HexArray: " + hexArray);

        var rpk =  parseRSAKey(keyArray);
        var rsakey = null;
        if (rpk != null) {
            rsakey = new RSAKey();
            rsakey.setPrivateEx(rpk.N, rpk.E, rpk.D, rpk.P, rpk.Q, rpk.DP, rpk.DQ, rpk.C);
        }

        return rsakey;
    },

    decodePassword : function(output, fSilent) {
        // Parse out the base64 encoded password string
        var fSuccess = true;
        var passStart = "<Password>";
        var passEnd = "</Password>";
        var startIdx = -1;
        var endIdx = -1;

        if (output == null) {
            fSuccess = false;
        }

        if (fSuccess) {
            startIdx = output.lastIndexOf(passStart);
            if (startIdx == -1) {
                fSuccess = false;
            }
        }

        if (fSuccess) {
            endIdx = output.lastIndexOf(passEnd);

            if ((endIdx < startIdx) || (endIdx == -1)) {
                fSuccess = false;
            }
        }

        if (fSuccess) {
            startIdx += passStart.length;
            var password = output.substr(startIdx, endIdx - startIdx);
            // Decode the password
            password = Base64.decode(password);
            // Convert the string to a byte array
            var passwordBytes = toByteArray(password);
            // Convert the byte array into a hex array that can be processed by the RSADecrypt function.
            var passwordHex = bin2hex(passwordBytes);
            return passwordHex;
        }

        if (!fSuccess) {
            if (!fSilent) {
                alert ("The Password has not been generated for this instance.");
            }
            return null;
        }
    },

    promptForKeyFile : function(keyName) {
        var keyFile = ew_session.promptForFile("Select the EC2 Private Key File for key: " + keyName);
        if (keyFile) {
            ew_prefs.setLastEC2PrivateKeyFile(keyFile);
        }
        log("getkey: " + keyName + "=" + keyFile);
        return keyFile;
    },

    getInstancePasswordImpl : function(output, fSilent) {
        var fSuccess = true;
        var instance = this.getSelected();
        if (!isWindows(instance.platform)) {
            this.instPassword = "";
            fSuccess = false;
            return;
        }

        if (output == null || output.length == 0) {
            alert ("This instance is currently being configured. Please try again in a short while...");
            this.instPassword = "";
            fSuccess = false;
            return;
        }

        if (fSuccess) {
            // 3. Get the password hex array by parsing the console output
            var passwordHex = this.decodePassword(output, fSilent);
            fSuccess = (passwordHex != null);
        }

        if (fSuccess) {
            var prvKeyFile = ew_prefs.getPrivateKeyFile(instance.keyName);
        }

        log("Private Key File: " + prvKeyFile);

        while (fSuccess) {
            // If the private key file was not specified, or couldn't be found,
            // ask the user for its location on the local filesystem
            if (prvKeyFile.length == 0) {
                prvKeyFile = this.promptForKeyFile(instance.keyName);
            }
            if (!FileIO.exists(prvKeyFile)) {
                fSuccess = false;
            }

            if (!fSuccess) {
                // Has a default key file been saved for this user account?
                var savedKeyFile = ew_prefs.getLastEC2PrivateKeyFile();
                if (savedKeyFile.length > 0 && prvKeyFile != savedKeyFile) {
                    prvKeyFile = savedKeyFile;
                    log("Using default private key file");
                    fSuccess = true;
                    continue;
                }

                // There is no default EC2 Private Key File, and a bad Private
                // Key File was specified. Ask the user whether they would like to retry with a new private key file
                if (!confirm ("An error occurred while reading the EC2 Private Key from file: " + prvKeyFile + ". Would you like to retry with a different private key file?")) {
                    break;
                } else {
                    prvKeyFile = "";
                    fSuccess = true;
                    continue;
                }
            }

            if (fSuccess) {
                // Get the RSA private key from the password file
                var rsaPrivateKey  = this.retrieveRSAKeyFromKeyFile(prvKeyFile, fSilent);
                fSuccess =  (rsaPrivateKey != null);
            }

            if (fSuccess) {
                var password = rsaPrivateKey.decrypt(passwordHex);

                // Display the admin password to the user
                if ((password != null) && (password.length > 0)) {
                    this.instPassword = password;
                    ew_session.copyToClipboard(password);
                    if (!fSilent) {
                        alert ("Instance Administrator Password [" + password + "] has been saved to clipboard");
                    }
                } else
                if (!fSilent) {
                    fSuccess = false;
                    // Reset the instance's password to be the empty string.
                    this.instPassword = "";
                    // Need to retry with a new private key file
                    if (!confirm("An error occurred while retrieving the password. Would you like to retry with a different private key file?")) {
                        break;
                    } else {
                        prvKeyFile = "";
                        fSuccess = true;
                        continue;
                    }
                }
            }

            // If we arrived here, everything succeeded,
            // so let's exit out of the loop.
            break;
        }
    },

    getAdminPassword : function(fSilent, instance) {
        // Since we are retrieving a new password, ensure that we are starting with a clean slate.
        if (instance == null) {
            instance = this.getSelected();
        }
        if (instance == null) return;
        this.instPassword = "";
        this.fSilent = fSilent;
        var me = this;
        var wrap = function(id, timestamp, output) {
            me.getInstancePasswordImpl(output, me.fSilent);
        }
        this.fetchConsoleOutput(wrap, instance);
        return this.instPassword;
    },

    selectionChanged : function(event) {
        var instance = this.getSelected();
        if (instance == null) return;
        if (instance.publicIpAddress == '') {
            instance.publicIpAddress = instance.getPublicIp();
        }
        if (instance.elasticIp == '') {
            var eip = ew_session.model.getAddressByInstanceId(instance.id);
            instance.elasticIp = eip ? eip.publicIp : '';
        }
        TreeView.selectionChanged.call(this, event);
    },

    enableOrDisableItems  : function(event) {
        var instance = this.getSelected();
        var fDisabled = (instance == null);
        document.getElementById("ew.instances.contextmenu").disabled = fDisabled;
        if (fDisabled) return;

        // Windows-based enable/disable
        if (isWindows(instance.platform)) {
          document.getElementById("instances.context.getPassword").disabled = false;
        } else {
          document.getElementById("instances.context.getPassword").disabled = true;
        }

        document.getElementById("instances.context.connectPublic").disabled = instance.publicIpAddress == ""
        document.getElementById("instances.context.connectElastic").disabled = instance.elasticIp == ""

        if (isEbsRootDeviceType(instance.rootDeviceType)) {
            document.getElementById("instances.context.bundle").disabled = true;
            document.getElementById("instances.context.createimage").disabled = false;
        } else {
            document.getElementById("instances.context.createimage").disabled = true;

            if (isWindows(instance.platform)) {
                document.getElementById("instances.context.bundle").disabled = false;
            } else {
                document.getElementById("instances.context.bundle").disabled = true;
            }
        }
        // These items are only valid for instances with EBS-backed root devices.
        var optDisabled = !isEbsRootDeviceType(instance.rootDeviceType);
        document.getElementById("instances.context.start").disabled = optDisabled;
        document.getElementById("instances.context.stop").disabled = optDisabled;
        document.getElementById("instances.context.forceStop").disabled = optDisabled;
        document.getElementById("instances.context.showTerminationProtection").disabled = optDisabled;
        document.getElementById("instances.context.changeTerminationProtection").disabled = optDisabled;
        document.getElementById("instances.button.start").disabled = optDisabled;
        document.getElementById("instances.button.stop").disabled = optDisabled;
    },

    launchMore : function() {
        var instance = this.getSelected();
        if (instance == null) return;

        var count = prompt("How many more instances of "+instance.id+"?", "1");
        if (count == null || count.trim().length == 0) return;
        count = count.trim();

        var me = this;
        ew_session.controller.runMoreInstances(instance, count, function() { me.refresh()});
    },

    terminateInstance : function() {
        var instances = this.getSelectedAll();
        if (instances.length == 0) return;
        if (!confirm("Terminate instances?")) return;

        var me = this;
        ew_session.controller.terminateInstances(instances, function() { me.refresh()});
    },

    stopInstance : function(force) {
        var instances = this.getSelectedAll();
        if (instanceIds.length == 0) return;

        if (!confirm("Stop instances?")) return;

        var me = this;
        ew_session.controller.stopInstances(instances, force, function() { me.refresh()});
    },

    changeUserData: function() {
        var instance = this.getSelected();
        if (instance == null) return;

        var returnValue = {accepted:false , result:null};
        ew_session.controller.describeInstanceAttribute(instance.id, "userData", function(value) {
            var text = ew_session.promptForText('Instance User Data:', (value ? Base64.decode(value) : ''));
            if (text == null) return;

            ew_session.controller.modifyInstanceAttribute(instance.id, 'UserData', Base64.encode(text));
        });
    },

    changeInstanceType: function() {
        var instance = this.getSelected();
        if (!instance) return;
        var me = this;
        ew_session.controller.describeInstanceAttribute(instance.id, "instanceType", function(value) {
            var idx = ew_session.promptList('Instance Type', 'Select instance type:', instanceTypes );
            if (idx == -1) return;
            ew_session.controller.modifyInstanceAttribute(instance.id, 'InstanceType', instanceTypes[idx], function() { me.refresh() });
        });
    },

    showTerminationProtection : function() {
        var instances = this.getSelectedAll();
        if (!instances.length) return;
        var statusList = new Array();

        function pushStatusToArray(instance, status) {
            statusList.push(status + " | " + instance.toString());
            if (statusList.length == instances.length) {
                alert(statusList.join("\n"));
            }
        }

        function __describeInstanceAttribute__(instance) {
            ew_session.controller.describeInstanceAttribute(instance.id, "disableApiTermination", function(value) {
                value = (value == "true");
                pushStatusToArray(instance, (value ? "enable" : "disable"));
            });
        }
        for (var i = 0; i < instances.length; i++) {
            __describeInstanceAttribute__(instances[i]);
        }
    },

    changeTerminationProtection : function() {
        var instances = this.getSelectedAll();
        if (!instances.length) return;
        var me = this;

        ew_session.controller.describeInstanceAttribute(instances[0].id, "disableApiTermination", function(value) {
            value = (value == "true")
            if (confirm((value ? "Disable" : "Enable") + " Termination Protection?")) {
                for (var i = 0; i < instances.length; i++) {
                  ew_session.controller.modifyInstanceAttribute(instances[i].id, "DisableApiTermination", !value);
                }
            }
        });
    },

    rebootInstance: function()
    {
        var instances = this.getSelectedAll();
        if (instances.length == 0) return;

        if (!confirm("Reboot "+instances.length+" instance(s)?")) return;
        var me = this;
        ew_session.controller.rebootInstances(instances, function() { me.refresh(); });
    },

    startInstance : function() {
        var instances = this.getSelectedAll();
        if (instances.length == 0) return;

        var me = this;
        ew_session.controller.startInstances(instances, function() {me.refresh()});
    },

    fetchConsoleOutput : function(callback, instance) {
        var me = this;
        if (instance == null) {
            instance = this.getSelected();
        }
        if (instance == null) {
            alert ("Please select an instance");
            return;
        }
        var wrap = callback;
        if (wrap == null) {
            wrap = function(id, timestamp, output) { me.showConsoleOutput(id, timestamp, output); }
        }
        ew_session.controller.getConsoleOutput(instance.id, false, wrap);
    },

    showConsoleOutput : function(id, timestamp, output) {
        window.openDialog("chrome://ew/content/dialogs/console_output.xul", null, "chrome,centerscreen,modal,resizable", id, timestamp, output);
    },

    showInstancesSummary : function() {
        window.openDialog("chrome://ew/content/dialogs/summary.xul", null, "chrome,centerscreen,modal,resizable", this.treeList, ew_session.getActiveEndpoint().name);
    },

    authorizeProtocolForGroup : function(transport, protocol, groups) {
        this.authorizeProtocolPortForGroup(transport,protocol,protPortMap[protocol],groups);
    },

    authorizeProtocolPortForGroup : function (transport, protocol, port, groups) {
        if (!ew_prefs.getOpenConnectionPort()) return;

        var result = {ipAddress:"0.0.0.0"};
        var fAdd = true;
        var openCIDR = "0.0.0.0/0";

        // host CIDR
        ew_session.client.queryCheckIP("", result);
        var hostCIDR = result.ipAddress.trim() + "/32";

        // network CIDR
        ew_session.client.queryCheckIP("block", result);
        var networkCIDR = result.ipAddress.trim();

        debug("Host: " + hostCIDR + ", net:" + networkCIDR)

        var permissions = null;
        for (var j in groups) {
            if (groups[j])
                permissions = groups[j].permissions;
            else
                continue;

            // Is the Protocol enabled for the group?
            for (var i in permissions) {
                var perm = permissions[i];

                if (perm.protocol == transport) {
                    // Nothing needs to be done if:
                    // 1. Either the from or to port of a permission
                    // matches the protocol's port or the port is within the
                    // port range
                    // AND
                    // 2. The CIDR for the permission matches either
                    // the host's CIDR or the network's CIDR or
                    // the Firewall has been opened to the world
                    var fromPort = parseInt(perm.fromPort);
                    var toPort = parseInt(perm.toPort);
                    port = parseInt(port);
                    if ((perm.fromPort == port || perm.toPort == port || (perm.fromPort <= port && perm.toPort >= port)) &&
                        (perm.cidrIp == openCIDR || perm.cidrIp == hostCIDR || perm.cidrIp == networkCIDR)) {
                        // We have a match!
                        fAdd = false;
                        break;
                    }
                }
            }

            if (!fAdd) {
                break;
            }
        }

        if (fAdd) {
            var result = false;
            if (ew_prefs.getPromptForPortOpening()) {
                port = port.toString();
                var msg = ew_prefs.getAppName() + " needs to open " + transport.toUpperCase() + " port " + port + " (" + protocol + ") to continue. Click Ok to authorize this action";

                // default the checkbox to false
                var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                var check = {value: false};
                result = prompts.confirmCheck(window, "EC2 Firewall Port Authorization", msg, "Do not ask me again", check);

                if (check.value) {
                    // The user asked not to be prompted again
                    ew_prefs.setPromptForPortOpening(false);
                    ew_prefs.setOpenConnectionPort(result);
                }
            } else {
                result = true;
            }

            if (result) {
                result = false;
                var wrap = function() {
                    ew_SecurityGroupsTreeView.refresh();
                }
                // Authorize first available group
                for (var i in groups) {
                    if (groups[i]) {
                        ew_session.controller.authorizeSourceCIDR('Ingress', groups[i], transport, port, port, hostCIDR, wrap);
                        result = true
                        break;
                    }
                }
            }
            if (!result) {
                alert("Could not authorize port " + port)
            }
        }
    },

    connectToSelectedInstances : function(ipType)
    {
        for (var i in this.treeList) {
            if (this.selection.isSelected(i)) {
                log ("Connecting to " + ipType + ": " + this.treeList[i].id);
                this.selection.currentIndex = i;
                this.connectTo(this.treeList[i], ipType);
            }
        }
    },

    openConnectionPort : function(instance)
    {
        // Get the group in which this instance was launched
        var groups = ew_model.getSecurityGroups();
        var instGroups = new Array(instance.groups.length);
        for (var j in instance.groups) {
            instGroups[j] = null;
            for (var i in groups) {
                if (groups[i].id == instance.groups[j]) {
                    instGroups[j] = groups[i];
                    break;
                }
            }
        }

        // If this is a Windows instance, we need to RDP instead
        if (isWindows(instance.platform)) {
            // Ensure that the RDP port is open in one of the instance's groups
            this.authorizeProtocolForGroup("tcp", "rdp", instGroups);
        } else {
            // Ensure that the SSH port is open in one of the instance's groups
            this.authorizeProtocolForGroup("tcp", "ssh", instGroups);
        }
    },

    // ipType: 0 - private, 1 - public, 2 - elastic, 3 - public or elastic, 4 - dns name
    connectTo : function(instance, ipType)
    {
        var args = ew_prefs.getSSHArgs();
        var cmd = ew_prefs.getSSHCommand();

        var hostname = !ipType ? instance.privateIpAddress :
                       ipType == 1 || ipType == 3 ? instance.getPublicIp() :
                       ipType == 4 ? instance.publicDnsName :
                       ipType == 2 ? instance.elasticIP : "";
        if (hostname == "" && ipType == 3) {
            hostname = this.instance.elasticIP
        }

        // Open ports for non private connection
        if (ipType) {
           this.openConnectionPort(instance);
        }

        if (hostname == "") {
            alert("No " + (!ipType ? "Private" : ipType == 1 ? "Public" : ipType == 2 ? "Elastic" : "") + " IP is available");
            return;
        }

        if (isWindows(instance.platform)) {
            args = ew_prefs.getRDPArgs();
            cmd = ew_prefs.getRDPCommand();
            if (isMac(navigator.platform)) {
                // On Mac OS X, we use a totally different connection mechanism that isn't particularly extensible
                this.getAdminPassword(false, instance);
                this.rdpToMac(hostname, cmd);
                return;
            }
        }
        var params = []
        params.push(["host", hostname]);
        params.push(["name", instance.name]);
        params.push(["keyname", instance.keyName])
        params.push(["publicDnsName", instance.publicDnsName]);
        params.push(["privateDnsName", instance.privateDnsName]);
        params.push(["privateIpAddress", instance.privateIpAddress]);

        if (args.indexOf("${pass}") >= 0) {
            var pass = this.getAdminPassword(true, instance);
            if (pass) {
                params.push(["pass", pass])
            }
        } else

        if (args.indexOf("${key}") >= 0) {
            var keyFile = ew_prefs.getPrivateKeyFile(instance.keyName);
            if (!FileIO.exists(keyFile)) {
                keyFile = this.promptForKeyFile(instance.keyName);
            }
            if (!keyFile || !FileIO.exists(keyFile)) {
                alert('Cannot connect without private key file for keypair ' + instance.keyName)
                return;
            }
            params.push(["key", keyFile])
        }

        if (args.indexOf("${login}") >= 0 && ew_prefs.getSSHUser() == "") {
            var login = prompt("Please provide SSH user name:");
            if (login && login != "") {
                params.push(["login", login])
            }
        }

        // Common substitution
        args = ew_prefs.getArgsProcessed(args, params, hostname);

        // Finally, split args into an array
        args = tokenise(args);

        ew_session.launchProcess(cmd, args);

    },

    rdpToMac : function(hostname, cmd)
    {
        var filename = ew_prefs.getHome() + "/" + ew_prefs.getAppName() + "/" + hostname + ".rdp";
        var config = FileIO.open(filename)

        if (!config.exists()) {
            // create a bare-bones RDP connection file
            var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
                      '<plist version="1.0">\n' +
                      '  <dict>\n' +
                      '    <key>ConnectionString</key>\n' +
                      '    <string>' + hostname + '</string>\n' +
                      '    <key>UserName</key>\n' +
                      '    <string>Administrator</string>\n' +
                      '  </dict>\n' +
                      '</plist>';

            FileIO.write(config, xml);
        }

        ew_session.launchProcess(cmd, [filename]);
    },

    isRefreshable : function(instances) {
        for (var i in this.treeList) {
            if (this.treeList[i].state == "pending" || this.treeList[i].state == "shutting-down") return true;
        }
        return false;
    },

};

ew_InstancesTreeView.__proto__ = TreeView;
ew_InstancesTreeView.register();
