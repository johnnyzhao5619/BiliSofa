# ADR-015：现代cURL的Tizen关闭路径兼容

日期：2026-10-16。W01/W02/F01/F13。独立网络005/006候选，设备修正效果待验证；主投屏探针0.0.54不替换。

现代库在独立001完成真实版本/随机数、公开HTTPS正例和三类证书负例，但002合成HTTP会话停在ready、清理未知。003只确认runtime_abort。004保留同工件数值栈，报告`session.native_stack_v1_4209_c8910_4430_d44a1`和`session.native_issue_syscall_fcntl`，精确WASM SHA256为`1ba3b14648cc20e7bde2a8713a500eef0a3a9d62310d3bbf6009a74cfbf97661`。独立符号表确认4209=`_fcntl`、4430=`_curlx_nonblock`；不能用别的WASM函数号代换，也不输出原始栈。

固定cURL8.23.0默认使用SOCK_NONBLOCK创建socket，但`cf_socket_shutdown`的可选残余数据drain会再次调用`curlx_nonblock`。本配置该函数用fcntl F_GETFL/F_SETFL；Samsung SDK的F_GETFL读取模拟stream.flags，socket stream并未反映原生非阻塞创建位，而F_SETFL对socket直接abort。close路径因此仍可能触发此前创建路径已避免的操作。源码路径与真实栈共同支持该兼容缺口；具体关闭drain的修正需HTTP线缆与TLS正负例A/B确认，不把静态发现当已通过。

候选以明确的`BILISOFA_TIZEN_NO_CLOSE_DRAIN`宏，仅省略`cf_socket_shutdown`中的最佳努力残余读取；正常filter destructor仍关闭socket。没有伪造fcntl/ioctl成功、修改SDK或关闭TLS/CA/hostname/entropy/redirect验证；cURL原功能的其他平台分支不变。取舍是本候选不在TCP关闭前额外读残余字节，可能影响特定服务的RST行为，须用真实HTTP、媒体和长播回归评估。正常业务正文仍必须完整/有界读取，省略drain不能掩盖截断。

补丁存于`platform/wasm-network/dependencies/patches/`。lock同时固定官方未修改archive、patch、目标输入/输出SHA256；build每次从原archive解压，patch必须无fuzz并核对结果摘要。原cURL版权和许可证保持，补丁/说明为BiliSofa原始工作；修改后的版本不冒称上游原版二进制。旧静态库/链接产物与所有失败签名包在本地history/私密源归档保留。

退出条件：相同零售电视上现代HTTP九轮Set-Cookie、两个jar实际回传/隔离/清空、redirect拒绝和原生关闭通过；固定TLS正例与三类负例/随机数继续通过。其后仍需取消、现代媒体/官方投屏、HTTPS会话、保护存储及生产凭据策略验证；不以两项实验代替完整W01或真实账号批准。

源依据：固定官方下载archive及本地`curl-8.23.0/lib/cf-socket.c`、`lib/curlx/nonblock.c`；Samsung1.39.4.7的`library_tizen_sockfs.js`/`library_syscall.js`只读核查，未编辑vendor文件。官方Socket Extension来源仍见项目研究登记S06等；具体兼容结论来自本机工件与源码核对。


005本电视九轮HTTP会话/原生关闭已取得PASS，外层采集错误与按实际签名source恢复的设备证据分开记录，未放宽build合同。固定OpenSSL库未变、cURL宏仅省略关闭drain的对照支持本缺口修正；006 TLS正负例回归尚待，不先升级为网络栈完整批准。


006已在本电视完成修正后TLS正例/三负例/随机数及原生关闭PASS；结合005九轮实际HTTP与关闭PASS，实验退出的这两个分项通过。范围仍是独立匿名探针，不替代现代媒体/真实HTTPS会话/凭据或完整W01。002–004失败原件及005采集顺序错误分别保留，见TEST_REPORT。
