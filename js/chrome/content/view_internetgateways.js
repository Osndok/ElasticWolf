var ec2ui_InternetGatewayTreeView = {
        COLNAMES : ['igw.id',"igw.vpcs", "igw.tags"],
        model: "internetGateways",

        createInternetGateway : function () {
            var me = this;
            var wrap = function(id) {
                me.refresh()
            }
            ec2ui_session.controller.createInternetGateway(wrap);
        },

        deleteInternetGateway  : function () {
            var igw = this.getSelected();
            if (igw == null) return;
            if (!ec2ui_session.promptYesNo("Delete Internet Gateway "+igw.id+"?")) return;

            var me = this;
            var wrap = function() {
                me.refresh();
            }
            ec2ui_session.controller.deleteInternetGateway(igw.id, wrap);
        },

        attachInternetGateway: function(vpcid, igwid) {
            var igw = this.getSelected()
            if (!igwid) igwid = igw ? igw.id : null
            var retVal = { ok : null, igwnew: 0, igwid : igwid, vpcid : vpcid }
            window.openDialog("chrome://ec2ui/content/dialog_attach_internet_gateway.xul", null, "chrome,centerscreen,modal,resizable", ec2ui_session, retVal);
            if (retVal.ok) {
                ec2ui_session.showBusyCursor(true);
                var me = this;
                var wrap = function(id)
                {
                    me.refresh();
                }
                if (retVal.igwnew) {
                    var wrap2 = function(id) {
                        ec2ui_session.controller.attachInternetGateway(id, retVal.vpcid, wrap);
                    }
                    ec2ui_session.controller.createInternetGateway(wrap2);
                } else {
                    ec2ui_session.controller.attachInternetGateway(retVal.igwid, retVal.vpcid, wrap);
                }
                ec2ui_session.showBusyCursor(false);
            }
        },

        detachInternetGateway: function() {
            var igw = this.getSelected();
            if (igw == null) return;
            if (!ec2ui_session.promptYesNo("Detach Internet Gateway "+igw.id+" from " + igw.vpcs + "?")) return;
            var me = this;
            var wrap = function(id)
            {
                me.refresh();
            }
            for (var i = 0; i < igw.vpcs.length; i++) {
                ec2ui_session.controller.detachInternetGateway(igw.id, igw.vpcs[i], wrap);
            }
            ec2ui_session.showBusyCursor(false);
        }

};
ec2ui_InternetGatewayTreeView.__proto__ = TreeView;
ec2ui_InternetGatewayTreeView.register();
