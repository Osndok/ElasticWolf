var ew_ElasticIPTreeView = {
    COLNAMES : ['eip.address','eip.instanceid','eip.instanceName','eip.allocationId','eip.associationId','eip.domain','eip.tag'],
    treeBox : null,
    selection : null,
    eipList : new Array(),
    registered : false,
    imageIdRegex : new RegExp("^\\d+\\.\\d+\\.\\d+\\.\\d+"),
    get rowCount() { return this.eipList.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
    getCellText : function(idx, column) {
        if (idx >= this.rowCount) return "";
        var member = column.id.split(".").pop();
        return this.eipList[idx][member];
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },
    getImageSrc: function(idx, column) { return ""; },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) {
        var eip = this.getSelectedEip();
        cycleHeader(col, document, this.COLNAMES, this.eipList);
        if (eip) {
            log(eip.address + ": Select this eip post sort");
            this.selectByAddress(eip.address);
        } else {
            log("The selected eip is null!");
        }
    },

    sort : function() {
        var eipSel = this.getSelectedEip();
        sortView(document, this.COLNAMES, this.eipList);
        if (eipSel) this.selectByAddress(eipSel.address);
    },

    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    register: function() {
        if (!this.registered) {
            this.registered = true;
            ew_model.registerInterest(this, 'addresses');
        }
    },

    invalidate: function() {
        this.displayEIPs(ew_session.model.addresses);
    },

    refresh: function() {
        ew_session.controller.describeAddresses();
    },

    notifyModelChanged: function(interest) {
        this.invalidate();
    },

    displayEIPs : function (eipList) {
        if (!eipList) { eipList = []; }

        this.treeBox.rowCountChanged(0, -this.eipList.length);
        this.eipList = eipList;
        this.treeBox.rowCountChanged(0, this.eipList.length);
        this.sort();
        this.selection.clearSelection();
        if (eipList.length > 0) {
           this.selection.select(0);
        }
    },

    viewDetails : function(event) {
        var selected = new Array();
        for(var i in this.eipList) {
          if (this.selection.isSelected(i)) {
             selected.push(this.eipList[i]);
          }
        }
        if (selected.length != 1) return;

        window.openDialog("chrome://ew/content/dialog_eip_details.xul", null, "chrome,centerscreen,modal,resizable", selected[0]);
    },

    enableOrDisableItems : function() {
        var eipSel = this.getSelectedEip();
        document.getElementById("ew.addresses.contextmenu").disabled = (eipSel == null);

        if (eipSel == null) return;

        var fAssociated = true;
        if (eipSel.instanceid == null ||
            eipSel.instanceid == "") {
            // There is no instance associated with this address
            fAssociated = false;
        }

        document.getElementById("addresses.context.disassociate").disabled = !fAssociated;
    },

    selectByAddress: function(address) {
        this.selection.clearSelection();
        for(var i in this.eipList) {
            if (this.eipList[i].address == address) {
                this.selection.select(i);
                this.treeBox.ensureRowIsVisible(i);
                return;
            }
        }

        // In case we don't find a match (which is probably a bug).
        this.selection.select(0);
    },

    getSelectedEip : function() {
        var index =  this.selection.currentIndex;
        if (index == -1) return null;
        return this.eipList[index];
    },

    allocateAddress : function() {
        if (!ew_session.client.isGovCloud()) {
            var vpc = ew_session.promptYesNo("Confirm", "Is this Elastic IP to be used for VPC?");
        } else {
            var vpc = true
        }
        var me = this;
        var wrap = function(address) {
            me.refresh();
            me.selectByAddress(address);
        }
        ew_session.controller.allocateAddress(vpc, wrap);
    },

    releaseAddress : function() {
        var eip = this.getSelectedEip();
        if (eip == null) return;
        if (!ew_session.promptYesNo("Confirm", "Release "+eip.address+"?")) return;

        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ew_session.controller.releaseAddress(eip, wrap);
    },

    getUnassociatedInstanceIds : function() {
        var instanceIds = new Array();
        var instList = ew_model.getInstances();
        var i = 0;

        var inst = null;
        var tag = null;
        var id = null;
        for (i in instList) {
            inst = instList[i];
            if (inst.state == "running") {
                id = inst.id;
                tag = __tagToName__(inst.tag);
                if (tag && tag.length) {
                    id = id + ":" +  tag;
                }
                instanceIds.push(id);
            }
        }

        var eips = {};
        var unassociated = new Array();

        i = 0;
        var eip = null;
        // Build the list of EIPs that are associated with an instance
        for (i in this.eipList) {
            eip = this.eipList[i];
            if (eip.instanceid == null ||
                eip.instanceid.length == 0) {
                continue;
            }
            eips[eip.instanceid] = eip.address;
        }

        i = 0;
        var lastItem = 0;
        var temp = null;
        var instId = null;
        for (i in instanceIds) {
            instId = instanceIds[i].split(":")[0];
            if (eips[instId]) {
                continue;
            }
            unassociated.push(instanceIds[i]);
        }

        return unassociated;
    },

    associateAddress : function(eip) {
        // If an elastic IP hasn't been passed in to be persisted to EC2, create a mapping between the Address and Instance.
        if (eip == null) {
            eip = this.getSelectedEip();
            if (eip == null) return;

            if (eip.instanceid != null && eip.instanceid != '') {
                var confirmed = confirm("Address "+eip.address+" is already mapped to an instance, are you sure?");
                if (!confirmed)
                    return;
            }

            var instanceIds = this.getUnassociatedInstanceIds();

            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            var selected = {};
            var result = prompts.select(null, "Associate Address with Instance", "Which Instance would you like to associate "+ eip.address +" with?", instanceIds.length, instanceIds,selected);
            if (!result) {
                return;
            }
            eip.instanceid = instanceIds[selected.value].split(":")[0];
        }

        var me = this;
        var wrap = function() {
            me.refresh();
            me.selectByAddress(eip.address);
        }
        ew_session.controller.associateAddress(eip, eip.instanceid, wrap);
        return true;
    },

    disassociateAddress : function() {
        var eip = this.getSelectedEip();
        if (eip == null) return;
        if (eip.instanceid == null || eip.instanceid == '') {
            alert("This EIP is not associated")
            return;
        }

        var confirmed = confirm("Disassociate "+eip.address+" and instance "+eip.instanceid+"?");
        if (!confirmed)
            return;

        var me = this;
        var wrap = function() {
            me.refresh();
        }
        ew_session.controller.disassociateAddress(eip, wrap);
    },

    tag : function() {
        var eip = this.getSelectedEip();

        if (eip == null) {
            return;
        }

        tagResource(eip, ew_session, "address");
        this.selectByAddress(eip.address);
    },

    copyToClipBoard : function(fieldName) {
        var eip = this.getSelectedEip();
        if (eip == null) {
            return;
        }

        copyToClipboard(eip[fieldName]);
    },

    copyPublicDnsToClipBoard : function(fieldName) {
        var eip = this.getSelectedEip();
        if (!eip) { return; }

        var publicDnsName = eip.instancePublicDnsName;
        if (!publicDnsName) { return; }

        copyToClipboard(publicDnsName);
    }

};

ew_ElasticIPTreeView.register();
