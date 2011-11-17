var ec2ui_InstancesTreeView = {
    COLNAMES : [
       'instance.name',
       'instance.resId',
       'instance.ownerId',
       'instance.id',
       'instance.imageId',
       'instance.kernelId',
       'instance.ramdiskId',
       'instance.state',
       'instance.publicDnsName',
       'instance.privateDnsName',
       'instance.privateIpAddress',
       'instance.keyName',
       'instance.groups',
       'instance.reason',
       'instance.amiLaunchIdx',
       'instance.instanceType',
       'instance.launchTimeDisp',
       'instance.placement.availabilityZone',
       'instance.platform',
       'instance.tag',
       'instance.vpcId',
       'instance.subnetId',
       'instance.rootDeviceType'
    ],

    treeBox: null,
    selection: null,
    instanceList : new Array(),
    registered : false,
    instPassword : null,
    instanceIdRegex : new RegExp("^i-"),
    selectedInstanceId : null, // To preserve instance selections across
                                // refreshes, etc

    get rowCount() { return this.instanceList.length; },
    setTree     : function(treeBox)     { this.treeBox = treeBox; },
    getCellText : function(idx, column) {
        if (idx >= this.rowCount) return "";
        // Don't eliminate eval here because availability zone is retrieved via
        // placement.availabilityZone.
        return this.getInstanceDetail(this.instanceList[idx], column.id);
    },

    getCellProperties : function(row, col, props) {
        var shortName = col.id.split(".").pop();
        if (shortName == "state") {
            var stateName = this.instanceList[row].state.replace('-','_').toLowerCase();
            var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
            props.AppendElement(aserv.getAtom("instance_"+stateName));
        }
    },

    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },

    getImageSrc: function(idx, column) { return ""; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) {
        var instance = this.getSelectedInstance();
        cycleHeader(
            col,
            document,
            this.COLNAMES,
            this.instanceList);
        this.treeBox.invalidate();
        if (instance) {
            log(instance.id + ": Select this instance post sort");
            this.selectByInstanceId(instance.id);
        } else {
            log("The selected instance is null!");
        }
    },

    getSelectedInstance : function() {
        var index = this.selection.currentIndex;
        return (index == -1) ? null : this.instanceList[index];
    },

    getSelectedInstances : function() {
        var instances = new Array();
        for(var i in this.instanceList) {
            if (this.selection.isSelected(i)) {
                instances.push(this.instanceList[i]);
            }
        }

        return instances;
    },

    getSelectedInstanceIds : function() {
        var instanceIds = new Array();
        for(var i in this.instanceList) {
            if (this.selection.isSelected(i)) {
                instanceIds.push(this.instanceList[i].id);
            }
        }

        return instanceIds;
    },

    getSelectedInstanceIdsWithName : function() {
        var instanceIds = new Array();
        for(var i in this.instanceList) {
            if (this.selection.isSelected(i)) {
                instanceIds.push([this.instanceList[i].id, this.instanceList[i].name]);
            }
        }

        return instanceIds;
    },

    getSelectedInstanceNamedIds : function() {
        var instanceIdsWithName = this.getSelectedInstanceIdsWithName();
        var instanceIds = new Array();
        var instances = new Array();

        for (var i = 0; i < instanceIdsWithName.length; i++) {
            var instanceId = instanceIdsWithName[i][0];
            var instanceName = instanceIdsWithName[i][1];
            instanceIds.push(instanceId);
            if (!instanceName) { instanceName = '(no name)'; }
            instances.push(instanceName + '@' + instanceId);
        }

        return [instanceIds, instances];
    },

    tag : function(event) {
        var instances = this.getSelectedInstances();

        if (instances.length == 0) {
            return;
        }

        if (instances.length == 1) {
            tagEC2Resource(instances[0], ec2ui_session);
        } else {
            ec2ui_utils.tagMultipleEC2Resources(instances, ec2ui_session);
        }

        this.selectByInstanceIds(instances);
    },

    viewDetails : function(event) {
        var instance = this.getSelectedInstance();

        if (instance == null) {
            return;
        }

        var mani = ec2ui_session.model.getAmiManifestForId(instance.imageId);
        if (mani.length == 0) {
            // Need to call describe Image
            ec2ui_session.controller.describeImage(instance.imageId);
        }
        window.openDialog("chrome://ec2ui/content/dialog_instance_details.xul", null, "chrome,centerscreen,modeless,resizable", ec2ui_session, instance);
    },

    getSearchText: function() {
        return document.getElementById('ec2ui.instances.search').value;
    },

    invalidate : function() {
        var target = ec2ui_InstancesTreeView;
        target.displayInstances(target.filterInstances(ec2ui_model.instances));
    },

    searchChanged : function(event) {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(this.invalidate, 500);
    },

    filterInstances : function(instances) {
        // No longer need to lowercase this because the patt is created with "i"
        var searchText = this.getSearchText();
        var filterTerm = document.getElementById("ec2ui.instances.noterminated").checked;
        var filterStop = document.getElementById("ec2ui.instances.nostopped").checked;
        if (searchText.length == 0 &&
            !(filterTerm || filterStop)) {
            return instances;
        }

        var newList = new Array();
        var inst = null;
        var patt = new RegExp(searchText, "i");
        for(var i in instances) {
            inst = instances[i];
            if (filterTerm &&
                inst.state == "terminated") {
                continue;
            }
            if (filterStop &&
                inst.state == "stopped") {
                continue;
            }
            if (inst.id.match(this.instanceIdRegex) &&
                this.instanceMatchesSearch(inst, patt)) {
                newList.push(inst);
            }
        }
        return newList;
    },

    instanceMatchesSearch : function(instance, patt) {
        if (!instance || !patt) return false;

        for (var i = 0; i < this.COLNAMES.length; i++) {
            var text = this.getInstanceDetail(instance, this.COLNAMES[i]);
            if (text.match(patt)) {
                return true;
            }
        }

        return false;
    },

    getInstanceDetail : function(instance, column) {
        var detail = eval(column);
        if (column.indexOf("ownerId") > 0) {
            detail = ec2ui_session.lookupAccountId(detail);
        }
        return detail || "";
    },

    showBundleDialog : function() {
        var retVal = {ok:null,bucketName:null,prefix:null};
        var instance = this.getSelectedInstance();
        if (instance == null) return;

        do {
            var bucketReg = null;
            window.openDialog("chrome://ec2ui/content/dialog_bundle_instance.xul", null, "chrome,centerscreen,modal,resizable", instance.id, ec2ui_session, retVal);

            ec2ui_session.showBusyCursor(true);
            if (retVal.ok) {
                // Create the bucket if it doesn't exist
                retVal.ok = ec2ui_session.controller.createS3Bucket(retVal.bucketName);
            } else {
                // The user doesn't want to proceed!
                // If you get rid of this, the dialog keeps popping back up!
                break;
            }

            if (retVal.ok) {
                var reg = ec2ui_utils.determineRegionFromString(ec2ui_session.getActiveEndpoint().name);
                bucketReg = ec2ui_session.controller.getS3BucketLocation(retVal.bucketName) || reg;
                log(reg + ": active region ");
                log(bucketReg + ": bucket's region ");
                retVal.ok = (reg == bucketReg);
                if (!retVal.ok) {
                    alert ("You must specify a bucket in the '" + reg + "'. Please try again");
                    retVal.bucketName = "";
                }
            }

            // Determine whether the user owns the specified bucket
            if (retVal.ok) {
                retVal.ok = ec2ui_session.controller.writeS3KeyInBucket(retVal.bucketName, retVal.prefix + ".manifest.xml", "ec2ui-write-test", bucketReg);

                if (!retVal.ok) {
                    alert ("ERROR: It appears that you don't have write permissions on the bucket: " + retVal.bucketName);
                }
            }
        } while (!retVal.ok);

        ec2ui_session.showBusyCursor(false);

        if (retVal.ok) {
            var wrap = function(list) {
                if (list == null) return;
                // Since we allow just one instance to be bundled at a
                // time, this list will only contain information about
                // the newly created SINGLE bundle task. In order to
                // select this task in the new view, it suffices to
                // select list[0].id

                // Navigate to the Bundle Tasks tab
                ec2ui_BundleTasksTreeView.refresh();
                ec2ui_BundleTasksTreeView.selectByBundleId(list[0].id);
                var tabPanel = document.getElementById("ec2ui.primary.tabs");
                tabPanel.selectedIndex = 9;
            }

            ec2ui_session.controller.bundleInstance(instance.id, retVal.bucketName, retVal.prefix, ec2ui_session.getActiveCredential(), wrap);
        }
    },

    showCreateImageDialog : function() {
        var retVal = {ok:null,amiName:null,amiDescription:null,noReboot:null};
        var instance = this.getSelectedInstance();
        if (instance == null) return;

        window.openDialog("chrome://ec2ui/content/dialog_create_image.xul",
                          null,
                          "chrome,centerscreen,modal,resizable",
                          instance.id,
                          ec2ui_session,
                          retVal);

        if (retVal.ok) {
            var wrap = function(id) {
                alert("A new EBS-backed AMI is being created and will\n"+
                      "be available in a moment.\n\n"+
                      "The AMI ID is: "+id);
            }

            ec2ui_session.controller.createImage(instance.id,
                                                 retVal.amiName,
                                                 retVal.amiDescription,
                                                 retVal.noReboot,
                                                 wrap);
        }
    },

    isInstanceReadyToUse : function(instance) {
        var ret = false;
        if (isWindows(instance.platform)) {
            var consoleRsp = ec2ui_session.controller.getConsoleOutput(instance.id);
            // Parse the response to determine whether the instance is ready to
            // use
            var output = ec2ui_session.controller.onCompleteGetConsoleOutput(consoleRsp);
            if (output.indexOf("Windows is Ready to use") >= 0) {
                ret = true;
            }
        } else {
            ret = true;
        }

        if (!ret) {
            alert ("Please wait till 'Windows is Ready to use' before attaching an EBS volume to instance: " + instance.id);
        }
        return ret;
    },

    attachEBSVolume : function() {
        var instance = this.getSelectedInstance();
        if (instance == null) {
            return;
        }

        if (instance.state != "running") {
            return;
        }

        if (!this.isInstanceReadyToUse(instance)) {
            return;
        }

        // Determine if there is actually an EBS volume to attach to
        var volumes = ec2ui_session.model.getVolumes();
        if (volumes == null || volumes.length == 0) {
            // There are no volumes to attach to.
            var fRet = confirm ("Would you like to create a new EBS volume to attach to this instance?");
            if (fRet) {
                fRet = ec2ui_VolumeTreeView.createVolume();
            }

            if (fRet) {
                volumes = ec2ui_session.model.getVolumes();
            } else {
                return;
            }
        }

        var retVal = {ok:null, volumeId:null, device:null};
        window.openDialog("chrome://ec2ui/content/dialog_attach_ebs_volume.xul",null, "chrome,centerscreen,modal,resizable", ec2ui_session, instance, retVal);
        if (retVal.ok) {
            log(instance.id + " to be associated with " + retVal.volumeId);

            ec2ui_VolumeTreeView.attachEBSVolume(
                retVal.volumeId,
                instance.id,
                retVal.device
                );

            // Navigate to the Volumes Tab
            if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
                ec2ui_VolumeTreeView.refresh();
            }
            var tabPanel = document.getElementById("ec2ui.primary.tabs");
            tabPanel.selectedIndex = 7;
            ec2ui_VolumeTreeView.selectByImageId(retVal.volumeId);
        }
    },

    associateWithEIP : function() {
        var instance = this.getSelectedInstance();
        if (instance == null) {
            return;
        }

        if (instance.state != "running") {
            return;
        }

        // Determine if there is actually an EIP to associate with
        var addresses = ec2ui_session.model.getAddresses();
        if (addresses == null || addresses.length == 0) {
            // There are no addresses to associate with.
            var fAddEIP = confirm ("Would you like to create a new Elastic IP to associate with this instance?");
            if (fAddEIP) {
                var tabPanel = document.getElementById("ec2ui.primary.tabs");
                tabPanel.selectedIndex = 6;
                ec2ui_ElasticIPTreeView.allocateAddress();
            }
            return;
        }

        var retVal = {ok:null,eipMap:null};
        window.openDialog("chrome://ec2ui/content/dialog_select_eip.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, instance, retVal);
        if (retVal.ok) {
            log(retVal.eipMap.address + " to be associated with " + retVal.eipMap.instanceId);
            ec2ui_ElasticIPTreeView.associateAddress(retVal.eipMap);
        }
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
            // log("Base64 Encoded Password: " + password);

            // Decode the password
            password = Base64.decode(password);
            // log("Decoded Password: " + password);

            // Convert the string to a byte array
            var passwordBytes = toByteArray(password);
            // log("Password Bytes: " + passwordBytes);

            // Convert the byte array into a hex array that can be processed
            // by the RSADecrypt function.
            var passwordHex = bin2hex(passwordBytes);
            // log("Password Hex: " + passwordHex);

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
        var keyFile = ec2ui_session.promptForFile("Select the EC2 Private Key File for key: " + keyName);
        if (keyFile) {
            if (confirm('Would you like to use "' + keyFile + '" as the default EC2 Private Key File for "' + ec2ui_session.getActiveCredential().name + '"?')) {
                ec2ui_prefs.setLastEC2PKeyFile(keyFile);
            }
        }

        log("getkey: " + keyName + "=" + keyFile);
        return keyFile;
    },

    getInstancePasswordImpl : function(output, fSilent) {
        var fSuccess = true;
        var instance = this.getSelectedInstance();
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
            var prvKeyFile = ec2ui_prefs.getPrivateKeyFile(instance.keyName);
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
                var savedKeyFile = ec2ui_prefs.getLastEC2PKeyFile();
                if (savedKeyFile.length > 0 && prvKeyFile != savedKeyFile) {
                    prvKeyFile = savedKeyFile;
                    log("Using default private key file");
                    fSuccess = true;
                    continue;
                }

                // There is no default EC2 Private Key File, and a bad Private
                // Key File was specified. Ask the user whether
                // they would like to retry with a new private key file
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
                    copyToClipboard(password);
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
        // Since we are retrieving a new password, ensure that we are
        // starting with a clean slate.
        if (instance == null) {
            instance = this.getSelectedInstance();
        }

        if (instance == null) {
            return;
        }

        ec2ui_session.showBusyCursor(true);
        this.instPassword = "";
        this.fSilent = fSilent;
        var me = this;
        var wrap = function(id, timestamp, output) {
            me.getInstancePasswordImpl(output, me.fSilent);
        }
        this.fetchConsoleOutput(wrap, instance);
        ec2ui_session.showBusyCursor(false);
        return this.instPassword;
    },

    sort : function() {
        this.selectionChanged();
        sortView(document, this.COLNAMES, this.instanceList);
        this.selectByInstanceId(this.selectedInstanceId);
    },

    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    selectByInstanceIds : function(list) {
        if (!list) return;
        this.selection.clearSelection();
        for(var i in list) {
            this.selectByInstanceId(list[i].id, true);
        }
    },

    selectByInstanceId : function(id, fPreservePrev) {
        if (!id) return;
        var inst = null;
        var len = this.instanceList.length;

        if (!fPreservePrev) {
            this.selection.clearSelection();
        }

        for(var i = 0; i < len; ++i) {
            inst = this.instanceList[i];
            if (inst.id == id) {
                log (inst.id + ": Select this instance post sort");
                this.selection.toggleSelect(i);
                this.treeBox.ensureRowIsVisible(i);
                return;
            }
        }
    },

    selectionChanged : function(event) {
        // When an instance is selected, select the associated AMI, ARI and AKI
        // but only if a single instance has been selected

        var instance = this.getSelectedInstance();
        if (instance == null) return;
        this.selectedInstanceId = instance.id;

        // Ensure the instance's image is selected
        ec2ui_AMIsTreeView.selectByImageId(instance.imageId);
    },

    register: function() {
        if (!this.registered) {
            this.registered = true;
            ec2ui_model.registerInterest(this, 'instances');
        }
    },

    refresh : function() {
        this.selectionChanged();
        ec2ui_session.showBusyCursor(true);
        ec2ui_session.controller.describeInstances();
        this.sort();
        ec2ui_session.showBusyCursor(false);
    },

    notifyModelChanged: function(interest) {
        this.invalidate();
    },

    enableOrDisableItems  : function(event) {
        var index =  this.selection.currentIndex;
        var fDisabled = (index == -1);
        document.getElementById("ec2ui.instances.contextmenu").disabled = fDisabled;

        if (fDisabled) return;

        var instance = this.instanceList[index];

        // Windows-based enable/disable
        if (isWindows(instance.platform)) {
          document.getElementById("instances.context.getPassword").disabled = false;
        } else {
          document.getElementById("instances.context.getPassword").disabled = true;
        }

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

        // These context menu items don't apply to Windows instances
        // so enable them.


        // These items are only valid for instances with EBS-backed
        // root devices.
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
        var index =  this.selection.currentIndex;
        if (index == -1) return;

        var instance = this.instanceList[index];
        var count = prompt("How many more instances of "+instance.id+"?", "1");
        if (count == null || count.trim().length == 0)
            return;

        var me = this;
        var wrap = function(list) {
            ec2ui_InstancesTreeView.refresh();
            ec2ui_InstancesTreeView.selectByInstanceIds(list);
        }
        count = count.trim();
        ec2ui_session.controller.runInstances(instance.imageId, instance.kernelId, instance.ramdiskId, count, count, instance.keyName, instance.groupList, null, null, instance.instanceType, instance.placement, instance.subnetId, null, wrap);
    },

    terminateInstance : function() {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        if (instanceIds.length == 0)
            return;

        var confirmed = confirm("Terminate instances: \n"+ instanceLabels.join("\n") +"?");
        if (!confirmed)
            return;

        var wrap = function() {
            ec2ui_InstancesTreeView.refresh();
            ec2ui_InstancesTreeView.selectByInstanceIds();
        }
        ec2ui_session.controller.terminateInstances(instanceIds, wrap);
    },

    stopInstance : function() {
        this.doStopInstances(false);
    },

    forceStopInstance : function() {
        this.doStopInstances(true);
    },

    doStopInstances : function(force) {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        if (instanceIds.length == 0)
            return;

        var confirmed = confirm("Stop instances: \n"+ instanceLabels.join("\n")+"?");
        if (!confirmed)
            return;

        var wrap = function() {
            ec2ui_InstancesTreeView.refresh();
            ec2ui_InstancesTreeView.selectByInstanceIds();
        }
        ec2ui_session.controller.stopInstances(instanceIds, force, wrap);
    },

    showUserData : function() {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        var statusList = new Array();

        function pushStatusToArray(instanceLabel, status) {
            statusList.push(status + " | " + instanceLabel);

            if (statusList.length == instanceIds.length) {
                alert(statusList.join("\n"));
            }
        }

        function __describeInstanceAttribute__(instanceId, instanceLabel) {
            ec2ui_session.controller.describeInstanceAttribute(instanceId, "userData", function(value) {
                pushStatusToArray(instanceLabel, (value ? Base64.decode(value) : "(empty)"));
            });
        }

        for (var i = 0; i < instanceIds.length; i++) {
            __describeInstanceAttribute__(instanceIds[i], instanceLabels[i]);
        }
    },

    changeUserData: function() {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        if (instanceIds.length == 0) {
            alert('Please select one instance.');
            return
        } else if (instanceIds.length > 1) {
            alert('Cannot select multi instances.');
            return;
        }

        var instanceId = instanceIds[0];
        var instanceLabel = instanceLabels[0]
        var returnValue = {accepted:false , result:null};

        ec2ui_session.controller.describeInstanceAttribute(instanceId, "userData", function(value) {
            openDialog('chrome://ec2ui/content/dialog_user_data.xul', null, 'chrome,centerscreen,modal,width=400,height=250', instanceLabel, (value ? Base64.decode(value) : ''), returnValue);

            if (returnValue.result == null) {
                return;
            }

            var attribute = ['UserData', Base64.encode(returnValue.result)];
            ec2ui_session.controller.modifyInstanceAttribute(instanceId, attribute);
        });
    },

    changeInstanceType: function() {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        if (instanceIds.length == 0) {
            alert('Please select one instance.');
            return
        } else if (instanceIds.length > 1) {
            alert('Cannot select multi instances.');
            return;
        }

        var instanceId = instanceIds[0];
        var instanceLabel = instanceLabels[0]
        var returnValue = {accepted:false , result:null};

        ec2ui_session.controller.describeInstanceAttribute(instanceId, "instanceType", function(value) {
            openDialog('chrome://ec2ui/content/dialog_instance_type.xul', null, 'chrome,centerscreen,modal', instanceLabel, value, returnValue);

            if (returnValue.result == null) {
                return;
            }

            var attribute = ['InstanceType', returnValue.result];
            ec2ui_session.controller.modifyInstanceAttribute(instanceId, attribute, function() {
                ec2ui_InstancesTreeView.refresh();
                ec2ui_InstancesTreeView.selectByInstanceIds();
            });
        });
    },

    showTerminationProtection : function() {
        var instances = this.getSelectedInstanceNamedIds();
        var instanceIds = instances[0];
        var instanceLabels = instances[1];

        var statusList = new Array();

        function pushStatusToArray(instanceLabel, status) {
            statusList.push(status + " | " + instanceLabel);

            if (statusList.length == instanceIds.length) {
                alert(statusList.join("\n"));
            }
        }

        function __describeInstanceAttribute__(instanceId, instanceLabel) {
            ec2ui_session.controller.describeInstanceAttribute(instanceId, "disableApiTermination", function(value) {
                value = (value == "true");
                pushStatusToArray(instanceLabel, (value ? "enable" : "disable"));
            });
        }

        for (var i = 0; i < instanceIds.length; i++) {
            __describeInstanceAttribute__(instanceIds[i], instanceLabels[i]);
        }
    },

    changeTerminationProtection : function() {
        var instanceIds = this.getSelectedInstanceIds();
        var instanceId = instanceIds[0];
        var me = this;

        ec2ui_session.controller.describeInstanceAttribute(instanceId, "disableApiTermination", function(value) {
            value = (value == "true")
            var msg = null;

            if (value) {
                msg = "Termination Protection: enable -> disable ?";
            } else {
                msg = "Termination Protection: disable -> enable ?";
            }

            if (confirm(msg)) {
                for (var i = 0; i < instanceIds.length; i++) {
                  me.doChangeTerminationProtection(instanceIds[i], !value);
                }
            }
        });
    },

    doChangeTerminationProtection : function(instanceId, enable) {
        ec2ui_session.controller.modifyInstanceAttribute(instanceId, ["DisableApiTermination", enable]);
    },

    startInstance : function() {
        var instanceIds = this.getSelectedInstanceIds();
        if (instanceIds.length == 0)
            return;

        var me = this;
        var wrap = function() {
            if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
                ec2ui_InstancesTreeView.refresh();
                ec2ui_InstancesTreeView.selectByInstanceIds();
            }
        }
        ec2ui_session.controller.startInstances(instanceIds, wrap);
    },

    fetchConsoleOutput : function(callback, instance) {
        if (instance == null) {
            instance = this.getSelectedInstance();
        }

        if (instance == null) {
            alert ("Please select an instance");
            return;
        }

        var wrap = callback;
        var me = this;

        if (wrap == null) {
            wrap = function(id, timestamp, output) {
                if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
                    me.refresh();
                    me.showConsoleOutput(id, timestamp, output);
                }
            }
        }

        ec2ui_session.controller.getConsoleOutput(instance.id, wrap);
    },

    showConsoleOutput : function(id, timestamp, output) {
        window.openDialog("chrome://ec2ui/content/dialog_console_output.xul", null, "chrome,centerscreen,modal,resizable", id, timestamp, output);
    },

    showInstancesSummary : function() {
        window.openDialog("chrome://ec2ui/content/dialog_summary.xul", null, "chrome,centerscreen,modal,resizable", this.instanceList, ec2ui_session.getActiveEndpoint().name);
    },

    copyToClipBoard : function(fieldName) {
        var instance = this.getSelectedInstance();
        if (instance == null) {
            return;
        }

        copyToClipboard(instance[fieldName]);
    },

    authorizeProtocolForGroup : function(transport, protocol, groups) {
        this.authorizeProtocolPortForGroup(transport,protocol,protPortMap[protocol],groups);
    },

    authorizeProtocolPortForGroup : function (transport, protocol, port, groups) {
        if (!ec2ui_prefs.getOpenConnectionPort()) {
            return;
        }

        var result = {ipAddress:"0.0.0.0"};
        var fAdd = true;
        var openCIDR = "0.0.0.0/0";

        // host CIDR
        ec2ui_session.client.queryCheckIP("", result);
        var hostCIDR = result.ipAddress.trim() + "/32";

        // network CIDR
        ec2ui_session.client.queryCheckIP("block", result);
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
            if (ec2ui_prefs.getPromptForPortOpening()) {
                port = port.toString();
                var msg = ec2ui_prefs.getAppName() + " needs to open " + transport.toUpperCase() + " port " + port + " (" + protocol + ") to continue. Click Ok to authorize this action";

                // default the checkbox to false
                var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                var check = {value: false};
                result = prompts.confirmCheck(window, "EC2 Firewall Port Authorization", msg, "Do not ask me again", check);

                if (check.value) {
                    // The user asked not to be prompted again
                    ec2ui_prefs.setPromptForPortOpening(false);
                    ec2ui_prefs.setOpenConnectionPort(result);
                }
            } else {
                result = true;
            }

            if (result) {
                result = false;
                var wrap = function() {
                    ec2ui_SecurityGroupsTreeView.refresh();
                }
                // Authorize first available group
                for (var i in groups) {
                    if (groups[i]) {
                        ec2ui_session.controller.authorizeSourceCIDR(groups[i],transport,port,port,hostCIDR,wrap);
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

    connectToSelectedInstances : function() {
        for (var i in this.instanceList) {
            if (this.selection.isSelected(i)) {
                log ("Connecting to " + this.instanceList[i].id);
                this.selection.currentIndex = i;
                this.connectTo(this.instanceList[i]);
            }
        }
    },

    openConnectionPort : function(instance) {
        // Get the group in which this instance was launched
        var groups = ec2ui_model.getSecurityGroups();
        var instGroups = new Array(instance.groupList.length);
        for (var j in instance.groupList) {
            instGroups[j] = null;
            for (var i in groups) {
                if (groups[i].id == instance.groupList[j]) {
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

    getIPFromHostname : function(instance) {
        // extract the ip address from the public dns name
        var parts = instance.publicDnsName.split('-');
        return parts[1] + "." + parts[2] + "." + parts[3] + "." + parseInt(parts[4]);
    },

    connectTo : function(instance) {
        ec2ui_session.showBusyCursor(true);
        // build arguments string, doing param substitution the default values
        // for the arguments and command are the SSH equivalents
        var args = ec2ui_prefs.getSSHArgs();
        var cmd = ec2ui_prefs.getSSHCommand();
        var hostname = this.getIPFromHostname(instance);

        if (isVpc(instance)) {
           hostname = instance.privateIpAddress;
        } else {
           this.openConnectionPort(instance);
        }

        if (isWindows(instance.platform)) {
            args = ec2ui_prefs.getRDPArgs();
            cmd = ec2ui_prefs.getRDPCommand();
            if (navigator.platform.match(ec2ui_utils.macRegex)) {
                // On Mac OS X, we use a totally different connection mechanism
                // that isn't particularly extensible
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
            var keyFile = ec2ui_prefs.getPrivateKeyFile(instance.keyName);
            if (!FileIO.exists(keyFile)) {
                keyFile = this.promptForKeyFile(instance.keyName);
            }
            if (keyFile) {
                params.push(["key", keyFile])
            }
        }


        // Common substitution
        args = ec2ui_prefs.getTemplateProcessed(args, params)

        // Finally, split args into an array
        args = tokenise(args);

        ec2ui_session.launchProcess(cmd, args);
        ec2ui_session.showBusyCursor(false);
    },

    rdpToMac : function(hostname, cmd) {
        var filename = ec2ui_prefs.getHome() + "/" + ec2ui_prefs.getAppName() + "/" + hostname + ".rdp";
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

        ec2ui_session.launchProcess(cmd, [filename]);
    },

    rebootInstance  : function() {
        var instanceIds = new Array();
        for(var i in this.instanceList) {
            if (this.selection.isSelected(i)) {
                instanceIds.push(this.instanceList[i].id);
            }
        }
        if (instanceIds.length == 0)
            return;

        var confirmed = confirm("Reboot "+instanceIds.length+" instance(s)?");
        if (!confirmed)
            return;

        var me = this;
        var wrap = function(list) {
            if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
                me.refresh();
                me.selectByInstanceIds(list);
            }
        }
        ec2ui_session.controller.rebootInstances(instanceIds, wrap);
    },

    pendingInstances : function(instances) {
        // Walk the list of instances to see whether there is
        // an instance whose state needs to be refreshed
        var fPending = false;
        if (instances == null || instances.length == 0) {
            return fPending;
        }

        for (var i in instances) {
            if (instances[i].state == "pending" ||
                instances[i].state == "shutting-down") {
                fPending = true;
                break;
            }
        }

        return fPending;
    },

    startRefreshTimer : function() {
        log("Starting Refresh Timer");
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        ec2ui_session.addTabToRefreshList("ec2ui_InstancesTreeView");
        // Set the UI up to refresh every 10 seconds
        var me = this;
        var wrap = function () { me.refresh(); };
        this.refreshTimer = setTimeout(wrap, 10*1000);
    },

    stopRefreshTimer : function() {
        log("Stopping Refresh Timer");
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            ec2ui_session.removeTabFromRefreshList("ec2ui_InstancesTreeView");
        }
    },

    displayInstances : function(instanceList) {
        this.treeBox.rowCountChanged(0, -this.instanceList.length);
        this.instanceList = instanceList || [];
        this.treeBox.rowCountChanged(0, this.instanceList.length);
        // reselect old selection
        if (this.selectedInstanceId) {
            this.selectByInstanceId(this.selectedInstanceId);
        } else {
            this.selection.clearSelection();
        }
        if (ec2ui_prefs.isRefreshOnChangeEnabled()) {
            // Determine if there are any pending instances
            if (this.pendingInstances(instanceList)) {
                this.startRefreshTimer();
            } else {
                this.stopRefreshTimer();
            }
        } else {
            // Refresh Has been disabled. Stop the timer in case
            // it has been started.
            this.stopRefreshTimer();
        }
        this.sort();
    }
};

ec2ui_InstancesTreeView.register();
