/**!
 * 上传webpack编译后的文件到阿里云OSS
 *
 * @author mfylee@163.com
 * @since 2017-08-23
 */

var fs = require('fs');
var path = require('path');
var url = require('url');

var OSS = require('ali-oss');
var co = require('co');

var u = require('underscore');
var async = require('async');

var ConfigFileLoader = require('config-file-loader');
/**
 * 读取全局配置
 * ~/.aliyun
 * ~/.aliyunrc
 */
var aliyunConfig = new ConfigFileLoader.Loader().get('aliyun');

// 默认配置参数
var DEFAULT_OPTIONS = {
    ak: '',
    sk: '',
    bucket: '',
    region: '',
    prefix: '',
    filter: function (file) {
        return true;
    }
};
/**
 * @constructor
 */
function WebpackAliyunOssPlugin(options) {
    this.options = u.extend({}, DEFAULT_OPTIONS, options);

    this.client = new OSS({
        region: this.options.region,
        accessKeyId: this.options.ak || aliyunConfig.ak,
        accessKeySecret: this.options.sk || aliyunConfig.sk
    });

    this.client.useBucket(this.options.bucket);
}

WebpackAliyunOssPlugin.prototype.apply = function (compiler) {
    var me = this;
    compiler.plugin('emit' ,function (compilation, callback) {
        var publicPath = url.parse(compiler.options.output.publicPath);
        if (!publicPath.protocol || !publicPath.hostname) {
            return callback(new Error('Webpack配置文件中: "output.publicPath"必须设置为域名，例如： https://domain.com/path/'));
        }

        var files = u.filter(u.keys(compilation.assets), me.options.filter);

        async.every(files, function (file, done) {
            var target = url.resolve(url.format(publicPath), file);
            var key = url.parse(target).pathname;
            var source = compilation.assets[file].source();
            var body = Buffer.isBuffer(source) ? source : new Buffer(source, 'utf8');
            co(function *() {
                yield me.client.put(key, body);
                console.log('[' + file + '] SUCCESS：', key);
                done();
            }).catch(callback);
        }, function () {
            console.log('[WebpackAliyunOssPlugin]', 'All Completed');
            callback();
        });
    });
};

module.exports = WebpackAliyunOssPlugin;

