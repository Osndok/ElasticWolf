var ew_NetworkAclsTreeView = {
    COLNAMES : [ 'acl.id', 'acl.vpcId', 'acl.cidr' ],
    model : [ "networkAcls", "subnets", "vpcs" ],

    display : function(list)
    {
        for (var i in list) {
            var vpc = ew_model.getVpcById(list[i].vpcId)
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
            var subnet = ew_model.getSubnetById(acl.associations[i].subnetId)
            if (subnet) {
                acl.associations[i].cidr = subnet.toString()
            }
        }

        ew_NetworkAclRulesTreeView.display(acl.rules);
        ew_NetworkAclAssociationsTreeView.display(acl.associations);
    },

    viewDetails : function(event)
    {
        var group = this.getSelected();
        if (group == null) return;
        window.openDialog("chrome://ew/content/dialog_acl_details.xul", null, "chrome,centerscreen,modal,resizable", group);
    },

    createACL : function()
    {
        var vpcs = ew_session.model.getVpcs();
        if (!vpcs) {
            alert("No VPCs available, try later")
            return;
        }
        var rc = ew_session.promptList("Create Network ACL", "Select VPC", vpcs, ['id', 'cidr' ]);
        if (rc < 0) {
            return;
        }

        
        var me = this;
        ew_session.controller.createNetworkAcl(vpcs[rc].id, function() { me.refresh(); });
        
    },

    deleteACL : function()
    {
        var acl = this.getSelected();
        if (!acl || !confirm("Delete Network ACL " + acl.id + "?")) return;
        var me = this;
        ew_session.controller.deleteNetworkAcl(acl.id, function() { me.refresh(); });
    },

    associateACL : function()
    {
        var acl = this.getSelected();
        if (!acl) {
            alert("Please, select ACL");
            return;
        }
        var subnets = ew_session.model.getSubnetsByVpcId(acl.vpcId);
        if (!subnets.length) {
            alert("No subnets available, try later")
            return;
        }
        var rc = ew_session.promptList("Associate with VPC Subnet", "Select subnet", subnets, [ "id", "cidr" ]);
        if (rc < 0) {
            return;
        }
        var assocId = ew_model.getNetworkAclAssociation(subnets[rc].id);
        if (!assocId) {
            alert("Could not find existing Subnet association");
            return
        }
        ew_session.controller.ReplaceNetworkAclAssociation(assocId, acl.id, function() { ew_NetworkAclsTreeView.refresh() });
    },
};
ew_NetworkAclsTreeView.__proto__ = TreeView;
ew_NetworkAclsTreeView.register();

var ew_NetworkAclAssociationsTreeView = {
   COLNAMES : [ "assoc.id", "assoc.subnetId", "assoc.cidr" ],

};
ew_NetworkAclAssociationsTreeView.__proto__ = TreeView;

var ew_NetworkAclRulesTreeView = {
    COLNAMES : [ "rule.num", "rule.proto", "rule.action", "rule.egress", "rule.cidr", "rule.ports", "rule.icmp" ],

    createRule : function()
    {
        var acl = ew_NetworkAclsTreeView.getSelected();
        if (!acl) {
            alert("Please, select ACL");
            return;
        }
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialog_create_networkaclentry.xul", null, "chrome,centerscreen,modal,resizable", acl, ew_session, retVal);
        if (retVal.ok) {
            debug(JSON.stringify(retVal))
            ew_session.controller.createNetworkAclEntry(acl.id, retVal.num, retVal.proto, retVal.action, retVal.egress, retVal.cidr, retVal.var1, retVal.var2, function() { ew_NetworkAclsTreeView.refresh() });
        }
    },

    deleteRule : function()
    {
        var item = this.getSelected();
        if (!item || !confirm("Delete ACL rule " + item.num + "?")) return;
        var acl = ew_NetworkAclsTreeView.getSelected();
        ew_session.controller.deleteNetworkAclEntry(acl.id, item.num, item.egress, function() { ew_NetworkAclsTreeView.refresh() });
    }

};
ew_NetworkAclRulesTreeView.__proto__ = TreeView;

