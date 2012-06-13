var ew_PrefsView = {
   rowCount: 0,

   refresh: function() {
       this.rowCount++;
       $("ew.version").value = ew_session.VERSION;
       $("ew.ec2_version").value = ew_session.EC2_API_VERSION;
       $("ew.iam_version").value = ew_session.IAM_API_VERSION;
       $("ew.elb_version").value = ew_session.ELB_API_VERSION;
       $("ew.cw_version").value = ew_session.CW_API_VERSION;
       $("ew.home").value = ew_session.getHome();
       $("ew.profile").value = ew_session.getProfileHome();
       $("ew.key.home").value = ew_session.getKeyHome();
       $("ew.ssh.command").value = ew_session.getSSHCommand();
       $("ew.ssh.args").value = ew_session.getSSHArgs();
       $("ew.ssh.user").value = ew_session.getSSHUser();
       $("ew.rdp.command").value = ew_session.getRDPCommand();
       $("ew.rdp.args").value = ew_session.getRDPArgs();
       $("ew.openssl.command").value = ew_session.getOpenSSLCommand();
       $("ew.shell.command").value = ew_session.getShellCommand();
       this.getPrefs("ew.pin");
       this.getPrefs('ew.path.java', ew_session.getDefaultJavaHome());
       this.getPrefs('ew.path.ec2');
       this.getPrefs('ew.path.iam');
       this.getPrefs('ew.path.ami');
       this.getPrefs('ew.path.autoscaling');
       this.getPrefs('ew.path.cloudwatch');
       this.getPrefs("ew.debug.enabled");
       this.getPrefs("ew.http.enabled", true);
       this.getPrefs("ew.idle.timeout");
       this.getPrefs("ew.idle.action");
       this.getPrefs("ew.accesskey.save")
       this.getPrefs("ew.http.timeout", 15000);
       // Optional debugging support
       $('ew.venkman').hidden = typeof start_venkman != 'function';
   },

   deactivate: function() {
       if (!this.rowCount) return;
       ew_session.setKeyHome($("ew.key.home").value.toString());
       ew_session.setSSHCommand($("ew.ssh.command").value.toString());
       ew_session.setSSHArgs($("ew.ssh.args").value.toString());
       ew_session.setSSHUser($("ew.ssh.user").value.toString());
       ew_session.setRDPCommand($("ew.rdp.command").value.toString());
       ew_session.setRDPArgs($("ew.rdp.args").value.toString());
       ew_session.setOpenSSLCommand($("ew.openssl.command").value.toString());
       ew_session.setShellCommand($("ew.shell.command").value.toString());
       this.setPrefs("ew.pin");
       this.setPrefs('ew.path.java', ew_session.getDefaultJavaHome());
       this.setPrefs('ew.path.ec2');
       this.setPrefs('ew.path.iam');
       this.setPrefs('ew.path.ami');
       this.setPrefs('ew.path.autoscaling');
       this.setPrefs('ew.path.cloudwatch');
       this.setPrefs("ew.debug.enabled");
       this.setPrefs("ew.http.enabled");
       this.setPrefs("ew.idle.timeout");
       this.setPrefs("ew.accesskey.save")
       this.setPrefs("ew.idle.action");
       this.setPrefs("ew.http.timeout", 5000, 3600000);

       ew_session.setIdleTimer();
       this.rowCount = 0;
   },

   activate: function() {
       this.refresh();
   },

   display: function() {
   },

   invalidate: function() {
   },

   resetAll: function() {
       var items = document.getElementsByTagName("textbox")
       for (var i = 0; i < items.length; i++) {
           items[i].value = ""
       }
   },

   setPrefs: function(name, min, max)
   {
       var obj = $(name);
       switch (obj.type) {
       case "password":
           ew_session.savePassword(name, obj.value);
           break;

       case "number":
           ew_session.setIntPrefs(name, obj.value, min, max);
           break;

       default:
           switch (obj.tagName) {
           case "checkbox":
               ew_session.setBoolPrefs(name, obj.checked);
               break;

           default:
               ew_session.setStrPrefs(name, obj.value.toString());
           }
       }
   },

   getPrefs: function(name, dflt)
   {
       var obj = $(name);
       switch (obj.type) {
       case "password":
           obj.value = ew_session.getPassword(name);
           break;

       case "number":
           obj.value = ew_session.getIntPrefs(name, dflt);
           break;

       default:
           switch (obj.tagName) {
           case "checkbox":
               obj.checked = ew_session.getBoolPrefs(name, dflt);
               break;

           default:
               obj.value = ew_session.getStrPrefs(name, dflt);
           }
       }
   },

   browse: function(id, forFile) {
      if (forFile) {
         path = ew_session.promptForFile("Choose command:");
      } else {
         path = ew_session.promptForDir("Choose directory where tools are located:");
      }
      if (path) {
          $(id).value = path;
      }
   },
}

