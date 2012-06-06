var ew_toolbar = {
    // Order of te tabs should match order of tabpanels
    tabs: [
            { tab: "ew.tabs.prefs",         views: [ { view: ew_PrefsView } ] },

            { tab: "ew.tabs.credential",    views: [ { id: "ew.credentials.view", view: ew_CredentialsTreeView } ] },

            { tab: "ew.tabs.endpoint",      views: [ { id: "ew.endpoints.view", view: ew_EndpointsTreeView } ] },

            { tab: "ew.tabs.instance",      views: [ { id: "ew.instances.view", view: ew_InstancesTreeView, filterList: [ { name: "vpcId", empty: true }] } ], },

            { tab: "ew.tabs.vpcinstance",   views: [ { id: "ew.instances.view", view: ew_InstancesTreeView, filterList: [ { name: "vpcId", empty: false }] } ],
              id: "ew.tabs.instance"  },

            { tab: "ew.tabs.image",         views: [ { id: "ew.images.view", view: ew_AMIsTreeView } ], },

            { tab: "ew.tabs.access",        views: [ { id: "ew.accesskeys.view", view: ew_AccessKeyTreeView },
                                                     { id: "ew.certs.view", view: ew_CertTreeView } ], },

            { tab: "ew.tabs.keypair",       views: [ { id: "ew.keypairs.view", view: ew_KeypairTreeView, } ] },

            { tab: "ew.tabs.securitygroup", views: [ { id: "ew.securitygroups.view", view: ew_SecurityGroupsTreeView, filterList: [ { name: "vpcId", empty: true }] },
                                                     { id: "ew.permissions.view", view: ew_PermissionsTreeView }], },

            { tab: "ew.tabs.vpcgroup",      views: [ { id: "ew.securitygroups.view", view: ew_SecurityGroupsTreeView, filterList: [ { name: "vpcId", empty: false }] },
                                                     { id: "ew.permissions.view", view: ew_PermissionsTreeView }],
              id: "ew.tabs.securitygroup"
            },

            { tab: "ew.tabs.eip",           views: [ { id: "ew.eip.view", view: ew_ElasticIPTreeView, filterList: [ { name: "domain", value: "standard" }] }], },

            { tab: "ew.tabs.vpceip",        views: [ { id: "ew.eip.view", view: ew_ElasticIPTreeView, filterList: [ { name: "domain", value: "vpc" }] }],
              id: "ew.tabs.eip"
            },

            { tab: "ew.tabs.volume",        views: [ { id: "ew.volumes.view", view: ew_VolumeTreeView }], },

            { tab: "ew.tabs.snapshot",      views: [ { id: "ew.snapshots.view", view: ew_SnapshotTreeView }], },

            { tab: "ew.tabs.loadbalancer",  views: [ { id: "ew.loadbalancer.view", view: ew_LoadbalancerTreeView, filterList: [ { name: "vpcId", empty: true }] },
                                                     { id: "ew.instancehealth.view", view: ew_InstanceHealthTreeView }], },

            { tab: "ew.tabs.vpcelb",        views: [ { id: "ew.loadbalancer.view", view: ew_LoadbalancerTreeView, filterList: [ { name: "vpcId", empty: false }] },
                                                     { id: "ew.instancehealth.view", view: ew_InstanceHealthTreeView }],
              id: "ew.tabs.loadbalancer"
            },

            { tab: "ew.tabs.bundletask",    views: [ { id: "ew.bundleTasks.view", view: ew_BundleTasksTreeView } ], },

            { tab: "ew.tabs.lease",         views: [ { id: "ew.offerings.view", view: ew_LeaseOfferingsTreeView },
                                                     { id: "ew.rsvdInst.view", view: ew_ReservedInstancesTreeView } ], },

            { tab: "ew.tabs.vpc",           views: [ { id: "ew.vpcs.view", view: ew_VpcTreeView },
                                                     { id: "ew.dhcpoptions.view", view: ew_DhcpoptsTreeView } ], },

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
    ],

    init: function() {
        for (var i in this.tabs) {
            for (var v in this.tabs[i].views) {
                var tree = $(this.tabs[i].views[v].id);
                if (tree) {
                    var view = this.tabs[i].views[v].view;
                    tree.view = view;
                    // Assign tab name
                    view.tab = this.tabs[i].tab;
                    // Wrapping handlers to preserve correct context for 'this'
                    if (!this.tabs[i].id) {
                        (function(v) { var me = v; tree.addEventListener('dblclick', function(e) { e.stopPropagation();me.viewDetails(e); }, false); }(view));
                        (function(v) { var me = v; tree.addEventListener('select', function(e) { e.stopPropagation();me.selectionChanged(e); }, false); }(view));
                        (function(v) { var me = v; tree.addEventListener('click', function(e) { e.stopPropagation();me.clicked(e); }, false); }(view));
                    }
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

    select: function(id)
    {
        var tree = $('ew.toolbar');
        for (var i = 0; i < tree.view.rowCount; i++) {
            var val = tree.view.getCellValue(i, tree.columns.getFirstColumn());
            if (val == id) {
                tree.currentIndex = i;
                tree.view.selection.select(i);
                this.current = id;
                debug('toolbar selected ' + id)
                break;
            }
        }
    },

    getCurrent: function() {
        return this.get(this.current);
    },

    getSelected: function()
    {
        var tree = $('ew.toolbar');
        return tree.currentIndex >= 0 ? this.get(tree.view.getCellValue(tree.currentIndex, tree.columns.getFirstColumn())) : null;
    },

    selectionChanged: function()
    {
        var tree = $('ew.toolbar');
        var id = tree.view.getCellValue(tree.currentIndex, tree.columns.getFirstColumn());

        switch (id) {
        case "":
            tree.view.toggleOpenState(tree.currentIndex);
            break;

        default:
            ew_session.selectTab(id);
        }
    },

    update: function() {
        var tree = $('ew.toolbar')
        var cred = ew_session.getActiveCredentials();
        tree.view.setCellText(3, tree.columns.getFirstColumn(), cred ? 'Account: ' + cred.name : "Manage Credentials");

        var endpoint = ew_session.getActiveEndpoint();
        tree.view.setCellText(4, tree.columns.getFirstColumn(), endpoint ? 'Endpoint: ' + endpoint.name : "Manage Endpoints");
    },

};
