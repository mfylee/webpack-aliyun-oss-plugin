# webpack-aliyun-oss-plugin
>上传 webpack 编译后的文件到阿里云 OSS

## 使用说明
- 第一步：安装依赖
```
npm install webpack-aliyun-oss-plugin --save-dev
```
- 第二步：配置 webpack.config.js
```
const WebpackAliyunOssPlugin = require('webpack-aliyun-oss-plugin');

module.exports = {
    output: {
        // 必须是标准的域名+路径，已`/`结尾
        publicPath: 'http://domain.com/path/to/deply/'
    },
    plugins: [
        // 建议只在生产环境配置代码上传
        new WebpackAliyunOssPlugin({
            bucket: 'BucketName',
            account: 'account1',
            region: 'oss-cn-hangzhou', // bucket所在区域的接入点
            filter: function (asset) {
                return !/\.html$/.test(asset);
            }
        })
    ]
};
```

## 配置参数
- ak(String)
    阿里云授权 accessKeyId，必填项，可以由配置文件方式设置
- sk(String)
    阿里云授权 accessKeySecret，必填项，可以由配置文件方式设置
- bucket(String)
    需要上传到的 bucket 的名称
- region(String)
    bucket 所在的区域，如果是在阿里云机器上，可以使用内部 region，节省流量
- filter(Function(filepath))
    文件过滤器，通过该方法可自由决定哪些文件需要上传
- account(String)
    多账号支持，可以在 `.aliyun` 配置文件中配置多个子账号


## accessKeyId & accessKeySecret 保密
如果将 `accessKeyId` 和 `accessKeySecret` 直接写到代码中势必造成了安全隐患，为了安全起见，可以将敏感信息保存到编译机的配置文件中

#### 配置方法
在编译机的 `$HOME`，也就是用户的根目录下创建 `.aliyun` 文件，并设置 `600` 权限
```
$ cd ~
$ echo "ak:xxxx\nsk:xxx" > .aliyun
$ chmod 600 .aliyun
```
其中 `ak` 为 accessKeyId，`sk` 为 accessKeySecret

#### 多账号支持
```
$ cd ~
$ echo "account1:\nak:xxxx\nsk:xxx\naccount2:\nak:yyy\nsk:yyyy" > .aliyun
$ chmod 600 .aliyun
```
