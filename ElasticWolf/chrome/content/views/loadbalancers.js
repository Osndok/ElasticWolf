var ew_LoadbalancerTreeView = {
    COLNAMES : ['loadbalancer.LoadBalancerName','loadbalancer.CreatedTime','loadbalancer.DNSName','loadbalancer.InstanceId',
                'loadbalancer.Protocol','loadbalancer.LoadBalancerPort','loadbalancer.InstancePort',
                'loadbalancer.Interval','loadbalancer.Timeout','loadbalancer.HealthyThreshold','loadbalancer.UnhealthyThreshold',
                'loadbalancer.Target','loadbalancer.zone','loadbalancer.CookieName','loadbalancer.APolicyName',
                'loadbalancer.CookieExpirationPeriod','loadbalancer.CPolicyName'],
    model: "loadBalancers",

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
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        if (!confirm("Delete Loadbalancer "+loadbalancer.LoadBalancerName+"?")) return;
        var me = this;
        ew_session.controller.deleteLoadBalancer(loadbalancer.LoadBalancerName, function () { me.refresh() });
    },

    viewDetails : function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        window.openDialog("chrome://ew/content/dialogs/details_loadbalancer.xul", null, "chrome,centerscreen,modal,resizable", loadbalancer);
    },

    create: function() {
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/create_loadbalancer.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal,null);
        var me = this;
        if (retVal.ok) {
            var Zone = retVal.placement;
            ew_session.controller.CreateLoadBalancer(retVal.LoadBalancerName,retVal.Protocol,retVal.elbport,retVal.instanceport,Zone);
            ew_session.controller.ConfigureHealthCheck(retVal.LoadBalancerName,retVal.pingprotocol,retVal.pingport,retVal.pingpath,retVal.Interval,retVal.Timeout,retVal.HealthyThreshold,retVal.UnhealthyThreshold);
            var Instancechk = retVal.Instances;
            var newStr = Instancechk.substring(",", Instancechk.length-1);
            var instanceid = new String(newStr);
            var RegInstance = new Array();
            RegInstance = instanceid.split(",");
            for(var a=0;a<RegInstance.length;a++) {
                ew_session.controller.RegisterInstancesWithLoadBalancer(retVal.LoadBalancerName,RegInstance[a]);
            }
            me.refresh();
        }
     },

     ConfigureHealthCheck: function() {
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/configure_healthcheck.xul",null,"chrome,centerscreen,modal,resizable",loadbalancer,ew_session,retVal);
        var me = this;
        if (retVal.ok) {
            ew_session.controller.EditHealthCheck(loadbalancer.LoadBalancerName,retVal.Target,retVal.Interval,retVal.Timeout,retVal.HealthyThreshold,retVal.UnhealthyThreshold,function() { me.refresh(); });
        }
    },

    registerinstances : function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var retVal = {ok:null};
         window.openDialog("chrome://ew/content/dialogs/register_lbinstances.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal,loadbalancer);
        var me = this;
        if (retVal.ok) {
            var Instancechk = retVal.Instances;
            var newStr = Instancechk.substring(",", Instancechk.length-1);
            var instanceid = new String(newStr);
            var RegInstance = new Array();
            RegInstance = instanceid.split(",");
            for(var a=0;a<RegInstance.length;a++) {
                ew_session.controller.RegisterInstancesWithLoadBalancer(retVal.LoadBalancerName,RegInstance[a]);
            }
            me.refresh();
        }
    },

    deregisterinstances : function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var retVal = {ok:null};
         window.openDialog("chrome://ew/content/dialogs/deregister_lbinstances.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal,loadbalancer);
        var me = this;
        if (retVal.ok) {
            var Instancechk = retVal.Instances;
            var newStr = Instancechk.substring(",", Instancechk.length-1);
            var instanceid = new String(newStr);
            var RegInstance = new Array();
            RegInstance = instanceid.split(",");
            for(var a=0;a<RegInstance.length;a++) {
                ew_session.controller.DeregisterInstancesWithLoadBalancer(retVal.LoadBalancerName,RegInstance[a]);
            }
            me.refresh();
        }
    },

    enableazone : function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/enable_lbazone.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal,loadbalancer);
        var me = this;
        if (retVal.ok) {
            var Zonechk = retVal.Zone;
            var newStr = Zonechk.substring(",", Zonechk.length-1);
            var zones = new String(newStr);
            var Zone = new Array();
            Zone = zones.split(",");
            for(var a=0;a<Zone.length;a++) {
            ew_session.controller.Enableazonewithloadbalancer(retVal.LoadBalancerName,Zone[a]);
            }
            me.refresh();
        }
    },

    disableazone : function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/disable_lbazone.xul",null,"chrome,centerscreen,modal,resizable",ew_session,retVal,loadbalancer);
         var me = this;
        if (retVal.ok) {
            var Zonechk = retVal.Zone;
            var newStr = Zonechk.substring(",", Zonechk.length-1);
            var zones = new String(newStr);
            var Zone = new Array();
            Zone = zones.split(",");
            for(var a=0;a<Zone.length;a++) {
                ew_session.controller.Disableazonewithloadbalancer(retVal.LoadBalancerName,Zone[a]);
            }
            me.refresh();
        }
    },

    copyToClipBoard : function(fieldName) {
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) {
            return;
        }
        copyToClipboard(loadbalancer[fieldName]);
    },

    disablestickness :function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        if (!confirm("Delete Load balancer" + loadbalancer.LoadBalancerName+"?")) return;
        var me = this;

        if (loadbalancer.APolicyName == ""){
            var policy =  loadbalancer.CPolicyName;
            ew_session.controller.DeleteLoadBalancerPolicy(loadbalancer.LoadBalancerName,policy, function() { me.refresh(); });
        } else {
            var policy = loadbalancer.APolicyName;
            ew_session.controller.DeleteLoadBalancerPolicy(loadbalancer.LoadBalancerName,policy, function() { me.refresh(); });
        }
    },

    applicationsticknesss :function(){
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var loadbalancername = loadbalancer.LoadBalancerName;
        var cname = loadbalancer.CookieName;
        var policy = loadbalancer.APolicyName;
        if (cname){
            ew_session.controller.DeleteLoadBalancerPolicy(loadbalancer.LoadBalancerName,policy);
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
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var loadbalancername = loadbalancer.LoadBalancerName;
        var policy = loadbalancer.CPolicyName;
        var CookieExpirationPeriod = loadbalancer.CookieExpirationPeriod;
        if (CookieExpirationPeriod){
           ew_session.controller.DeleteLoadBalancerPolicy(loadbalancer.LoadBalancerName,policy);
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
        var loadbalancer = this.getSelected();
        if (loadbalancer == null) return;
        var stickness = loadbalancer.CookieExpirationPeriod;
        var astickness = loadbalancer.CookieName;
        var instances = loadbalancer.InstanceId;
        var zones = loadbalancer.zone;
        var disableazones = new Array();
        var Rzone = new String(zones);
        var zoneArray = new Array();
        zoneArray = Rzone.split(",");

        var index =  this.selection.currentIndex;
        document.getElementById("loadbalancer.tree.contextmenu").disabled = true;
        document.getElementById("loadbalancer.context.appstickness").disabled = !astickness ? true : false;
        document.getElementById("loadbalancer.context.lbstickness").disabled = !stickness ? true : false;
        if (!stickness && !astickness) {
            document.getElementById("loadbalancer.context.disablestickness").disabled = true;
            document.getElementById("loadbalancer.context.lbstickness").disabled = false;
            document.getElementById("loadbalancer.context.appstickness").disabled = false;
        } else {
            document.getElementById("loadbalancer.context.disablestickness").disabled = false;
        }
        document.getElementById("loadbalancer.context.instances").disabled = instances == "" ? true : false;
        document.getElementById("loadbalancer.context.zones").disabled = zoneArray.length == 1 ? true : false;
    },
};
ew_LoadbalancerTreeView.__proto__ = TreeView;
ew_LoadbalancerTreeView.register();

var ew_InstanceHealthTreeView = {
    COLNAMES : ['InstanceHealth.Description','InstanceHealth.State','InstanceHealth.InstanceId','InstanceHealth.ReasonCode'],
};
ew_InstanceHealthTreeView.__proto__ = TreeView;
