var ew_LoadbalancerTreeView = {
    COLNAMES : ['loadbalancer.LoadBalancerName','loadbalancer.CreatedTime','loadbalancer.DNSName','loadbalancer.Instances',
                'loadbalancer.Protocol','loadbalancer.LoadBalancerPort','loadbalancer.InstancePort',
                'loadbalancer.Interval','loadbalancer.Timeout','loadbalancer.HealthyThreshold','loadbalancer.UnhealthyThreshold',
                'loadbalancer.Target','loadbalancer.zones','loadbalancer.CookieName','loadbalancer.APolicyName',
                'loadbalancer.CookieExpirationPeriod','loadbalancer.CPolicyName',
                'loadbalancer.vpcId','loadbalancer.subnets','loadbalancer.groups'],
    model: ["loadBalancers", "azones", "instances" ],

    display: function(list)
    {
        TreeView.display.call(this, list);
        if (!list || !list.length) {
            ew_InstanceHealthTreeView.display([]);
        }
    },

    selectionChanged : function() {
        var elb = this.getSelected();
        if (!elb) return;
        if (elb.InstanceHealth) {
            ew_InstanceHealthTreeView.display(elb.InstanceHealth);
        } else {
            ew_session.controller.describeInstanceHealth(elb.LoadBalancerName, function(list) { ew_InstanceHealthTreeView.display(list); });
        }
    },

    deleteLoadBalancer : function(){
        var elb = this.getSelected();
        if (elb == null) return;
        if (!confirm("Delete Loadbalancer "+elb.LoadBalancerName+"?")) return;
        var me = this;
        ew_session.controller.deleteLoadBalancer(elb.LoadBalancerName, function () { me.refresh() });
    },

    viewDetails : function(){
        var elb = this.getSelected();
        if (elb == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_loadbalancer.xul", null, "chrome,centerscreen,modal,resizable", ew_session, elb);
    },

    create: function() {
        var retVal = {ok:null, vpc: ew_prefs.getCurrentTab(name).match("vpc") };
        window.openDialog("chrome://ew/content/dialogs/create_loadbalancer.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal);
        var me = this;
        if (retVal.ok) {
            ew_session.controller.createLoadBalancer(retVal.LoadBalancerName,retVal.Protocol,retVal.elbport,retVal.instanceport,retVal.Zone,retVal.subnetId,retVal.groups, function() {
                ew_session.controller.configureHealthCheck(retVal.LoadBalancerName,retVal.Target,retVal.Interval,retVal.Timeout,retVal.HealthyThreshold,retVal.UnhealthyThreshold, function() {
                    if (retVal.instances.length > 0) {
                        ew_session.controller.registerInstancesWithLoadBalancer(retVal.LoadBalancerName, retVal.instances, function() { me.refresh() });
                    } else {
                        me.refresh();
                    }
                });
            });
        }
     },

     ConfigureHealthCheck: function() {
        var elb = this.getSelected();
        if (elb == null) return;
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/configure_healthcheck.xul",null,"chrome,centerscreen,modal,resizable",elb,retVal);
        var me = this;
        if (retVal.ok) {
            ew_session.controller.configureHealthCheck(elb.LoadBalancerName,retVal.Target,retVal.Interval,retVal.Timeout,retVal.HealthyThreshold,retVal.UnhealthyThreshold,function() { me.refresh(); });
        }
    },

    registerinstances : function(){
        var elb = this.getSelected();
        if (elb == null) return;
        var instances = [];
        if (elb.vpcId) {
            instances = ew_model.getInstances('state', 'running', 'vpcId', elb.vpcId);
        } else {
            instances = ew_model.getInstances('state', 'running');
        }
        var list = ew_session.promptList('Register Instances', 'Select instances to register with this load balancer:', instances, null, null, true);
        if (!list || !list.length) return;
        var me = this;
        instances = []
        for (var i in list) {
            instances.push(list[i].id)
        }
        ew_session.controller.registerInstancesWithLoadBalancer(elb.LoadBalancerName, instances, function() { me.refresh() });
    },

    deregisterinstances : function(){
        var elb = this.getSelected();
        if (elb == null) return;
        var instances = [];
        for (var  i in elb.Instances) {
            instances.push(ew_model.getInstanceById(elb.Instances[i]))
        }
        var list = ew_session.promptList('Deregister Instances', 'Select instances to deregister with this load balancer:', instances, null, null, true);
        if (!list || !list.length) return;
        var me = this;
        instances = []
        for (var i in list) {
            instances.push(list[i].id)
        }
        ew_session.controller.deregisterInstancesWithLoadBalancer(elb.LoadBalancerName, instances, function() { me.refresh() });
    },

    manageZones : function(enable) {
        var elb = this.getSelected();
        if (elb == null) return;
        var zones = ew_model.getAvailabilityZones();
        var checked = [];
        if (enable) {
            for (var i in zones) {
                if (elb.zones.indexOf(zones[i].name) >= 0) {
                    checked.push(zones[i]);
                }
            }
        }
        var list = ew_session.promptList((enable ? "Enable" : "Disable") + 'Availability Zones', 'Select Zones to ' + (enable ? "enable" : "disable") + ' for this load balancer:', zones, null, null, true, checked);
        if (!list || !list.length) return;
        var zonelist = []
        for (var i in list) {
            zonelist.push(list[i].name);
        }
        var me = this;
        if (enable) {
            ew_session.controller.enableAvailabilityZonesForLoadBalancer(elb.LoadBalancerName, zonelist, function() { me.refresh() });
        } else {
            ew_session.controller.disableAvailabilityZonesForLoadBalancer(elb.LoadBalancerName, zonelist, function() { me.refresh() });
        }
    },

    copyToClipBoard : function(fieldName) {
        var elb = this.getSelected();
        if (elb == null) return;
        copyToClipboard(elb[fieldName]);
    },

    disablestickness :function(){
        var elb = this.getSelected();
        if (elb == null) return;
        if (!confirm("Disable stickiness for Load balancer " + elb.LoadBalancerName+"?")) return;
        var me = this;

        if (elb.APolicyName == "") {
            var policy = elb.CPolicyName;
            ew_session.controller.DeleteLoadBalancerPolicy(elb.LoadBalancerName,policy, function() { me.refresh(); });
        } else {
            var policy = elb.APolicyName;
            ew_session.controller.DeleteLoadBalancerPolicy(elb.LoadBalancerName,policy, function() { me.refresh(); });
        }
    },

    applicationsticknesss :function(){
        var elb = this.getSelected();
        if (elb == null) return;
        var loadbalancername = elb.LoadBalancerName;
        var cname = elb.CookieName;
        var policy = elb.APolicyName;
        if (cname){
            ew_session.controller.DeleteLoadBalancerPolicy(elb.LoadBalancerName,policy);
        }
        var CookieName = prompt("Please provide your application cookie name:");
        if (CookieName == null) return;
        CookieName = CookieName.trim();
        if (!CookieName) {
            alert('Invalid cookie name.');
            return;
        }
        var me = this;
        ew_session.controller.CreateAppCookieSP(loadbalancername,CookieName,function() { me.refresh() });
    },

    loadbalancerstickness :function(){
        var elb = this.getSelected();
        if (elb == null) return;
        var loadbalancername = elb.LoadBalancerName;
        var policy = elb.CPolicyName;
        var CookieExpirationPeriod = elb.CookieExpirationPeriod;
        if (CookieExpirationPeriod){
           ew_session.controller.DeleteLoadBalancerPolicy(elb.LoadBalancerName,policy);
        }
        var CookieExpirationPeriod = prompt("Please provide your Cookie Expiration Period:");
        if (CookieExpirationPeriod == null) return;
        CookieExpirationPeriod = CookieExpirationPeriod.trim();

        if (!/^[0-9]+$/.test(CookieExpirationPeriod)) {
            alert('Cookie expiration period must be long integer.');
            return;
        }
        var me = this;
        ew_session.controller.CreateLBCookieSP(loadbalancername,CookieExpirationPeriod, function() { me.refresh(); });
    },

    enableOrDisableItems : function(){
        var elb = this.getSelected();
        if (elb == null) return;
        document.getElementById("loadbalancer.tree.contextmenu").disabled = true;
        document.getElementById("loadbalancer.context.appstickness").disabled = !elb.CookieName ? true : false;
        document.getElementById("loadbalancer.context.lbstickness").disabled = !elb.CookieExpirationPeriod ? true : false;
        if (!elb.CookieName && !elb.CookieExpirationPeriod) {
            document.getElementById("loadbalancer.context.disablestickness").disabled = true;
            document.getElementById("loadbalancer.context.lbstickness").disabled = false;
            document.getElementById("loadbalancer.context.appstickness").disabled = false;
        } else {
            document.getElementById("loadbalancer.context.disablestickness").disabled = false;
        }
        document.getElementById("loadbalancer.context.instances").disabled = elb.Instances.length == 0 ? true : false;
        document.getElementById("loadbalancer.context.disablezones").disabled = elb.zones.length > 1 ? false : true;
        document.getElementById("loadbalancer.context.changegroups").disabled = elb.subnetId != '' ? true : false;
    },

    changeSecurityGroup: function() {
        var elb = this.getSelected();
        if (!elb) return;
        if (!elb.vpcId) {
            alert('Change of a security group is only for VPC.');
            return;
        }
        var groups = ec2ui_model.getSecurityGroupsByVpcId(elb.vpcId);
        var list = ew_session.promptList('Change Security Groups', 'Select security groups for load balancer:', groups, null, null, true);
        if (!list || !list.length) return;
        var me = this;
        groups = []
        for (var i in list) {
            groups.push(list[i].id)
        }
        var me = this;
        ew_session.controller.applySecurityGroupsToLoadBalancer(elb.LoadBalancerName, groups, function() { me.refresh();});
    },
};
ew_LoadbalancerTreeView.__proto__ = TreeView;
ew_LoadbalancerTreeView.register();

var ew_InstanceHealthTreeView = {
    COLNAMES : ['InstanceHealth.Description','InstanceHealth.State','InstanceHealth.InstanceId','InstanceHealth.ReasonCode'],
};
ew_InstanceHealthTreeView.__proto__ = TreeView;
