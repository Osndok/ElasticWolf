var ew_PrefsView = {
   rowCount: 0,

   refresh: function() {
       this.rowCount++;
       $("ew.tools.version").value = ew_session.VERSION;
       $("ew.tools.ec2_version").value = ew_session.EC2_API_VERSION;
       $("ew.tools.iam_version").value = ew_session.IAM_API_VERSION;
       $("ew.tools.elb_version").value = ew_session.ELB_API_VERSION;
       $("ew.tools.home").value = ew_session.getHome();
       $("ew.tools.profile").value = ew_session.getProfileHome();
       $("ew.tools.keyhome").value = ew_session.getKeyHome();
       $("ew.tools.ssh.command").value = ew_session.getSSHCommand();
       $("ew.tools.ssh.args").value = ew_session.getSSHArgs();
       $("ew.tools.ssh.user").value = ew_session.getSSHUser();
       $("ew.tools.rdp.command").value = ew_session.getRDPCommand();
       $("ew.tools.rdp.args").value = ew_session.getRDPArgs();
       $("ew.tools.openssl.command").value = ew_session.getOpenSSLCommand();
       $("ew.tools.shell.command").value = ew_session.getShellCommand();
       $("ew.tools.path.ec2").value = ew_session.getStrPrefs(ew_session.EC2_TOOLS_PATH, "");
       $("ew.tools.path.iam").value = ew_session.getStrPrefs(ew_session.IAM_TOOLS_PATH, "");
       $("ew.tools.path.ami").value = ew_session.getStrPrefs(ew_session.AMI_TOOLS_PATH, "");
       $("ew.tools.path.autoscale").value = ew_session.getStrPrefs(ew_session.AWS_AUTOSCALING_TOOLS_PATH, "");
       $("ew.tools.path.cloudwatch").value = ew_session.getStrPrefs(ew_session.CLOUDWATCH_TOOLS_PATH, "");
       $("ew.tools.path.java").value = ew_session.getStrPrefs(ew_session.JAVA_TOOLS_PATH, ew_session.getDefaultJavaHome());
       $("ew.tools.debug").checked = ew_session.getBoolPrefs("ew.debug.enabled", false);
       $("ew.tools.http").checked = ew_session.getBoolPrefs("ew.http.enabled", true);
       $("ew.tools.idle.timeout").value = ew_session.getIntPrefs("ew.idle.timeout", 0);
       $("ew.tools.idle.action").value = ew_session.getStrPrefs("ew.idle.action", "");
       $("ew.tools.pin").value = ew_session.getPassword('ew.pin');
       $("ew.tools.accesskey").checked = ew_session.getBoolPrefs("ew.accesskey.save", true);
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

   deactivate: function() {
       if (!this.rowCount) return;
       ew_session.setKeyHome($("ew.tools.keyhome").value.toString());
       ew_session.setSSHCommand($("ew.tools.ssh.command").value.toString());
       ew_session.setSSHArgs($("ew.tools.ssh.args").value.toString());
       ew_session.setSSHUser($("ew.tools.ssh.user").value.toString());
       ew_session.setRDPCommand($("ew.tools.rdp.command").value.toString());
       ew_session.setRDPArgs($("ew.tools.rdp.args").value.toString());
       ew_session.setOpenSSLCommand($("ew.tools.openssl.command").value.toString());
       ew_session.setShellCommand($("ew.tools.shell.command").value.toString());
       ew_session.setStrPrefs(ew_session.EC2_TOOLS_PATH, $("ew.tools.path.ec2").value.toString());
       ew_session.setStrPrefs(ew_session.IAM_TOOLS_PATH, $("ew.tools.path.iam").value.toString());
       ew_session.setStrPrefs(ew_session.AMI_TOOLS_PATH, $("ew.tools.path.ami").value.toString());
       ew_session.setStrPrefs(ew_session.AWS_AUTOSCALING_TOOLS_PATH, $("ew.tools.path.autoscale").value.toString());
       ew_session.setStrPrefs(ew_session.CLOUDWATCH_TOOLS_PATH, $("ew.tools.path.cloudwatch").value.toString());
       ew_session.setStrPrefs(ew_session.JAVA_TOOLS_PATH, $("ew.tools.path.java").value.toString());
       ew_session.setBoolPrefs("ew.debug.enabled", $("ew.tools.debug").checked);
       ew_session.setBoolPrefs("ew.http.enabled", $("ew.tools.http").checked);
       ew_session.setIntPrefs("ew.idle.timeout", parseInt($("ew.tools.idle.timeout").value));
       ew_session.setStrPrefs("ew.idle.action", $("ew.tools.idle.action").value.toString());
       ew_session.setBoolPrefs("ew.accesskey.save", $("ew.tools.accesskey").checked);

       ew_session.setIdleTimer();
       ew_session.savePassword('ew.pin', $("ew.tools.pin").value);
       this.rowCount = 0;
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

