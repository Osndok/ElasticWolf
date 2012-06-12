var ew_menu = {
    // Order of te tabs should match order of tabpanels
    tabs: [
            { tab: "ew.tabs.prefs",         views: [ { view: ew_PrefsView } ] },

            { tab: "ew.tabs.credential",    views: [ { id: "ew.credentials.view", view: ew_CredentialsTreeView } ] },

            { tab: "ew.tabs.endpoint",      views: [ { id: "ew.endpoints.view", view: ew_EndpointsTreeView } ] },

            { tab: "ew.tabs.policy",        views: [ { view: ew_PasswordPolicyView } ] },

            { tab: "ew.tabs.vmfa",          views: [ { id: "ew.vmfa.view", view: ew_VMFATreeView } ] },

            { tab: "ew.tabs.password",      call: ew_UsersTreeView.changePassword },

            { tab: "ew.tabs.instance",      views: [ { id: "ew.instances.view", view: ew_InstancesTreeView, filterList: [ { name: "vpcId", empty: true }] } ], },

            { tab: "ew.tabs.vpcinstance",   views: [ { id: "ew.instances.view", view: ew_InstancesTreeView, filterList: [ { name: "vpcId", empty: false }] } ],
              owner: "ew.tabs.instance"  },

            { tab: "ew.tabs.image",         views: [ { id: "ew.images.view", view: ew_AMIsTreeView } ], },

            { tab: "ew.tabs.access",        views: [ { id: "ew.accesskeys.view", view: ew_AccessKeyTreeView },
                                                     { id: "ew.certs.view", view: ew_CertsTreeView } ], },

            { tab: "ew.tabs.keypair",       views: [ { id: "ew.keypairs.view", view: ew_KeypairTreeView, } ] },

            { tab: "ew.tabs.users",         views: [ { id: "ew.users.view", view: ew_UsersTreeView, }, ] },

            { tab: "ew.tabs.groups",        views: [ { id: "ew.groups.view", view: ew_GroupsTreeView, },
                                                     { id: "ew.groupUsers.view", view: ew_GroupUsersTreeView, }, ] },

            { tab: "ew.tabs.securitygroup", views: [ { id: "ew.securitygroups.view", view: ew_SecurityGroupsTreeView, filterList: [ { name: "vpcId", empty: true }] },
                                                     { id: "ew.permissions.view", view: ew_PermissionsTreeView }], },

            { tab: "ew.tabs.vpcgroup",      views: [ { id: "ew.securitygroups.view", view: ew_SecurityGroupsTreeView, filterList: [ { name: "vpcId", empty: false }] },
                                                     { id: "ew.permissions.view", view: ew_PermissionsTreeView }],
              owner: "ew.tabs.securitygroup"
            },

            { tab: "ew.tabs.eip",           views: [ { id: "ew.eip.view", view: ew_ElasticIPTreeView, filterList: [ { name: "domain", value: "standard" }] }], },

            { tab: "ew.tabs.vpceip",        views: [ { id: "ew.eip.view", view: ew_ElasticIPTreeView, filterList: [ { name: "domain", value: "vpc" }] }],
              owner: "ew.tabs.eip"
            },

            { tab: "ew.tabs.volume",        views: [ { id: "ew.volumes.view", view: ew_VolumeTreeView }], },

            { tab: "ew.tabs.snapshot",      views: [ { id: "ew.snapshots.view", view: ew_SnapshotTreeView }], },

            { tab: "ew.tabs.loadbalancer",  views: [ { id: "ew.loadbalancer.view", view: ew_LoadbalancerTreeView, filterList: [ { name: "vpcId", empty: true }] },
                                                     { id: "ew.instancehealth.view", view: ew_InstanceHealthTreeView }], },

            { tab: "ew.tabs.vpcelb",        views: [ { id: "ew.loadbalancer.view", view: ew_LoadbalancerTreeView, filterList: [ { name: "vpcId", empty: false }] },
                                                     { id: "ew.instancehealth.view", view: ew_InstanceHealthTreeView }],
              owner: "ew.tabs.loadbalancer"
            },

            { tab: "ew.tabs.bundletask",    views: [ { id: "ew.bundleTasks.view", view: ew_BundleTasksTreeView } ], },

            { tab: "ew.tabs.lease",         views: [ { id: "ew.offerings.view", view: ew_LeaseOfferingsTreeView },
                                                     { id: "ew.rsvdInst.view", view: ew_ReservedInstancesTreeView } ], },

            { tab: "ew.tabs.vpc",           views: [ { id: "ew.vpcs.view", view: ew_VpcTreeView }, ] },

            { tab: "ew.tabs.dhcp",          views: [ { id: "ew.dhcpOptions.view", view: ew_DhcpoptsTreeView } ], },

            { tab: "ew.tabs.lease",         views: [ { id: "ew.offerings.view", view: ew_LeaseOfferingsTreeView },
                                                     { id: "ew.reservedInstances.view", view: ew_ReservedInstancesTreeView } ], },

            { tab: "ew.tabs.subnet",        views: [ { id: "ew.subnets.view", view: ew_SubnetsTreeView },
                                                     { id: "ew.subnetroutes.view", view: ew_SubnetRoutesTreeView },
                                                     { id: "ew.subnetacls.view", view: ew_SubnetAclRulesTreeView } ], },

            { tab: "ew.tabs.routing",       views: [ { id: "ew.routetables.view", view: ew_RouteTablesTreeView },
                                                     { id: "ew.routes.view", view: ew_RoutesTreeView },
                                                     { id: "ew.route.associations.view", view: ew_RouteAssociationsTreeView }, ], },

            { tab: "ew.tabs.igw",           views: [ { id: "ew.internetgateways.view", view : ew_InternetGatewayTreeView } ], },

            { tab: "ew.tabs.acl",           views: [ { id: "ew.acls.view", view: ew_NetworkAclsTreeView } ,
                                                     { id: "ew.acls.associations.view", view: ew_NetworkAclAssociationsTreeView },
                                                     { id: "ew.acls.rules.view", view: ew_NetworkAclRulesTreeView }], },

            { tab: "ew.tabs.eni",           views: [ { id: "ew.enis.view", view: ew_NetworkInterfacesTreeView },] },

            { tab: "ew.tabs.vgw",           views: [ { id: "ew.vpngateways.view", view: ew_VpnGatewayTreeView },
                                                     { id: "ew.vpnattachments.view", view: ew_VpnAttachmentTreeView } ], },

            { tab: "ew.tabs.vpn",           views: [ { id: "ew.vpnconnections.view", view: ew_VpnConnectionTreeView } ] },

            { tab: "ew.tabs.cgw",           views: [ { id: "ew.customergateways.view", view: ew_CustomerGatewayTreeView },] },

            { tab: "ew.tabs.availzone",     views: [ { id: "ew.azones.view", view: ew_AvailZoneTreeView }], },

            { tab: "ew.tabs.s3",            views: [ { id: "ew.s3.view", view: ew_S3BucketsTreeView }], },

            { tab: "ew.tabs.alarm",         views: [ { id: "ew.alarms.view", view: ew_AlarmsTreeView }], },
    ],

    init: function() {
        this.tree = $('ew.menu')
        for (var i in this.tabs) {
            // Because owner refers to the real panel need to skip it
            if (this.tabs[i].owner) continue;
            for (var v in this.tabs[i].views) {
                var tree = $(this.tabs[i].views[v].id);
                if (tree) {
                    this.tabs[i].views[v].view.init(tree, this.tabs[i]);
                }
            }
        }
    },

    get: function(name) {
        for (var i in this.tabs) {
            if (this.tabs[i].tab == name) return this.tabs[i];
        }
        return null;
    },

    getCurrent: function() {
        return this.get(this.current);
    },

    select: function(name)
    {
        var tab = this.get(name);
        if (!tab) return false;

        // Deactivate current tab
        var curtab = this.getCurrent();
        if (curtab) {
            for (var i in curtab.views) {
                curtab.views[i].view.deactivate();
            }
        }

        // Activate new tab
        var idx = this.getMenu(name);
        if (idx == -1) {
            debug('menu not found ' + name)
            return false;
        }
        this.tree.currentIndex = idx;
        this.tree.view.selection.select(idx);
        this.current = name;
        $("ew.tabs").selectedPanel = $(tab.owner || name);

        // Activate and refresh if no records yet
        for (var i in tab.views) {
            log('activate ' + tab.views[i].id + ", rows=" + tab.views[i].view.rowCount)
            tab.views[i].view.activate();
            // Assign new filter list and refresh contents
            tab.views[i].view.filterList = tab.views[i].filterList;
            if (tab.views[i].view.rowCount == 0) {
                tab.views[i].view.refresh();
            } else {
                tab.views[i].view.invalidate();
            }
        }
        // Non view tabs cannot be selected
        if (tab.call) {
            tab.call();
            return false;
        }
        return true;
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

    getSelected: function()
    {
        return this.tree.currentIndex >= 0 ? this.get(this.tree.view.getCellValue(this.tree.currentIndex, this.tree.columns.getFirstColumn())) : null;
    },

    getMenu: function(id)
    {
        for (var i = 0; i < this.tree.view.rowCount; i++) {
            var val = this.tree.view.getCellValue(i, this.tree.columns.getFirstColumn());
            if (val == id) return i;
        }
        return -1;
    },

    selectionChanged: function()
    {
        var id = this.tree.view.getCellValue(this.tree.currentIndex, this.tree.columns.getFirstColumn());
        switch (id) {
        case "":
            this.tree.view.toggleOpenState(this.tree.currentIndex);
            break;

        default:
            ew_session.selectTab(id);
        }
    },

    update: function() {
        var idx = this.getMenu("ew.tabs.credential")
        if (idx > 0) {
            var cred = ew_session.getActiveCredentials();
            this.tree.view.setCellText(idx, this.tree.columns.getFirstColumn(), cred ? 'Account: ' + cred.name : "Manage Credentials");
        }
        idx = this.getMenu("ew.tabs.endpoint")
        if (idx > 0) {
            var endpoint = ew_session.getActiveEndpoint();
            this.tree.view.setCellText(idx, this.tree.columns.getFirstColumn(), endpoint ? 'Endpoint: ' + endpoint.name : "Manage Endpoints");
        }
    },

};

