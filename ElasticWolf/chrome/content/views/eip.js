var ew_ElasticIPTreeView = {
    COLNAMES : ['eip.address','eip.instanceId','eip.allocationId','eip.associationId','eip.domain','eip.tag'],
    model: [ "addresses", "instances" ],

    viewDetails : function(event) {
        var eip = this.getSelected();
        if (!eip) return;
        window.openDialog("chrome://ew/content/dialogs/details_eip.xul", null, "chrome,centerscreen,modal,resizable", eip);
    },

    enableOrDisableItems : function() {
        var eip = this.getSelected();
        document.getElementById("ew.addresses.contextmenu").disabled = (eip == null);
        if (eip == null) return;

        var fAssociated = true;
        if (eip.instanceId == null || eip.instanceId == "") {
            // There is no instance associated with this address
            fAssociated = false;
        }
        document.getElementById("addresses.context.disassociate").disabled = !fAssociated;
    },

    allocateAddress : function() {
        if (!ew_session.client.isGovCloud()) {
            var vpc = ew_session.promptYesNo("Confirm", "Is this Elastic IP to be used for VPC?");
        } else {
            var vpc = true
        }
        var me = this;
        ew_session.controller.allocateAddress(vpc, function() { me.refresh() });
    },

    releaseAddress : function() {
        var eip = this.getSelected();
        if (eip == null) return;
        if (!ew_session.promptYesNo("Confirm", "Release "+eip.address+"?")) return;

        var me = this;
        ew_session.controller.releaseAddress(eip, function() { me.refresh() });
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
        for (i in this.treeList) {
            eip = this.treeList[i];
            if (eip.instanceId == null || eip.instanceId.length == 0) {
                continue;
            }
            eips[eip.instanceId] = eip.address;
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
            eip = this.getSelected();
            if (eip == null) return;

            if (eip.instanceId != null && eip.instanceId != '') {
                var confirmed = confirm("Address "+eip.address+" is already mapped to an instance, are you sure?");
                if (!confirmed)
                    return;
            }

            var instanceIds = this.getUnassociatedInstanceIds();

            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            var selected = {};
            var idx = ew_session.promptList("Associate Address with Instance", "Which Instance would you like to associate "+ eip.address +" with?", instanceIds);
            if (ix < 0) return;
            eip.instanceId = instanceIds[idx].split(":")[0];
        }

        var me = this;
        ew_session.controller.associateAddress(eip, eip.instanceid, function() { me.refresh() });
        return true;
    },

    disassociateAddress : function() {
        var eip = this.getSelected();
        if (eip == null) return;
        if (eip.instanceId == null || eip.instanceId == '') {
            alert("This EIP is not associated")
            return;
        }

        if (confirm("Disassociate "+eip.address+" and instance "+eip.instanceId+"?")) return;
        ew_session.controller.disassociateAddress(eip, function() { me.refresh() });
    },

    tag : function() {
        var eip = this.getSelected();
        if (eip == null) return;
        tagResource(eip, ew_session, "address");
        this.selectByAddress(eip.address);
    },

    copyToClipBoard : function(fieldName) {
        var eip = this.getSelected();
        if (eip == null) return;
        copyToClipboard(eip[fieldName]);
    },

    copyPublicDnsToClipBoard : function(fieldName) {
        var eip = this.getSelected();
        if (!eip || !eip.instanceId) { return; }

        var instance = ew_model.getInstanceById(eip.instanceId);
        if (instance) {
            copyToClipboard(instance.publicDnsName);
        }
    }

};

ew_ElasticIPTreeView.__proto__ = TreeView;
ew_ElasticIPTreeView.register();
