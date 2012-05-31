var ew_client = {
    handler : null,
    uri     : null,
    serviceURL : "",
    region : "",
    elbURL  : "",
    accessCode : null,
    secretKey : null,
    errorCount: 0,
    errorMax: 3,
    timers : {},
    disabled: false,
    httpCount: 0,

    VERSION: "2.0",
    NAME: 'ElasticWolf',
    API_VERSION : '2011-12-15',
    ELB_API_VERSION : '2011-04-05',
    IAM_API_VERSION : '2010-05-08',
    APP_SITE: 'https://github.com',
    APP_PATH: '/vseryakov/',
    VPN_CONFIG_PATH : 'https://ec2-downloads.s3.amazonaws.com/',
    SIG_VERSION: '2',
    IAM_GOV_URL: 'https://iam.us-gov.amazonaws.com',
    IAM_URL : 'https://iam.amazonaws.com',
    REALM : 'chrome://ew/',
    HOST  : 'chrome://ew/',

    getAppName : function() {
        return this.NAME;
    },

    getAppUrl: function() {
        return this.APP_SITE + this.APP_PATH + this.NAME
    },

    getDownloadUrl: function() {
        return this.getAppUrl() + "/downloads/"
    },

    getUserAgent: function () {
        return this.getAppName() + "/" + this.VERSION;
    },

    getIAMURL: function() {
        return this.isGovCloud() ? this.IAM_GOV_URL : this.IAM_URL;
    },

    isGovCloud : function()
    {
        return String(this.serviceURL).indexOf("ec2.us-gov") > -1;
    },

    checkForUpdates: function() {
        ver = parseFloat(this.VERSION) + 0.01
        var url = this.getDownloadUrl()
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        debug(url)
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                var data = xmlhttp.responseText;
                var d = data.match(new RegExp("\/downloads\/[^\/]+\/" + this.NAME + "\/" + this.NAME + (isWindows(navigator.platform) ? "-win-" : "-osx-") + "([0-9]\.[0-9][0-9])\.zip"))
                if (d != null) {
                    debug(d);
                    if (parseFloat(d[1]) > parseFloat(this.VERSION)) {
                        alert("New version " + d[1] + "is available at " + this.APP_SITE + d[0])
                        return;
                    }
                }
                alert("No new version available")
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.send(null);
    },

    getNsResolver : function() {
        var client = this;
        return function(prefix) {
            var ns = { 's':  "http://schemas.xmlsoap.org/soap/envelope/", 'ec2': "http://ec2.amazonaws.com/doc/" + client.API_VERSION + "/" };
            return ns[prefix] || null;
        }
    },

    setCredentials : function (accessCode, secretKey) {
        this.accessCode = accessCode;
        this.secretKey = secretKey;
        this.errorCount = 0;
    },

    setEndpoint : function (endpoint) {
        if (endpoint != null) {
            this.serviceURL = endpoint.url;
            this.region = endpoint.name;
            this.elbURL = "https://elasticloadbalancing." + this.region + ".amazonaws.com";
        }
    },

    newInstance : function() {
        var xmlhttp = null;
        if (typeof XMLHttpRequest != 'undefined') {
            try {
                xmlhttp = new XMLHttpRequest();
            } catch (e) {
                debug(e)
            }
        }
        return xmlhttp;
    },

    setEndpointURLForRegion : function(region) {
        var reg = ew_utils.determineRegionFromString(ew_session.getActiveEndpoint().name);
        log(reg + ": active region prefix");
        if (reg != region) {
            var newURL = null;
            // Determine the region's EC2 URL
            var endpointlist = ew_session.getEndpoints();
            region = region.toLowerCase();
            for (var i = 0; i < endpointlist.length; ++i) {
                var curr = endpointlist[i];
                if (curr.name.indexOf(region) >= 0) {
                    newURL = curr.url;
                    break;
                }
            }

            log(newURL + ": new URL");
            if (newURL == null) {
                return;
            }

            // Switch to the new URL
            this.serviceURL = newURL;
        }
    },

    queryEC2InRegion : function (region, action, params, objActions, isSync, reqType, callback) {
        // Save the current Service URL
        var oldURL = this.serviceURL;
        log(oldURL + ": old URL");
        this.setEndpointURLForRegion(region);

        // Make the call
        var toRet = this.queryEC2(action, params, objActions, isSync, reqType, callback);

        // Switch back to the old URL
        this.serviceURL = oldURL;
        return toRet;
    },

    queryEC2 : function (action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        if (this.serviceURL == null || this.serviceURL == "") {
            this.setEndpoint(ew_session.getActiveEndpoint());
        }

        var rsp = null;
        while (ew_prefs.isHttpEnabled()) {
            try {
                rsp = this.queryEC2Impl(action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion);
                if (!this.retryRequest(rsp, action)) {
                    break;
                }
            } catch (e) {
                alert ("An error occurred while calling "+ action + "\n" + e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    retryRequest: function(rsp, action)
    {
        if (rsp.hasErrors) {
            debug('action: ' + action + ', errorCount: ' + this.errorCount)
            // Prevent from showing error dialog on every error until success, this happens in case of wrong credentials or endpoint and until all views not refreshed
            this.errorCount++;
            if (this.errorCount < this.errorMax) {
                if (!this.errorDialog("Server responded with an error for " + action, rsp.faultCode, rsp.requestId,  rsp.faultString)) {
                    this.errorCount = this.errorMax;
                    return false;
                }
            } else {
                return false;
            }
            return true;
        }

        this.errorCount = 0;
        return false;
    },

    errorDialog : function(msg, code, rId, fStr) {
        var retry = {value:null};
        window.openDialog("chrome://ew/content/dialogs/retry_cancel.xul", null, "chrome,centerscreen,modal,resizable", msg, code, rId, fStr, retry);
        return retry.value;
    },

    sigParamCmp : function(x, y) {
        if (x[0].toLowerCase() < y[0].toLowerCase ()) {
            return -1;
        }
        if (x[0].toLowerCase() > y[0].toLowerCase()) {
           return 1;
        }
        return 0;
    },

    queryEC2Impl : function (action, params, objActions, isSync, reqType, callback, apiURL, apiVersion, sigVersion) {
        var curTime = new Date();
        var formattedTime = formatDate(curTime, "yyyy-MM-ddThh:mm:ssZ");

        var url = apiURL ? apiURL : this.serviceURL
        var sigValues = new Array();
        sigValues.push(new Array("Action", action));
        sigValues.push(new Array("AWSAccessKeyId", this.accessCode));
        sigValues.push(new Array("SignatureVersion", sigVersion ? sigVersion : this.SIG_VERSION));
        sigValues.push(new Array("SignatureMethod", "HmacSHA1"));
        sigValues.push(new Array("Version", apiVersion ? apiVersion : this.API_VERSION));
        sigValues.push(new Array("Timestamp", formattedTime));

        // Mix in the additional parameters. params must be an Array of tuples as for sigValues above
        for (var i = 0; i < params.length; i++) {
            sigValues.push(params[i]);
        }

        var strSig = "";
        var queryParams = "";

        if (this.sigVersion == "1") {
            sigValues.sort(this.sigParamCmp);
            for (var i = 0; i < sigValues.length; i++) {
                strSig += sigValues[i][0] + sigValues[i][1];
                queryParams += (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
            }
        }  else {
            sigValues.sort();
            strSig = "POST\n" + url.replace(/https?:\/\//,"") + "\n/\n";
            for (var i = 0; i < sigValues.length; i++) {
                var item = (i ? "&" : "") + sigValues[i][0] + "=" + encodeURIComponent(sigValues[i][1]);
                strSig += item
                queryParams += item
            }
        }
        queryParams += "&Signature="+encodeURIComponent(b64_hmac_sha1(this.secretKey, strSig));
        url += "/";

        log("URL ["+url+"?"+queryParams+"]");

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        isSync = false;
        xmlhttp.open("POST", url, !isSync);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlhttp.setRequestHeader("Content-Length", queryParams.length);
        xmlhttp.setRequestHeader("Connection", "close");

        return this.sendRequest(xmlhttp, queryParams, isSync, reqType, objActions, callback);
    },

    queryELB : function (action, params, objActions, isSync, reqType, callback) {
        if (this.elbURL == null || this.elbURL == "") {
            this.setEndpoint(ew_session.getActiveEndpoint());
        }
        return this.queryEC2(action, params, objActions, isSync, reqType, callback, this.elbURL, this.ELB_API_VERSION);
    },

    queryIAM : function (action, params, objActions, isSync, reqType, callback) {
        return this.queryEC2(action, params, objActions, isSync, reqType, callback, this.getIAMURL(), this.IAM_API_VERSION);
    },

    queryS3Prepare : function(method, bucket, key, path, params, content) {
        var curTime = new Date().toUTCString();
        var url = ew_prefs.getS3Protocol(this.region, bucket) + (bucket ? bucket + "." : "") + ew_prefs.getS3Region(this.region || "").url;

        if (!params) params = {}

        // Required headers
        if (!params["x-amz-date"]) params["x-amz-date"] = curTime;
        if (!params["Content-Type"]) params["Content-Type"] = "binary/octet-stream; charset=UTF-8";
        if (!params["Content-Length"]) params["Content-Length"] = content ? content.length : 0;

        // Construct the string to sign and query string
        var strSig = method + "\n" + (params['Content-MD5']  || "") + "\n" + (params['Content-Type'] || "") + "\n" + "\n";

        // Amazon canonical headers
        var headers = []
        for (var p in params) {
            if (/X-AMZ-/i.test(p)) {
                var value = params[p]
                if (value instanceof Array) {
                    value = value.join(',');
                }
                headers.push(p.toString().toLowerCase() + ':' + value);
            }
        }
        if (headers.length) {
            strSig += headers.sort().join('\n') + "\n"
        }

        // Split query string for subresources, supported are:
        var resources = ["acl", "lifecycle", "location", "logging", "notification", "partNumber", "policy", "requestPayment", "torrent",
                         "uploadId", "uploads", "versionId", "versioning", "versions", "website",
                         "delete",
                         "response-content-type", "response-content-language", "response-expires",
                         "response-cache-control", "response-content-disposition", "response-content-encoding" ]
        var rclist = []
        var query = parseQuery(path)
        for (var p in query) {
            p = p.toLowerCase();
            if (resources.indexOf(p) != -1) {
                rclist.push(p + (query[p] == true ? "" : "=" + query[p]))
            }
        }
        strSig += (bucket ? "/" + bucket : "") + "/" + key + (rclist.length ? "?" : "") + rclist.sort().join("&");

        params["Authorization"] = "AWS " + this.accessCode + ":" + b64_hmac_sha1(this.secretKey, strSig);
        params["User-Agent"] = this.getUserAgent();
        params["Connection"] = "close";

        debug("S3 [" + method + ":" + url + "/" + key + path + ":" + strSig.replace(/\n/g, "|") + " " + JSON.stringify(params) + "]")

        return { method: method, url: url + "/" + key + path, headers: params, sig: strSig, time: curTime }
    },

    queryS3Impl : function(method, bucket, key, path, params, content, objActions, isSync, reqType, callback) {

        var req = this.queryS3Prepare(method, bucket, key, path, params, content);

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        isSync = false;
        xmlhttp.open(req.method, req.url, !isSync);

        for (var p in req.headers) {
            xmlhttp.setRequestHeader(p, req.headers[p]);
        }

        return this.sendRequest(xmlhttp, content, isSync, reqType, objActions, callback, [bucket, key, path]);
    },

    downloadS3 : function (method, bucket, key, path, params, file, callback, progresscb) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;
        var req = this.queryS3Prepare(method, bucket, key, path, params, null);
        return this.download(req.url, req.headers, file, callback, progresscb);
    },

    uploadS3: function(bucket, key, path, params, filename, callback, progresscb) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        var file = FileIO.streamOpen(filename);
        if (!file) {
            alert('Cannot open ' + filename)
            return false;
        }
        var length = file[1].available();
        params["Content-Length"] = length;

        var req = this.queryS3Prepare("PUT", bucket, key, path, params, null);

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return null;
        }
        xmlhttp.open(req.method, req.url, true);
        for (var p in req.headers) {
            xmlhttp.setRequestHeader(p, req.headers[p]);
        }
        xmlhttp.send(file[1]);

        var timer = setInterval(function() {
            try {
                var a = length - file[1].available();
                if (progresscb) progresscb(filename, Math.round(a / length * 100));
            }
            catch(e) {
                alert("Error uploading " + filename + "\n" + e)
            }
        }, 300);

        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState != 4) return;
            FileIO.streamClose(file);
            clearInterval(timer);
            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                if (progresscb) progresscb(filename, 100);
                if (callback) callback(filename);
            } else {
                var rsp = this.handleResponseError(xmlhttp);
                this.errorDialog("S3 responded with an error for "+ bucket + "/" + key + path, rsp.faultCode, rsp.requestId, rsp.faultString)
            }
        };
        return true;
    },

    queryS3 : function (method, bucket, key, path, params, content, objActions, isSync, reqType, callback) {
        if (this.disabled || this.accessCode == null || this.accessCode == "") return null;

        var rsp = null;

        while (ew_prefs.isHttpEnabled()) {
            try {
                rsp = this.queryS3Impl(method, bucket, key, path, params, content, objActions, isSync, reqType, callback);
                if (!this.retryRequest(rsp, method + " " + bucket + "/" + key + path)) {
                    break;
                }
            } catch (e) {
                alert ("An error occurred while calling "+ method + " " + bucket + "/" + key + path + "\n" + e);
                rsp = null;
                break;
            }
        }
        return rsp;
    },

    showBusy : function(fShow)
    {
        if (fShow) {
            this.httpCount++;
            window.setCursor("wait");
        } else {
            --this.httpCount;
            if (this.httpCount <= 0) {
                window.setCursor("auto");
            }
        }
    },

    sendRequest: function(xmlhttp, content, isSync, reqType, objActions, callback, data) {
        var me = this;

        // Generate random timer
        var timerKey = this.getTimerKey();
        this.startTimer(timerKey, xmlhttp.abort);
        this.showBusy(true);

        if (isSync) {
            xmlhttp.onreadystatechange = function() {}
        } else {
            var xhr = xmlhttp;
            xmlhttp.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    me.showBusy(false);
                    me.stopTimer(timerKey);
                    var rsp = me.handleResponse(xhr, reqType, isSync, objActions, callback, data);
                    me.retryRequest(rsp, reqType);
                }
            }
        }

        try {
            xmlhttp.send(content);
        } catch(e) {
            debug(e)
            this.showBusy(false);
            this.stopTimer(timerKey);
            return this.createResponse(null, reqType, callback, true, "Send Request Error", e, "", data);
        }
        if (isSync) {
            this.showBusy(false);
            this.stopTimer(timerKey);
            return this.handleResponse(xmlhttp, reqType, isSync, objActions, callback, data);
        }
        return { hasErrors: false };
    },

    handleResponse : function(xmlhttp, reqType, isSync, objActions, callback, data) {
        log((isSync ? "Sync" : "Async") + " Response, status: " + xmlhttp.status + ", req:" + reqType + ", response: " + xmlhttp.responseText);

        var rc = xmlhttp.status >= 200 && xmlhttp.status < 300 ?
                 this.createResponse(xmlhttp, reqType, callback, false, "", "", "", data) :
                 this.handleResponseError(xmlhttp, reqType, callback, data);

        rc.isSync = isSync;
        // If context object is not specified call the callback directly
        if (objActions) {
            objActions.onResponseComplete(rc);
        } else
        if (callback) {
            callback(rc);
        }
        return rc;
    },

    handleResponseError : function(xmlhttp, reqType, callback, data) {
        var faultCode = "Unknown: " + xmlhttp.status;
        var faultString = "An unknown error occurred.";
        var requestId = "";
        var xmlDoc = xmlhttp.responseXML;
        if (!xmlDoc) {
            if (xmlhttp.responseText) {
                xmlDoc = new DOMParser().parseFromString(xmlhttp.responseText, "text/xml");
            }
        }
        if (xmlDoc) {
            faultCode = getNodeValueByName(xmlDoc, "Code");
            faultString = getNodeValueByName(xmlDoc, "Message");
            requestId = getNodeValueByName(xmlDoc, "RequestID");
        }
        return this.createResponse(xmlhttp, reqType, callback, true, faultCode, faultString, requestId, data);
    },

    createResponse : function(xmlhttp, reqType, callback, hasErrors, faultCode, faultString, requestId, data) {
        return { xmlhttp: xmlhttp,
                 xmlDoc: xmlhttp ? xmlhttp.responseXML : null,
                 textBody: xmlhttp ? xmlhttp.responseText : '',
                 requestType: reqType, requestId: requestId,
                 faultCode: faultCode, faultString: faultString,
                 hasErrors: hasErrors,
                 data: data, callback: callback, };
    },

    queryVpnConnectionStylesheets : function(stylesheet) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return

        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        if (stylesheet == null) {
            stylesheet = "customer-gateway-config-formats.xml";
        }
        xmlhttp.open("GET", this.VPN_CONFIG_PATH + '2009-07-15' + "/" + stylesheet, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.overrideMimeType('text/xml');
        return this.sendRequest(xmlhttp, null, true, stylesheet);
    },

    queryCheckIP : function(reqType, retVal) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return;
        var xmlhttp = this.newInstance();
        if (!xmlhttp) {
            log("Could not create xmlhttp object");
            return;
        }
        xmlhttp.open("GET", "http://checkip.amazonaws.com/" + reqType, false);
        xmlhttp.setRequestHeader("User-Agent", this.getUserAgent());
        xmlhttp.overrideMimeType('text/plain');
        return this.sendRequest(xmlhttp, null, true, "checkip", null, function(obj) { retVal.ipAddress = obj.textBody; });
    },

    download: function(url, headers, filename, callback, progresscb) {
        if (this.disabled || !ew_prefs.isHttpEnabled()) return;

        debug('download: ' + url + '| ' + JSON.stringify(headers) + '| ' + filename)

        try {
          FileIO.remove(filename);
          var file = FileIO.open(filename);
          if (!FileIO.create(file)) {
              alert('Cannot create ' + filename)
              return false;
          }

          var io = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(url, null, null);
          var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
          persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
          persist.progressListener = {
            onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
                var percent = (aCurTotalProgress/aMaxTotalProgress) * 100;
                if (progresscb) progresscb(filename, percent);
            },
            onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
                debug("download: " + filename + " " + aStateFlags + " " + aStatus)
                if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                    if (callback) callback(filename);
                }
            }
          }

          var hdrs = "";
          for (var p in headers) {
              hdrs += p + ":" + headers[p] + "\n";
          }
          persist.saveURI(io, null, null, null, hdrs, file);
          return true;

        } catch (e) {
          alert(e);
        }
        return false;
    },

    getTimerKey: function()
    {
        return String(Math.random()) + ":" + String(new Date().getTime());
    },

    startTimer : function(key, expr) {
        var timer = window.setTimeout(expr, ew_prefs.getRequestTimeout());
        this.timers[key] = timer;
    },

    stopTimer : function(key, timeout) {
        var timer = this.timers[key];
        this.timers[key] = null;
        if (timer == null) {
            return false;
        }
        window.clearTimeout(timer);
        timer = null;
        return true;
    }
}
