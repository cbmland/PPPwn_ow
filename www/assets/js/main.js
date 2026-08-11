if (window.Alpine) {
    registerAlpineApp();
} else {
    document.addEventListener('alpine:init', registerAlpineApp);
}

function registerAlpineApp() {
    Alpine.data('pppwnApp', function() {
        return {
            // Tab states
            activeTab: 'pppwn',
            
            // Router states
            chipname: '',
            update: false,
            pppoe: false,
            pppwn: true, // Has pppwn installed
            compiled: [],
            pppwned: false,
            running: false,
            autorun: false,
            path: '',
            interfaces: [],
            timeout: 0,
            version: '',
            versions: [],
            stage1: {},
            stage2: {},
            adapter: '',
            retry: false,
            sleep: false,
            
            // Log states
            rawLogs: '',
            formattedLogs: '',
            autoRefresh: false,
            autoRefreshInterval: null,
            logFilters: {
                pppwn: true,
                pppoe: true,
                pppd: false
            },
            
            // UI helper states
            loading: false,
            modalMessage: '',
            modalButtons: [],
            
            // Payload list
            payloadList: [],
            selectedSetupOption: '',
            webToken: '',

            init: function() {
                var self = this;
                this.webToken = this.getCookie('token') || '';
                
                // Read window hash for routing
                this.routeByHash();
                window.addEventListener('hashchange', function() {
                    self.routeByHash();
                });
                
                // Fetch initial state
                this.fetchState();
            },

            routeByHash: function() {
                var hash = window.location.hash;
                if (hash === '#/payloads') {
                    this.changeTab('payloads');
                } else if (hash === '#/logs') {
                    this.changeTab('logs');
                } else {
                    this.changeTab('pppwn');
                }
            },

            changeTab: function(tab) {
                this.activeTab = tab;
                window.location.hash = (tab === 'pppwn') ? '#/' : '#/' + tab;
                
                // Manage auto-refresh timer when switching tabs
                if (tab !== 'logs') {
                    this.stopAutoRefresh();
                } else {
                    this.autoRefresh = true;
                    this.toggleAutoRefresh();
                }
                
                if (tab === 'payloads') {
                    this.fetchPayloads();
                } else if (tab === 'logs') {
                    this.fetchLogs(true);
                } else {
                    this.fetchState();
                }
            },

            getCookie: function(name) {
                var cookies = document.cookie.split('; ');
                for (var i = 0; i < cookies.length; i++) {
                    var parts = cookies[i].split('=');
                    if (parts[0] === name) return parts[1];
                }
                return '';
            },

            setCookie: function(name, value) {
                document.cookie = name + '=' + value + '; path=/;';
            },

            requestCgi: function(data) {
                var self = this;
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', '/cgi-bin/pw.cgi');
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.onload = function() {
                        var response = xhr.responseText;
                        // Check if it's JSON
                        if (xhr.getResponseHeader('Content-Type') && xhr.getResponseHeader('Content-Type').indexOf('application/json') !== -1) {
                            try {
                                response = JSON.parse(response);
                            } catch(e) {}
                        }
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(response);
                        } else {
                            reject(response || 'Request failed');
                        }
                    };
                    xhr.onerror = function() {
                        reject('Network error');
                    };
                    
                    data.token = self.webToken;
                    var params = [];
                    for (var key in data) {
                        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                    }
                    xhr.send(params.join('&'));
                });
            },

            fetchState: function(quiet) {
                var self = this;
                if (!quiet) this.loading = true;
                
                return this.requestCgi({ task: 'state' })
                    .then(function(res) {
                        self.loading = false;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) {}
                        }
                        if (res.stored_token) {
                            self.webToken = res.stored_token;
                            self.setCookie('token', res.stored_token);
                        }
                        
                        // Map values
                        self.chipname = res.chipname || '';
                        self.update = !!res.update;
                        self.pppoe = !!res.pppoe;
                        self.pppwn = !!res.pppwn;
                        self.compiled = res.compiled || [];
                        self.running = !!res.running;
                        self.autorun = !!res.autorun;
                        self.path = res.path || '/payloads';
                        var rawInterfaces = res.interfaces || [];
                        self.interfaces = rawInterfaces.filter(function(item) {
                            return item && item.adapter && item.adapter.indexOf('+') === -1 && item.adapter.indexOf('PPPwn') === -1 && item.adapter.indexOf('PlayStation') === -1;
                        });
                        self.timeout = res.timeout || 0;
                        self.version = res.version || '';
                        var rawVersions = res.versions || [];
                        self.versions = rawVersions.sort(function(a, b) {
                            return parseInt(a, 10) - parseInt(b, 10);
                        });
                        self.stage1 = res.stage1 || {};
                        self.stage2 = res.stage2 || {};
                        
                        // Select default options
                        self.retry = res.retry === 'yes';
                        self.sleep = res.sleep === 'yes';
                        
                        if (res.adapter) self.adapter = res.adapter;
                        
                        Alpine.nextTick(function() {
                            if (res.adapter) self.adapter = res.adapter;
                            if (res.version) self.version = res.version;
                        });
                        
                        if (self.compiled.length > 0 && !self.selectedSetupOption) {
                            self.selectedSetupOption = self.compiled[0].type;
                        }
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            saveSettings: function() {
                var self = this;
                this.loading = true;
                
                var data = {
                    task: 'save',
                    path: this.path,
                    stage1: this.stage1[this.version] || '',
                    stage2: this.stage2[this.version] || '',
                    timeout: this.timeout,
                    adapter: this.adapter,
                    version: this.version,
                    auto: this.autorun ? '1' : '0',
                    retry: this.retry ? 'yes' : 'no',
                    sleep: this.sleep ? 'yes' : 'no'
                };
                
                this.requestCgi(data)
                    .then(function(res) {
                        self.loading = false;
                        var msg = (typeof res === 'object' && res.output) ? res.output : 'Settings saved successfully.';
                        self.showAlert(msg);
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            toggleExploit: function(action) {
                var self = this;
                this.loading = true;
                
                var data = {
                    task: action,
                    path: this.path,
                    adapter: this.adapter,
                    version: this.version,
                    stage1: this.stage1[this.version] || '',
                    stage2: this.stage2[this.version] || '',
                    timeout: this.timeout,
                    auto: this.autorun ? '1' : '0',
                    retry: this.retry ? 'yes' : 'no',
                    sleep: this.sleep ? 'yes' : 'no'
                };
                
                this.requestCgi(data)
                    .then(function(res) {
                        self.running = (action === 'start');
                        setTimeout(function() {
                            self.loading = false;
                        }, 1000);
                        
                        setTimeout(function() {
                            self.fetchState(true);
                        }, 6500);
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            togglePppoe: function() {
                var self = this;
                this.loading = true;
                
                this.requestCgi({ task: 'reconnect' })
                    .then(function(res) {
                        self.loading = false;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) {}
                        }
                        self.pppoe = !!res.pppoe;
                        self.showAlert(res.output || 'PPPoE action completed.');
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            setupBuild: function() {
                var self = this;
                if (!this.selectedSetupOption) return;
                this.loading = true;
                
                this.requestCgi({ task: 'setup', option: this.selectedSetupOption })
                    .then(function(res) {
                        self.loading = false;
                        self.fetchState();
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            fetchPayloads: function() {
                var self = this;
                this.requestCgi({ task: 'payloads' })
                    .then(function(res) {
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch(e) {}
                        }
                        self.payloadList = res.file_list || [];
                    })
                    .catch(function(err) {
                        self.showError(err);
                    });
            },

            sendPayload: function(path) {
                var self = this;
                this.loading = true;
                
                // Fetch status from local loader on PS4 side (127.0.0.1:9090)
                var statusXhr = new XMLHttpRequest();
                statusXhr.open('POST', 'http://127.0.0.1:9090/status');
                statusXhr.onload = function() {
                    try {
                        var res = JSON.parse(statusXhr.responseText);
                        if (res.status === 'ready') {
                            // Get binary payload content
                            var binXhr = new XMLHttpRequest();
                            binXhr.open('GET', path);
                            binXhr.responseType = 'arraybuffer';
                            binXhr.onload = function() {
                                if (binXhr.status === 200 && binXhr.response) {
                                    // Send payload to PS4 binloader
                                    var loadXhr = new XMLHttpRequest();
                                    loadXhr.open('POST', 'http://127.0.0.1:9090');
                                    loadXhr.onload = function() {
                                        self.loading = false;
                                        if (loadXhr.status === 200) {
                                            self.showAlert('Payload loaded successfully!');
                                        } else {
                                            self.showAlert('Cannot send payload.');
                                        }
                                    };
                                    loadXhr.onerror = function() {
                                        self.loading = false;
                                        self.showAlert('Cannot load payload: Binloader server busy or error.');
                                    };
                                    loadXhr.send(binXhr.response);
                                } else {
                                    self.loading = false;
                                    self.showAlert('Failed to download binary payload file.');
                                }
                            };
                            binXhr.onerror = function() {
                                self.loading = false;
                                self.showAlert('Network error downloading payload.');
                            };
                            binXhr.send();
                        } else {
                            self.loading = false;
                            self.showAlert('Cannot load payload: Binloader server is busy.');
                        }
                    } catch(e) {
                        self.loading = false;
                        self.showAlert('Failed to parse status response.');
                    }
                };
                statusXhr.onerror = function() {
                    self.loading = false;
                    self.showAlert('Cannot load payload: Binloader server is not running on the console.');
                };
                statusXhr.send();
            },

            fetchLogs: function(showLoader) {
                var self = this;
                if (showLoader) this.loading = true;
                
                this.requestCgi({ task: 'logs' })
                    .then(function(res) {
                        self.loading = false;
                        self.rawLogs = res;
                        self.renderLogs();
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            },

            fetchLogsQuietly: function() {
                var self = this;
                this.requestCgi({ task: 'logs' })
                    .then(function(res) {
                        self.rawLogs = res;
                        self.renderLogs();
                    })
                    .catch(function(e) {
                        console.log(e);
                    });
            },

            renderLogs: function() {
                var raw = this.rawLogs || '';
                var filters = this.logFilters;
                
                // Normalise carriage returns to standard newlines
                var normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                var lines = normalized.split('\n');
                var formatted = [];
                var showLastLine = false;
                
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (!line.trim() && i === lines.length - 1) {
                        continue;
                    }
                    
                    var match;
                    if (line.match(/^\s*\[/)) {
                        match = line.match(/^\s*\[([^\]]+)\]\s+(\S+?)(?:\s*:\s*|\s+)(.*)$/);
                    } else {
                        match = line.match(/^\s*([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(\S+?)(?:\s*:\s*|\s+)(.*)$/);
                    }
                    
                    if (match) {
                        var rawTime = match[1];
                        var content = match[3];
                        
                        var hasPppwn = line.indexOf('pppwn') !== -1;
                        var hasPppoe = line.indexOf('pppoe-server') !== -1;
                        var hasPppd = line.indexOf('pppd') !== -1;
                        
                        var keepLine = false;
                        if (hasPppwn && filters.pppwn) keepLine = true;
                        if (hasPppoe && filters.pppoe) keepLine = true;
                        if (hasPppd && filters.pppd) keepLine = true;
                        
                        showLastLine = keepLine;
                        
                        if (keepLine) {
                            var timeMatch = rawTime.match(/(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)?/i);
                            var formattedTime = "";
                            if (timeMatch) {
                                var hrs = parseInt(timeMatch[1], 10);
                                var mins = timeMatch[2];
                                var secs = timeMatch[3];
                                var ampm = timeMatch[4];
                                if (ampm) {
                                    ampm = ampm.toUpperCase();
                                    if (ampm === 'PM' && hrs < 12) hrs += 12;
                                    if (ampm === 'AM' && hrs === 12) hrs = 0;
                                }
                                var hrsStr = hrs.toString();
                                if (hrsStr.length < 2) hrsStr = "0" + hrsStr;
                                formattedTime = hrsStr + ":" + mins + ":" + secs;
                            } else {
                                formattedTime = rawTime;
                            }
                            formatted.push("[" + formattedTime + "] " + content);
                        }
                    } else {
                        if (showLastLine) {
                            if (line.trim() !== "") {
                                formatted.push("           " + line);
                            } else {
                                formatted.push("");
                            }
                        }
                    }
                }
                
                this.formattedLogs = formatted.join('\n');
                
                // Scroll log view to bottom
                Alpine.nextTick(function() {
                    var el = document.querySelector('.log-box');
                    if (el) {
                        el.scrollTop = el.scrollHeight;
                    }
                });
            },

            toggleAutoRefresh: function() {
                var self = this;
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                }
                if (this.autoRefresh) {
                    this.autoRefreshInterval = setInterval(function() {
                        self.fetchLogsQuietly();
                    }, 5000);
                }
            },

            stopAutoRefresh: function() {
                this.autoRefresh = false;
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                }
            },

            showAlert: function(msg) {
                this.modalMessage = msg;
                this.modalButtons = [
                    { label: 'OK', id: 'ok_btn', action: 'closeModal' }
                ];
            },

            showError: function(err) {
                var msg = 'An error occurred.';
                if (typeof err === 'string') msg = err;
                else if (err.output) msg = err.output;
                else if (err.responseText) msg = err.responseText;
                this.showAlert(msg);
            },

            closeModal: function() {
                this.modalMessage = '';
                this.modalButtons = [];
            },

            handleModalAction: function(actionName) {
                if (typeof this[actionName] === 'function') {
                    this[actionName]();
                }
            },

            confirmUpdate: function() {
                this.modalMessage = 'Update PPPwn OpenWrt?';
                this.modalButtons = [
                    { label: 'Yes, install update', id: 'update_btn', action: 'executeUpdate' },
                    { label: 'Cancel', id: 'cancel_btn', action: 'closeModal' }
                ];
            },

            executeUpdate: function() {
                var self = this;
                this.closeModal();
                this.loading = true;
                
                this.requestCgi({ task: 'update' })
                    .then(function() {
                        // Reset cookies
                        document.cookie = 'token=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                        window.location.assign("/pppwn.html");
                    })
                    .catch(function(err) {
                        self.loading = false;
                        self.showError(err);
                    });
            }
        };
    });
}