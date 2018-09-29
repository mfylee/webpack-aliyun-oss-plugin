/**!
 * 上传webpack编译后的文件到阿里云OSS
 *
 * @author mfylee@163.com
 * @since 2017-08-23
 */

var fs = require('fs');
var path = require('path');
var url = require('url');

var OSS = require('ali-oss').Wrapper;

var u = require('underscore');

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
    retry: 3,
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

        if (files.length === 0) {
            return callback();
        }

        function upload(file, times) {
            var target = url.resolve(url.format(publicPath), file);
            var key = url.parse(target).pathname;
            var source = compilation.assets[file].source();
            var body = Buffer.isBuffer(source) ? source : new Buffer(source, 'utf8');
            return me.client.put(key, body, {
                timeout: 30 * 1000
            }).then(function () {
                console.log('[WebpackAliyunOssPlugin SUCCESS]：', key);
                var next = files.shift();
                if (next) {
                    return upload(next, me.options.retry);
                }
            }, function (e) {
                if (times === 0) {
                    throw new Error('[WebpackAliyunOssPlugin ERROR]: ', e);
                }
                else {
                    console.log('[WebpackAliyunOssPlugin retry]：', times, key);
                    return upload(file, --times);
                }
            });
        }
        upload(files.shift(), me.options.retry).then(function () {
            console.log('[WebpackAliyunOssPlugin FINISHED]', 'All Completed');
            callback();
        }).catch(function (e) {
            console.log('[WebpackAliyunOssPlugin FAILED]', e);
            return callback(e);
        });
    });
};

module.exports = WebpackAliyunOssPlugin;

