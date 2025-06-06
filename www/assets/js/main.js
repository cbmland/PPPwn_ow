var Pwg = Backbone.Model.extend({
    urlRoot: '/cgi-bin/pw.cgi',
    defaults: {
        chipname: '',
        update: false,
        pppoe: false,
        pppwn: true,
        compiled: [],
        pppwned: false,
        running: false,
        path: '',
        interfaces: [],
        timeout: 0,
        version: '',
        versions: [],
        stage1: {},
        stage2: {},
        theme: 'default',
        adapter: '',
        autorun: 'no',
        retry: 'no',
        sleep: 'no'
    }
});

var pwg = new Pwg();
var appView = Backbone.View.extend({
    templates: {
        web: _.template($('#webTpl').html()),
        msg: _.template($('#msgTpl').html()),
        log: _.template($('#logTpl').html()),
        pyd: _.template($('#payloadTpl').html())
    },
    events: {
        'click button#action_pw': function(event){

            var self = this;
            var button = $(event.target);
            var task = button.prop('task');
            
            if(task == 'start'){

                if(!this.inputPath.val() || !this.inputAdapter.val() || !this.inputVersion.val()){
                    $.modal(function (modal) {
                        modal.content(self.templates.msg({message: 'Interface and firmware are required to execute.', buttons:[]}));
                    });
                    return;
                }
                
                button.prop('task', 'stop').removeClass('active').text('Stop');

                $.modal(function(modal){
                    modal.content($('<div class="preloader center"></div>'));
                });

            }else{
                $.modal(function(modal){
                    modal.content($('<div class="preloader center"></div>'));
                });
            }

            this.action(task);

        },
        'click button#save_pw': function(event){

            var self = this;

            if(!this.inputPath.val() || !this.inputTimeout.val() || !this.inputAdapter.val() || !this.inputVersion.val()){
                $.modal(function (modal) {
                    modal.content(self.templates.msg({message: 'Required options fields.', buttons:[]}));
                });
                return;
            }

            $.modal(function (modal) {
                modal.content($('<div class="preloader center"></div>'));
            });
            
            this.model.fetch({
                method: 'POST',
                data: {
                    task:'save',
                    token:this.webToken,
                    path:this.inputPath.val(),
                    stage1:this.stage1[this.inputVersion.val()],
                    stage2:this.stage2[this.inputVersion.val()],
                    timeout:this.inputTimeout.val(),
                    adapter:this.inputAdapter.val(),
                    version:this.inputVersion.val(),
                    auto:this.buttonAuto.val(),
                    retry: this.buttonRetry.val(),
                    sleep: this.buttonSleep.val()
                }
            }).then(function(response){

                if(response.output){
                    $.modal.content(self.templates.msg({message: response.output, buttons:[]}));
                }
                $.modal.close();

            }).catch(function(err){

                if(err.responseJSON){
                    $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
                }else{
                    $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
                }
                
            });

        },
        'click button#remove_rep': function(){

            var self = this;

            $.modal(function(modal){
                modal.content(self.templates.msg({message: 'Uninstall PPPwn OW?', buttons: [
                    {label:"Yes, uninstall", id: "remove_rep", onclick:"appweb.uninstall()"}
                ]}));
            });

        },
        'click button#pppoe_pw': function(){

            $.modal(function(modal){
                modal.content($('<div class="preloader center"></div>'));
            });

            var self = this;
            this.model.fetch({
                method: 'POST',
                data: {
                    task:'reconnect',
                    token:this.webToken
                }
            }).then(function(res){
                
                var status = self.model.get('pppoe');

                if(status){
                    self.inputConnect.text('PPPoe stop').val()
                }else{
                    self.inputConnect.text('PPPoe start').val(status)
                }

                $.modal.content(self.templates.msg({message: res.output, buttons:[]}));
                
            }).catch(function(err){
                if(err.responseJSON){
                    $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
                }else{
                    $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
                }
            });

        },
        'click button#updater_rep': function(event){

            var self = this;

            $.modal(function(modal){
                modal.content(self.templates.msg({message: 'Update PPPwn OpenWrt?', buttons: [
                    {label:"Yes, Install update", id: "update_rep", onclick:"appweb.update()"}
                ]}));
            });

        },
        'click button#install_pw': function(event){

            var self = this;

            if(!this.inputOption.val()) return;

            this.buttonInstall.attr('disabled');

            $.modal(function(modal){
                modal.content($('<div class="preloader center"></div>'));
            });

            this.model.fetch({
                method: 'POST',
                data: {
                    task:'setup',
                    token:this.webToken,
                    option:this.inputOption.val()
                }
            }).then(function(){
                self.state(function(){
                    $.modal.close();
                });
            }).catch(function(err){
                if(err.responseJSON){
                    $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
                }else{
                    $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
                }
                
            });

        },
        'click button.sent-payload': function(event){

            var selector = $(event.target);

            $.modal(function(modal){
                modal.content($('<div class="preloader center"></div>'));
            });
            
            var self = this;
            this.ajax({
                method: 'POST',
                url: 'http://127.0.0.1:9090/status',
            }).done(function(req){

                var res = JSON.parse(req.responseText);
                if(res.status == 'ready'){
                    
                    self.ajax({
                        method: 'GET',
                        url: selector.val(),
                        responseType: 'arraybuffer'
                    }).done(function(req){

                        if((req.status === 200 || req.status === 304) && req.response){

                            
                            self.ajax({
                                method: 'POST',
                                url: 'http://127.0.0.1:9090',
                                async: true,
                                data: req.response
                            }).done(function(event){

                                if(req.status === 200){
                                    $.modal.content(self.templates.msg({message: 'Payload loaded', buttons:[]}));
                                    $.modal.close();
                                }else{
                                    $.modal.content(self.templates.msg({message: 'Cannot send payload', buttons:[]}));
                                    $.modal.close();
                                    return;
                                }

                            }).fail(function(){
                                $.modal.content(self.templates.msg({message: 'Cannot Load Payload Because The BinLoader Server Is Busy', buttons:[]}));
                            });

                        }

                    });
                }

            }).fail(function(err){
                $.modal.content(self.templates.msg({message: 'Cannot Load Payload Because The BinLoader Server Is Not Running', buttons:[]}));
            });

        }
    },
    action: function(task = ''){

        var self = this;
        var button = this.buttonAction;

        if(task == 'start' || task == 'stop'){

            this.model.fetch({
                method: 'POST',
                data: {
                    task:task,
                    token:this.webToken,
                    path:this.inputPath.val(),
                    adapter:this.inputAdapter.val(),
                    version:this.inputVersion.val(),
                    stage1:this.stage1[this.inputVersion.val()],
                    stage2:this.stage2[this.inputVersion.val()],
                    timeout:this.inputTimeout.val(),
                    auto:this.buttonAuto.val(),
                    retry: this.buttonRetry.val(),
                    sleep: this.buttonSleep.val()
                }
            }).then(function(){

                $.modal.close();
                if(task == 'stop'){
                    button.prop('task', 'start').removeClass('active').text('Start');
                }else
                if(task == 'start'){
                    button.prop('task', 'start').addClass('active').text('Stop');
                }

            }).catch(function(err, textStatus, errorThrown){
                if(err.responseText){
                    $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
                }else{
                    $.modal.close();
                }
            });

        }

    },
    ajax: function(options){
                    
        var req = new XMLHttpRequest();
        
        if(typeof options.async == 'boolean'){
            req.open(options.method, options.url, options.async);
        }else{
            req.open(options.method, options.url);
        }

        if(options.responseType){
            req.responseType = options.responseType;
        }

        req.onload = function() {
            if (req.status >= 200 && req.status < 300) {
                if (typeof options.success === 'function') {
                    options.success(req);
                }
            } else {
                if (typeof options.error === 'function') {
                    options.error(req.statusText);
                }
            }
        };
        
        req.onerror = function() {
            if (typeof options.error === 'function') {
                options.error(req.statusText);
            }
        };

        req.send(options.data ? options.data : null);
        
        return {
            done: function(callback){
                options.success = callback;
                return this;
            },
            fail: function(callback){
                options.error = callback;
                return this;
            }
        };
    },
    cookie: function(name, value = null){

        if(value){
            document.cookie = `${name}=${value}; path=/`;
        }else{
            var cookies = document.cookie.split('; ');
            var info = {};
            for (var index in cookies) {
                var parts = cookies[index].split('=');
                info[parts[0]] = parts[1];
            }
            return info[name];
        }

    },
    update: function(){

        var self = this;
        $.modal.content($('<div class="preloader center"></div>'));

        this.model.fetch({
            method: 'POST',
            data: {
                task:'update',
                token:this.webToken
            }
        }).then(function(response){
            location.assign("/pppwn.html")
            document.cookie = 'token=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }).catch(function(err){
            $.modal.content(self.templates.msg({message: err.statusText, buttons:[]}));
        });

    },
    uninstall: function(){

        var self = this;
        $.modal.content($('<div class="preloader center"></div>'));

        this.model.fetch({
            method: 'POST',
            data: {
                task:'remove',
                token:this.webToken
            }
        }).then(function(res){
            location.assign("/");
        }).catch(function(err){
            if(err.responseJSON){
                $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
            }else{
                $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
            }
            
        });

    },
    state: function(callback){

        $.modal(function(modal){
            modal.content($('<div class="preloader center"></div>'));
        });

        var self = this, res = pwg.fetch({
            method: 'POST',
            data: {
                task:'state',
                token:this.webToken
            },
            error: function(err){
                return  err.responseJSON ? err.responseJSON.message : 'Unknow issue';
            }
        });

        if(typeof callback == 'function'){
            res.then(callback);
        }

        res.catch(function(err) {
            if(err.responseJSON){
                $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
            }else{
                $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
            }
                
        });
        

    },
    render: function(response){

        var self = this, interfaces = [], data = response.toJSON();

        if (this.model.get('stored_token')) {
            document.cookie = 'token=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            this.cookie('token', this.model.get('stored_token'));
        }

        $.each(response.get('interfaces'), function(index, item){
            if(item.adapter != "[+] PPPwn++ - PlayStation 4 PPPoE RCE by theflow" && item.adapter != "[+] interfaces:"){
                interfaces.push(item);
            }
        });

        data.interfaces = interfaces;

        this.$el.html(this.templates.web(data));
        $.modal.close();

        this.webToken = this.cookie('token');
        this.stage1 = data.stage1;
        this.stage2 = data.stage2;
        this.textareaOut = this.$('#task-log .output');
        this.buttonAction = this.$('button#action_pw');
        this.buttonAuto = this.$('button#switch_pw');
        this.buttonRetry = this.$('button#retry_pw');
        this.buttonSleep = this.$('button#sleep_pw');
        this.buttonUpdate = this.$('button#update_rep');
        this.buttonInstall = this.$('button#install_pw');
        this.inputPath = this.$('[name=path]');
        this.inputTimeout = this.$('[name=timeout]');
        this.inputAdapter = this.$('[name=adapter]');
        this.inputVersion = this.$('[name=version]');
        this.inputOption = this.$('[name=option]');
        this.inputConnect = this.$('[id=pppoe_pw]');

        $('select#select-ifc').find('option').each(function(index, item){
            if(data.adapter == $(item).val()){
                $(item).addClass('op-selected');
            }else{
                $(item).removeClass('op-selected');
            }
        });

        $('select#select-fw').find('option').each(function(index, item){
            if(data.version == $(item).val()){
                $(item).addClass('op-selected')
            }else{
                $(item).removeClass('op-selected');
            }
        });

        if(this.model.get('running')){
            this.buttonAction.prop('task', 'stop').text('Stop');
        }else{
            this.buttonAction.prop('task', 'start').text('Start');
        }

        this.buttonAuto.val(this.model.get('autorun'));
        this.buttonRetry.val(this.model.get('retry'));
        this.buttonSleep.val(this.model.get('sleep'));

        $('button.input-switch').each(function(index, iterator){
            var on = {
                color: {backgroundColor: '#FFFFFF'},
                align: {marginLeft: 35}
            },
            off = {
                color: {backgroundColor: '#606060'},
                align: {marginLeft: 5}
            }
            var circle = $(iterator).find('.push-circle');
            if($(iterator).val() == 'yes'){
                circle.css(on.color).css(on.align);
        }else{
                circle.css(off.color).css(off.align);
            }
            $(iterator).click(function(){
                var valueTag = $(iterator).val();
                if(valueTag == 'yes'){
                    circle.css(off.color).stop().animate(off.align, 120, function(){
                        $(iterator).val('no');
                    });
                }else
                if(valueTag == 'no'){
                    circle.css(on.color).stop().animate(on.align, 120, function(){
                        $(iterator).val('yes');
                    });
                }
            });
        });

        $('a#credits').click(function(){
            $.modal(function(modal){
                modal.content(self.templates.msg({message: 'TheOfficialFloW / SiSTR0 / xfangfang', buttons:[]}));
            });
        });
        
        return this;
    },
    index: function(){

        this.loading = this.$('#loading_ide');
        this.state();
        this.listenTo(this.model, 'change', this.render);

    },
    logs: function(){

        var self = this;

        $.modal(function(modal){
            modal.content($('<div class="preloader center"></div>'));
        });
        $.modal.close();
        this.model.fetch({
            method: 'POST',
            data: {
                task:'logs',
                token:this.webToken
            },
            dataType: 'text',  // 指定响应数据类型为文本
        }).then(function(response){
            $.modal.close();
            var cleanText = response;
            self.$el.html(self.templates.log({"logText":cleanText}));
            
            // 添加自动滚动到底部的功能
            var logContainer = $('.logText');
            logContainer.scrollTop(logContainer[0].scrollHeight);
        }).catch(function(err){
            console.log(err)
            if(err.responseJSON){
                $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
            }else{
                $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
            }
        });

    },
    payloads: function(){

        var self = this;

        $.modal(function(modal){
            modal.content($('<div class="preloader center"></div>'));
        });
        $.modal.close();
        this.model.fetch({
            method: 'POST',
            data: {
                task:'payloads',
                token:this.webToken
            }
        }).then(function(response){
            self.$el.html(self.templates.pyd(response));
            $.modal.close();
        }).catch(function(err){
            if(err.responseJSON){
                $.modal.content(self.templates.msg({message: err.responseJSON.output, buttons:[]}));
            }else{
                $.modal.content(self.templates.msg({message: err.responseText, buttons:[]}));
            }
        });

    }
});

var appweb = new appView({
    model: pwg,
    el: '#appWeb'
});

var SectionRouter = Backbone.Router.extend({
    routes: {
        '': function(){
            appweb.index();
        },
        'payloads': function(){
            appweb.payloads();
        },
        'logs': function(){
            appweb.logs();
        }
    }
});

var sectionRouter = new SectionRouter();
Backbone.history.start();

$(document).on('click', '#refresh_log', function() {
    appweb.logs();
});