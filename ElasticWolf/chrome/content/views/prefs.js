var ew_PrefsView = {
   rowCount: 0,

   refresh: function() {
       this.rowCount++;
       document.getElementById("ew.tools.version").value = ew_session.VERSION;
       document.getElementById("ew.tools.ec2_version").value = ew_session.EC2_API_VERSION;
       document.getElementById("ew.tools.iam_version").value = ew_session.IAM_API_VERSION;
       document.getElementById("ew.tools.elb_version").value = ew_session.ELB_API_VERSION;
       document.getElementById("ew.tools.home").value = ew_session.getHome();
       document.getElementById("ew.tools.profile").value = ew_session.getProfileHome();
       document.getElementById("ew.tools.keyhome").value = ew_session.getKeyHome();
       document.getElementById("ew.tools.ssh.command").value = ew_session.getSSHCommand();
       document.getElementById("ew.tools.ssh.args").value = ew_session.getSSHArgs();
       document.getElementById("ew.tools.ssh.user").value = ew_session.getSSHUser();
       document.getElementById("ew.tools.rdp.command").value = ew_session.getRDPCommand();
       document.getElementById("ew.tools.rdp.args").value = ew_session.getRDPArgs();
       document.getElementById("ew.tools.openssl.command").value = ew_session.getOpenSSLCommand();
       document.getElementById("ew.tools.shell.command").value = ew_session.getShellCommand();
       document.getElementById("ew.tools.path.ec2").value = ew_session.getStrPrefs(ew_session.EC2_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.iam").value = ew_session.getStrPrefs(ew_session.IAM_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.ami").value = ew_session.getStrPrefs(ew_session.AMI_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.autoscale").value = ew_session.getStrPrefs(ew_session.AWS_AUTOSCALING_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.cloudwatch").value = ew_session.getStrPrefs(ew_session.CLOUDWATCH_TOOLS_PATH, "");
       document.getElementById("ew.tools.path.java").value = ew_session.getStrPrefs(ew_session.JAVA_TOOLS_PATH, ew_session.getDefaultJavaHome());
       document.getElementById("ew.tools.debug").checked = ew_session.isDebugEnabled();
       document.getElementById("ew.tools.http").checked = ew_session.isHttpEnabled();
       document.getElementById("ew.tools.idle.timeout").value = ew_session.getIdleTimeout();
       document.getElementById("ew.tools.idle.action").value = ew_session.getIdleAction();
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
       ew_session.setKeyHome(document.getElementById("ew.tools.keyhome").value.toString());
       ew_session.setSSHCommand(document.getElementById("ew.tools.ssh.command").value.toString());
       ew_session.setSSHArgs(document.getElementById("ew.tools.ssh.args").value.toString());
       ew_session.setSSHUser(document.getElementById("ew.tools.ssh.user").value.toString());
       ew_session.setRDPCommand(document.getElementById("ew.tools.rdp.command").value.toString());
       ew_session.setRDPArgs(document.getElementById("ew.tools.rdp.args").value.toString());
       ew_session.setOpenSSLCommand(document.getElementById("ew.tools.openssl.command").value.toString());
       ew_session.setShellCommand(document.getElementById("ew.tools.shell.command").value.toString());
       ew_session.setStrPrefs(ew_session.EC2_TOOLS_PATH, document.getElementById("ew.tools.path.ec2").value.toString());
       ew_session.setStrPrefs(ew_session.IAM_TOOLS_PATH, document.getElementById("ew.tools.path.iam").value.toString());
       ew_session.setStrPrefs(ew_session.AMI_TOOLS_PATH, document.getElementById("ew.tools.path.ami").value.toString());
       ew_session.setStrPrefs(ew_session.AWS_AUTOSCALING_TOOLS_PATH, document.getElementById("ew.tools.path.autoscale").value.toString());
       ew_session.setStrPrefs(ew_session.CLOUDWATCH_TOOLS_PATH, document.getElementById("ew.tools.path.cloudwatch").value.toString());
       ew_session.setStrPrefs(ew_session.JAVA_TOOLS_PATH, document.getElementById("ew.tools.path.java").value.toString());
       ew_session.setDebugEnabled(document.getElementById("ew.tools.debug").checked);
       ew_session.setHttpEnabled(document.getElementById("ew.tools.http").checked);
       ew_session.setIdleTimeout(parseInt(document.getElementById("ew.tools.idle.timeout").value));
       ew_session.setIdleAction(document.getElementById("ew.tools.idle.action").value.toString());
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

