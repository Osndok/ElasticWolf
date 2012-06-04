var ew_PrefsView = {
   rowCount: 0,

   refresh: function() {
       this.rowCount++;
       document.getElementById("ew.tools.version").value = ew_session.client.VERSION;
       document.getElementById("ew.tools.ec2_version").value = ew_session.client.EC2_API_VERSION;
       document.getElementById("ew.tools.iam_version").value = ew_session.client.IAM_API_VERSION;
       document.getElementById("ew.tools.elb_version").value = ew_session.client.ELB_API_VERSION;
       document.getElementById("ew.tools.home").value = ew_prefs.getHome();
       document.getElementById("ew.tools.profile").value = ew_prefs.getProfileHome();
       document.getElementById("ew.tools.keyhome").value = ew_prefs.getKeyHome();
       document.getElementById("ew.tools.ssh.command").value = ew_prefs.getSSHCommand();
       document.getElementById("ew.tools.ssh.args").value = ew_prefs.getSSHArgs();
       document.getElementById("ew.tools.ssh.user").value = ew_prefs.getSSHUser();
       document.getElementById("ew.tools.rdp.command").value = ew_prefs.getRDPCommand();
       document.getElementById("ew.tools.rdp.args").value = ew_prefs.getRDPArgs();
       document.getElementById("ew.tools.openssl.command").value = ew_prefs.getOpenSSLCommand();
       document.getElementById("ew.tools.shell.command").value = ew_prefs.getShellCommand();
       document.getElementById("ew.tools.path.ec2").value = ew_prefs.getStringPreference(ew_prefs.EC2_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.iam").value = ew_prefs.getStringPreference(ew_prefs.IAM_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.ami").value = ew_prefs.getStringPreference(ew_prefs.AMI_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.autoscale").value = ew_prefs.getStringPreference(ew_prefs.AWS_AUTOSCALING_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.cloudwatch").value = ew_prefs.getStringPreference(ew_prefs.CLOUDWATCH_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.java").value = ew_prefs.getStringPreference(ew_prefs.JAVA_TOOLS_PATH, ew_prefs.getDefaultJavaHome());
       document.getElementById("ew.tools.debug").checked = ew_prefs.isDebugEnabled();
       document.getElementById("ew.tools.http").checked = ew_prefs.isHttpEnabled();
       document.getElementById("ew.tools.idle.timeout").value = ew_prefs.getIdleTimeout();
       document.getElementById("ew.tools.idle.action").value = ew_prefs.getIdleAction();
       document.getElementById("ew.tools.pin").value = ew_session.getPassword('ew.pin');
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
       ew_prefs.setKeyHome(document.getElementById("ew.tools.keyhome").value.toString());
       ew_prefs.setSSHCommand(document.getElementById("ew.tools.ssh.command").value.toString());
       ew_prefs.setSSHArgs(document.getElementById("ew.tools.ssh.args").value.toString());
       ew_prefs.setSSHUser(document.getElementById("ew.tools.ssh.user").value.toString());
       ew_prefs.setRDPCommand(document.getElementById("ew.tools.rdp.command").value.toString());
       ew_prefs.setRDPArgs(document.getElementById("ew.tools.rdp.args").value.toString());
       ew_prefs.setOpenSSLCommand(document.getElementById("ew.tools.openssl.command").value.toString());
       ew_prefs.setShellCommand(document.getElementById("ew.tools.shell.command").value.toString());
       ew_prefs.setStringPreference(ew_prefs.EC2_TOOLS_PATH, document.getElementById("ew.tools.path.ec2").value.toString());
       ew_prefs.setStringPreference(ew_prefs.IAM_TOOLS_PATH, document.getElementById("ew.tools.path.iam").value.toString());
       ew_prefs.setStringPreference(ew_prefs.AMI_TOOLS_PATH, document.getElementById("ew.tools.path.ami").value.toString());
       ew_prefs.setStringPreference(ew_prefs.AWS_AUTOSCALING_TOOLS_PATH, document.getElementById("ew.tools.path.autoscale").value.toString());
       ew_prefs.setStringPreference(ew_prefs.CLOUDWATCH_TOOLS_PATH, document.getElementById("ew.tools.path.cloudwatch").value.toString());
       ew_prefs.setStringPreference(ew_prefs.JAVA_TOOLS_PATH, document.getElementById("ew.tools.path.java").value.toString());
       ew_prefs.setDebugEnabled(document.getElementById("ew.tools.debug").checked);
       ew_prefs.setHttpEnabled(document.getElementById("ew.tools.http").checked);
       ew_prefs.setIdleTimeout(parseInt(document.getElementById("ew.tools.idle.timeout").value));
       ew_prefs.setIdleAction(document.getElementById("ew.tools.idle.action").value.toString());
       ew_session.setIdleTimer();
       ew_session.savePassword('ew.pin', document.getElementById("ew.tools.pin").value);
       this.rowCount = 0;
   },

   browse: function(id, forFile) {
      if (forFile) {
         path = ew_session.promptForFile("Choose command:");
      } else {
         path = ew_session.promptForDir("Choose directory where tools are located:");
      }
      if (path) {
          document.getElementById(id).value = path;
      }
   },
}

