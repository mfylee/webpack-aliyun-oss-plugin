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
 * @link https://github.com/reyesr/config-file-loader
 */
var aliyunConfig = new ConfigFileLoader.Loader().get('aliyun');

// 默认配置参数
var DEFAULT_OPTIONS = {
    ak: '',
    sk: '',
    bucket: '',
    region: '',
    // 多账号支持
    account: null,
    filter: function (file) {
        return true;
    }
};
/**
 * @constructor
 */
function WebpackAliyunOssPlugin(options) {
    this.options = u.extend({}, DEFAULT_OPTIONS, options);

    var conf = options.account ? aliyunConfig[options.account] : aliyunConfig;

    this.client = new OSS({
        region: this.options.region || conf.region,
        accessKeyId: this.options.ak || conf.ak,
        accessKeySecret: this.options.sk || conf.sk
    });

    this.client.useBucket(this.options.bucket);
}

WebpackAliyunOssPlugin.prototype.apply = function (compiler) {
    var me = this;
    compiler.hooks.emit.tapAsync('WebpackAliyunOssPlugin', function (compilation, callback) {
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
                done(null, true);
            }).catch(callback);
        }, function (err, result) {
            if (result) {
                console.log('[WebpackAliyunOssPlugin]', 'All Completed');
            }
            callback();
        });
    });
};

module.exports = WebpackAliyunOssPlugin;

