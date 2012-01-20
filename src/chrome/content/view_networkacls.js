var ec2ui_NetworkAclsTreeView = {
    COLNAMES : [ 'acl.id', 'acl.vpcId', 'acl.cidr' ],
    model : "networkAcls",

    display : function(list)
    {
        for (var i in list) {
            var vpc = ec2ui_model.getVpcById(list[i].vpcId)
            if (vpc) {
                list[i].cidr = vpc.cidr
            }
        }
        TreeView.display.call(this, list);
    },

    selectionChanged: function(event)
    {
        var acl = this.getSelected()
        if (acl == null) return

        for (var i in acl.associations) {
            var subnet = ec2ui_model.getSubnetById(acl.associations[i].subnetId)
            if (subnet) {
                acl.associations[i].cidr = subnet.cidr
            }
        }

        ec2ui_NetworkAclRulesTreeView.display(acl.rules);
        ec2ui_NetworkAclAssociationsTreeView.display(acl.associations);
    },

    viewDetails : function(event)
    {
        var group = this.getSelected();
        if (group == null) return;
        window.openDialog("chrome://ec2ui/content/dialog_acl_details.xul", null, "chrome,centerscreen,modal,resizable", group);
    },

    createACL : function()
    {
        var vpcs = ec2ui_session.model.getVpcs();
        if (!vpcs) {
            alert("No VPCs available, try later")
            return;
        }
        var rc = ec2ui_session.promptList("Create Network ACL", "Select VPC", vpcs);
        if (rc < 0) {
            return;
        }

        ec2ui_session.showBusyCursor(true);
        var me = this;
        ec2ui_session.controller.createNetworkAcl(vpcs[rc].id, function() { me.refresh(); });
        ec2ui_session.showBusyCursor(false);
    },

    deleteACL : function()
    {
        var acl = this.getSelected();
        if (!acl || !confirm("Delete Network ACL " + acl.id + "?")) return;
        var me = this;
        ec2ui_session.controller.deleteNetworkAcl(acl.id, function() { me.refresh(); });
    },

    associateACL : function()
    {
        var acl = this.getSelected();
        if (!acl) {
            alert("Please, select ACL");
            return;
        }
        var subnets = ec2ui_session.model.getSubnetsByVpcId(acl.vpcId);
        if (!subnets.length) {
            alert("No subnets available, try later")
            return;
        }
        var rc = ec2ui_session.promptList("Associate with VPC Subnet", "Select subnet", subnets, [ "id", "cidr" ]);
        if (rc < 0) {
            return;
        }
        var acls = ec2ui_model.getNetworkAclsByVpcId(acl.vpcId);
        for (var i in acls) {
            for (var j in acls[i].associations) {
                if (acls[i].associations[j].subnetId == subnets[rc].id) {
                    assocId = acls[i].associations[j].id
                }
            }
        }
        if (typeof assocId == "undefined") {
            alert("Could not find existing Subnet association");
            return
        }
        ec2ui_session.controller.ReplaceNetworkAclAssociation(assocId, acl.id, function() { ec2ui_NetworkAclsTreeView.refresh() });
    },
};
ec2ui_NetworkAclsTreeView.__proto__ = TreeView;
ec2ui_NetworkAclsTreeView.register();

var ec2ui_NetworkAclAssociationsTreeView = {
   COLNAMES : [ "assoc.id", "assoc.subnetId", "assoc.cidr" ],

};
ec2ui_NetworkAclAssociationsTreeView.__proto__ = TreeView;

var ec2ui_NetworkAclRulesTreeView = {
    COLNAMES : [ "rule.num", "rule.proto", "rule.action", "rule.egress", "rule.cidr", "rule.ports", "rule.icmp" ],

    createRule : function()
    {
        var acl = ec2ui_NetworkAclsTreeView.getSelected();
        if (!acl) {
            alert("Please, select ACL");
            return;
        }
        var retVal = {ok:null};
        window.openDialog("chrome://ec2ui/content/dialog_create_networkaclentry.xul", null, "chrome,centerscreen,modal,resizable", acl, ec2ui_session, retVal);
        if (retVal.ok) {
            debug(JSON.stringify(retVal))
            ec2ui_session.controller.createNetworkAclEntry(acl.id, retVal.num, retVal.proto, retVal.action, retVal.egress, retVal.cidr, retVal.var1, retVal.var2, function() { ec2ui_NetworkAclsTreeView.refresh() });
        }
    },

    deleteRule : function()
    {
        var item = this.getSelected();
        if (!item || !confirm("Delete ACL rule " + item.num + "?")) return;
        var acl = ec2ui_NetworkAclsTreeView.getSelected();
        ec2ui_session.controller.deleteNetworkAclEntry(acl.id, item.num, item.egress, function() { ec2ui_NetworkAclsTreeView.refresh() });
    }

};
ec2ui_NetworkAclRulesTreeView.__proto__ = TreeView;

